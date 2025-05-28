import { RawMetrics } from '../helpers/types';

async function getMetricData(
  prometheusUrl: string,
  metricName: string,
  start: number,
  end: number,
  step: number
): Promise<any> {
  const url = new URL(`${prometheusUrl}/api/v1/query_range`);
  url.searchParams.set('query', metricName);
  url.searchParams.set('start', start.toString());
  url.searchParams.set('end', end.toString());
  url.searchParams.set('step', step.toString());

  const resp = await fetch(url.toString());
  return await resp.json();
}

async function getScaphMetrics(prometheusUrl: string): Promise<string[]> {
  const resp = await fetch(`${prometheusUrl}/api/v1/label/__name__/values`);
  const data = await resp.json();
  return data.data.filter((name: string) => name.startsWith('scaph_'));
}

interface IGetScaphData {
  url: string;
  startTime: number;
  endTime: number;
}

export default async function getScaphData({
  url,
  startTime,
  endTime
}: IGetScaphData) {
  try {
    const metricNames: string[] = [];
    await getScaphMetrics(url).then(response => metricNames.push(...response));

    const step = 15;

    const results: RawMetrics = new Map();

    for (const metricName of metricNames) {
      const metricData = await getMetricData(
        url,
        metricName,
        startTime,
        endTime,
        step
      );
      const data = metricData.data.result[0].values; // For some reason the response is within a [].
      results.set(metricName, data);
    }

    return results;
  } catch (error) {
    console.error('Error fetching Scaph metrics:', error);
    return new Map<string, [number, string][]>();
  }
}
