import { ServerConnection } from '@jupyterlab/services';

export interface ICimStandard {
  key: string;
  label: string;
  profile: string;
  version: string;
  description: string;
  compliance: string;
}

export interface ICimMetadataProfile {
  key: string;
  label: string;
  description: string;
  experiment_term: string;
  metric_term: string;
  metric_summary_name: string;
  include_metric_extrema: boolean;
}

export interface ICimConnection {
  connected: boolean;
  endpoint: string;
  service: string;
  mode: 'demo';
  authenticated: boolean;
  identity: string;
  identity_note: string;
  standards: ICimStandard[];
  default_standard: string;
  metadata_profiles: ICimMetadataProfile[];
  default_metadata_profile: string;
}

export interface IReproducibilityState {
  standard_key: string | null;
  standard: ICimStandard | null;
  metadata_profile_key: string;
  metadata_profile: ICimMetadataProfile | null;
  mapping: { experiment_term: string; metric_term: string };
  configuration_revision: string | null;
  configured: boolean;
  crate_current: boolean;
  cim_connection: {
    connected: boolean;
    endpoint: string;
    identity: string;
    mode: 'demo';
  } | null;
  crate: {
    name: string;
    path: string;
    generated_at: string;
    configuration_revision: string;
    metadata_profile_key: string;
    generation: number;
  } | null;
  fdmi_target: {
    mode: string;
    endpoint: string;
    kubernetes_service: string;
    external_integration: false;
  };
  publication: {
    status: 'accepted';
    receipt: string;
    message?: string;
    submitted_at: string;
    endpoint: string;
    stale: boolean;
  } | null;
  preview: {
    experiment_id: string;
    workflow_id: string;
    run_status: string;
    run_type: string;
    metadata_profile: string | null;
    metrics: { source: string; unit: string; mapped_type: string }[];
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const settings = ServerConnection.makeSettings();
  const url = new URL(
    `${settings.baseUrl.replace(/\/?$/, '/')}api/jupyter-vre-workflow/${path}`,
    window.location.origin
  ).toString();
  const response = await ServerConnection.makeRequest(
    url,
    init ?? {},
    settings
  );
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = body.message ?? detail;
    } catch {
      // Keep the HTTP status text when the server did not return JSON.
    }
    throw new Error(detail || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function connectCim(
  experimentPath?: string | null
): Promise<ICimConnection> {
  return request<ICimConnection>('reproducibility/cim/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: experimentPath ?? undefined })
  });
}

export function generateRoCrate(
  experimentPath: string
): Promise<IReproducibilityState> {
  return request<IReproducibilityState>('reproducibility/crate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: experimentPath })
  });
}

export function artifactUrl(path: string): string {
  const settings = ServerConnection.makeSettings();
  const encoded = path
    .split('/')
    .map(part => encodeURIComponent(part))
    .join('/');
  return new URL(
    `${settings.baseUrl.replace(/\/?$/, '/')}files/${encoded}`,
    window.location.origin
  ).toString();
}

export function publishToFdmi(
  experimentPath: string
): Promise<IReproducibilityState> {
  return request<IReproducibilityState>('reproducibility/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: experimentPath })
  });
}

export function getReproducibilityState(
  experimentPath: string
): Promise<IReproducibilityState> {
  return request<IReproducibilityState>(
    `reproducibility/config?path=${encodeURIComponent(experimentPath)}`
  );
}

export function configureReproducibility(
  experimentPath: string,
  standardKey: string,
  mapping: Partial<IReproducibilityState['mapping']> = {},
  metadataProfileKey?: string
): Promise<IReproducibilityState> {
  return request<IReproducibilityState>('reproducibility/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: experimentPath,
      standard_key: standardKey,
      metadata_profile_key: metadataProfileKey,
      mapping
    })
  });
}
