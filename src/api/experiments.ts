import { NotebookPanel } from '@jupyterlab/notebook';
import { ServerConnection } from '@jupyterlab/services';

export interface ITelemetrySample {
  timestamp: number;
  timestamp_utc: string;
  energy_j: number;
  current_power_w: number | null;
  average_power_w: number | null;
  sampled_duration_s: number;
}

export interface IExperiment {
  id: string;
  workflow_id: string;
  path: string;
  notebook_path: string;
  status: 'running' | 'succeeded' | 'failed' | 'cancelled' | 'interrupted';
  start_time: string;
  end_time: string | null;
  error: string | null;
  completed_code_cells: number;
  total_code_cells: number;
  telemetry: {
    status: 'waiting' | 'available' | 'unavailable';
    scope: string | null;
    error: string | null;
    sample_count: number;
    summary: ITelemetrySample | null;
  };
  samples?: ITelemetrySample[];
}

async function request(
  method: string,
  path?: string,
  body?: unknown
): Promise<IExperiment> {
  const settings = ServerConnection.makeSettings();
  const url = `${settings.baseUrl.replace(/\/?$/, '/')}api/ecojupyter/experiments${
    path ? `?path=${encodeURIComponent(path)}` : ''
  }`;
  const response = await ServerConnection.makeRequest(
    url,
    {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    },
    settings
  );
  if (!response.ok) {
    throw new Error(
      `Experiment request failed (${response.status}): ${await response.text()}`
    );
  }
  return response.json();
}

export async function startNotebookExperiment(
  panel: NotebookPanel
): Promise<IExperiment> {
  await panel.context.ready;
  await panel.context.save();
  const notebook = panel.content.model?.toJSON();
  if (!notebook) {
    throw new Error('No notebook is open');
  }
  const result = await request('POST', undefined, {
    notebook_path: panel.context.path,
    notebook
  });
  window.dispatchEvent(
    new CustomEvent('ecojupyter:experiment-started', { detail: result })
  );
  return result;
}

export const getExperiment = (path: string) => request('GET', path);
export const cancelExperiment = (path: string) => request('DELETE', path);
