import { ServerConnection } from '@jupyterlab/services';

export interface ISite {
  id: string;
  name: string;
  country: string;
  flag: string;
  lat: number;
  lon: number;
  pue: number;
  carbon_intensity_g_kwh: number;
  performance_factor: number;
  available: boolean;
}

export interface IRegistrationState {
  user_key: string;
  registered: boolean;
  registration: null | {
    node_name: string;
    site: string;
    operator: string;
    contact: string;
    vo: 'GD-AS-DEMO';
    membership_id: string;
    registered_at: string;
    simulated: true;
  };
  default_node_name: string;
  vo: 'GD-AS-DEMO';
  sites: ISite[];
  selected_site_id: 'GRNET';
  demo_notice: string;
  federation: {
    mode: 'demo';
    configured_endpoint: string;
    kubernetes_service: string;
  };
}

export interface IExperimentMetadata {
  user_key: string;
  experiment_path: string;
  experiment: {
    id: string;
    workflow_id: string;
    status: string;
    runtime_s: number | null;
  };
  source: string;
  ro_crate_available: boolean;
  metrics_available: string[];
  measurements: { energy_j: number | null; average_power_w: number | null };
  minimum_ready: boolean;
  missing: string[];
  metadata_status: 'Local' | 'Local and online';
  online_definition: string;
  sync: null | {
    catalogue_id: string;
    synced_at: string;
    simulated: true;
  };
}

export interface IWorkloadEstimate {
  duration_s: number;
  it_power_w: number;
  it_energy_kwh: number;
  facility_energy_kwh: number;
  operational_emissions_gco2e: number;
}

export interface IPredictionState {
  status: 'idle' | 'queued' | 'running' | 'completed' | 'cancelled' | 'failed';
  queue: { site_id: string; status: string }[];
  results: {
    site: ISite;
    status: 'completed';
    simulated: true;
    inputs: Record<string, number>;
    assumptions: Record<string, string | number>;
    training: IWorkloadEstimate;
    inference: IWorkloadEstimate;
  }[];
  current_site: string | null;
  current_stage: string | null;
  progress: number;
  error: string | null;
  assumptions: Record<string, string | number>;
}

export interface IOrchestrationState {
  status: 'idle' | 'running' | 'completed' | 'failed';
  target_site_id: string | null;
  current_stage: string | null;
  progress: number;
  log: {
    stage: string;
    started_at: string;
    completed_at?: string;
    relative_duration_weight: number;
    planned_demo_delay_s: number;
    actual_elapsed_s?: number;
    simulated: true;
  }[];
  result: null | {
    site: ISite;
    training: IWorkloadEstimate;
    inference: IWorkloadEstimate;
    modelled_workload_duration_s: number;
    result_location: string;
  };
  comparison: null | {
    original: Record<string, unknown>;
    prediction: Record<string, unknown>;
    simulated_target_run: Record<string, unknown>;
    notice: string;
  };
  comparison_path?: string | null;
  log_path?: string | null;
  actual_demo_elapsed_s?: number;
  error: string | null;
  simulated: true;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const settings = ServerConnection.makeSettings();
  const url = new URL(
    `${settings.baseUrl.replace(/\/?$/, '/')}api/jupyter-vre-workflow/${path}`,
    window.location.origin
  ).toString();
  const response = await ServerConnection.makeRequest(url, init, settings);
  if (!response.ok) {
    let message = response.statusText;
    try {
      message = (await response.json()).message ?? message;
    } catch {
      // Retain the status text.
    }
    throw new Error(message || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function getRegistration(user: string): Promise<IRegistrationState> {
  return request(`orchestration/registration?user=${encodeURIComponent(user)}`);
}

export function registerNode(
  user: string,
  registration: {
    node_name: string;
    site: string;
    operator: string;
    contact: string;
  }
): Promise<IRegistrationState> {
  return request('orchestration/registration', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, registration })
  });
}

export function selectExperimentMetadata(
  user: string,
  path: string,
  action: 'select' | 'sync' = 'select'
): Promise<IExperimentMetadata> {
  return request('orchestration/metadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, path, action })
  });
}

export function getPredictions(
  user: string,
  path: string
): Promise<IPredictionState> {
  return request(
    `orchestration/predictions?user=${encodeURIComponent(user)}&path=${encodeURIComponent(path)}`
  );
}

export function startPredictions(
  user: string,
  path: string,
  siteIds: string[]
): Promise<IPredictionState> {
  return request('orchestration/predictions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, path, site_ids: siteIds })
  });
}

export function cancelPredictions(
  user: string,
  path: string
): Promise<IPredictionState> {
  return request('orchestration/predictions', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, path })
  });
}

export function getOrchestration(
  user: string,
  path: string
): Promise<IOrchestrationState> {
  return request(
    `orchestration/runs?user=${encodeURIComponent(user)}&path=${encodeURIComponent(path)}`
  );
}

export function startOrchestration(
  user: string,
  path: string,
  targetSiteId: string
): Promise<IOrchestrationState> {
  return request('orchestration/runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, path, target_site_id: targetSiteId })
  });
}

export function orchestrationArtifactUrl(path: string): string {
  const settings = ServerConnection.makeSettings();
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return new URL(
    `${settings.baseUrl.replace(/\/?$/, '/')}files/${encoded}`,
    window.location.origin
  ).toString();
}
