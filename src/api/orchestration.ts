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
    mode: 'mock';
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
