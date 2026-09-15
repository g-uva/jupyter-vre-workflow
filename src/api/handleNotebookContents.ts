import { NotebookPanel } from '@jupyterlab/notebook';
import {
  listDirectoryNames,
  readJsonFile,
  readTextFile,
  resolveNotebookPath
} from './jupyterContents';

export async function getSavedUsername(panel: NotebookPanel): Promise<string> {
  return (
    (await readTextFile(panel, resolveNotebookPath(panel, '.lib/hostname'))) ??
    ''
  );
}

export async function handleLoadWorkflowList(
  panel: NotebookPanel
): Promise<string[]> {
  return (
    await listDirectoryNames(panel, resolveNotebookPath(panel, 'experiments'))
  ).sort();
}

export async function handleLoadExperimentList(
  workflowId: string,
  panel: NotebookPanel
): Promise<string[]> {
  return (
    await listDirectoryNames(
      panel,
      resolveNotebookPath(panel, `experiments/${workflowId}`)
    )
  )
    .sort()
    .reverse();
}

export function experimentPath(
  panel: NotebookPanel,
  workflowId: string,
  experimentId: string
): string {
  return resolveNotebookPath(
    panel,
    `experiments/${workflowId}/${experimentId}`
  );
}

export async function getHandleSessionMetrics(
  workflowId: string,
  experimentId: string,
  panel: NotebookPanel
) {
  return readTextFile(
    panel,
    `${experimentPath(panel, workflowId, experimentId)}/metrics.csv`
  );
}

export async function handleGetTime(
  workflowId: string,
  experimentId: string,
  panel: NotebookPanel
) {
  const record = await readJsonFile<{
    start_time: string;
    end_time: string | null;
  }>(panel, `${experimentPath(panel, workflowId, experimentId)}/run.json`);
  if (!record) {
    return null;
  }
  return {
    startTimeUnix: Date.parse(record.start_time) / 1000,
    endTimeUnix: record.end_time
      ? Date.parse(record.end_time) / 1000
      : Date.now() / 1000,
    start_time: record.start_time
  };
}
