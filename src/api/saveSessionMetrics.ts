import { NotebookPanel } from '@jupyterlab/notebook';
import { resolveNotebookPath, saveTextFile } from './jupyterContents';

interface IPrometheusRangeResponse {
  data?: {
    result?: Array<{
      values?: Array<[number, string]>;
    }>;
  };
}

async function getScaphMetrics(prometheusUrl: string): Promise<string[]> {
  const resp = await fetch(`${prometheusUrl}/api/v1/label/__name__/values`);
  const data = await resp.json();
  return data.data.filter((name: string) => name.startsWith('scaph_'));
}

async function getMetricValues(
  prometheusUrl: string,
  metricName: string,
  start: number,
  end: number
): Promise<Array<[number, string]>> {
  const url = new URL(`${prometheusUrl}/api/v1/query_range`);
  url.searchParams.set('query', metricName);
  url.searchParams.set('start', start.toString());
  url.searchParams.set('end', end.toString());
  url.searchParams.set('step', '15');

  const resp = await fetch(url.toString());
  const data = (await resp.json()) as IPrometheusRangeResponse;
  return data.data?.result?.[0]?.values ?? [];
}

function csvEscape(value: string): string {
  if (!/[",\n]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}

export async function saveSessionMetricsFile(
  panel: NotebookPanel,
  username: string,
  workflowId: string,
  experimentId: string,
  startTimeUnix: number,
  endTimeUnix: number
): Promise<string> {
  const prometheusUrl = `https://mc-a4.lab.uvalight.net/prometheus-${username}`;
  const metricNames = await getScaphMetrics(prometheusUrl);
  const rows = new Map<number, Record<string, string>>();

  for (const metricName of metricNames) {
    const values = await getMetricValues(
      prometheusUrl,
      metricName,
      startTimeUnix,
      endTimeUnix
    );

    for (const [timestamp, value] of values) {
      const row = rows.get(timestamp) ?? {};
      row[metricName] = value;
      rows.set(timestamp, row);
    }
  }

  const header = ['', ...metricNames].join(',');
  const lines = Array.from(rows.entries())
    .sort(([left], [right]) => left - right)
    .map(([timestamp, values]) =>
      [
        timestamp.toString(),
        ...metricNames.map(metricName => csvEscape(values[metricName] ?? ''))
      ].join(',')
    );

  const csv = [header, ...lines].join('\n');
  await saveTextFile(
    panel,
    resolveNotebookPath(
      panel,
      `.lib/experiments/${workflowId}/${experimentId}/metrics.csv`
    ),
    csv
  );

  return csv;
}
