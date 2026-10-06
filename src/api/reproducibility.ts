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
