import { ServerConnection } from '@jupyterlab/services';

export interface ICimStandard {
  key: string;
  label: string;
  profile: string;
  version: string;
  description: string;
  compliance: string;
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
}

export interface IReproducibilityState {
  standard_key: string | null;
  standard: ICimStandard | null;
  mapping: { experiment_term: string; metric_term: string };
  configuration_revision: string | null;
  configured: boolean;
  crate_current: boolean;
  preview: {
    experiment_id: string;
    workflow_id: string;
    run_status: string;
    run_type: string;
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

export function connectCim(): Promise<ICimConnection> {
  return request<ICimConnection>('reproducibility/cim/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
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
  mapping: Partial<IReproducibilityState['mapping']> = {}
): Promise<IReproducibilityState> {
  return request<IReproducibilityState>('reproducibility/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: experimentPath,
      standard_key: standardKey,
      mapping
    })
  });
}
