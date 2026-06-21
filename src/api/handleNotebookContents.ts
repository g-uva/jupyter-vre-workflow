import { NotebookPanel } from '@jupyterlab/notebook';
import { KernelMessage } from '@jupyterlab/services';
import { Kernel } from '@jupyterlab/services';
import {
  generateExperimentIdAndStartTime,
  getEndTime,
  cleanExperimentMetadata,
  getExperimentEnvironment,
  getUsername
} from './apiScripts';
import dayjs from 'dayjs';
import { getOffsetHours } from '../helpers/utils';
import {
  listDirectoryNames,
  readJsonFile,
  readTextFile,
  resolveNotebookPath,
  saveJsonFile,
  saveTextFile
} from './jupyterContents';
import { saveSessionMetricsFile } from './saveSessionMetrics';

interface IExperimentEnvironment {
  workflow_id: string | null;
  experiment_id: string | null;
  start_time: string | null;
  end_time: string | null;
}

interface IExperimentStart {
  workflow_id: string;
  experiment_id: string;
  start_time: string;
}

export async function getAndSaveUsername(
  panel: NotebookPanel
): Promise<string> {
  const username =
    (await handleNotebookSessionContents(panel, getUsername)) ?? '';
  await saveTextFile(
    panel,
    resolveNotebookPath(panel, '.lib/hostname'),
    username
  );
  return username;
}

export async function getSavedUsername(panel: NotebookPanel): Promise<string> {
  return (
    (await readTextFile(panel, resolveNotebookPath(panel, '.lib/hostname'))) ??
    ''
  );
}

function getWorkflowId(panel: NotebookPanel): string {
  const notebookName = panel.context.path.split('/').pop() ?? 'workflow';
  return notebookName.replace(/\.[^.]+$/, '');
}

function getNotebookDirectory(panel: NotebookPanel): string {
  const parts = panel.context.path.split('/').filter(Boolean);
  parts.pop();
  return parts.join('/');
}

function parseKernelJson<T>(output: string | void): T {
  if (!output) {
    throw new Error('Kernel did not return the expected JSON payload.');
  }

  return JSON.parse(output) as T;
}

function toUnixTimestamp(value: string): number {
  return dayjs(value).unix() + 60 * 60 * getOffsetHours();
}

function currentUnixTimestamp(): number {
  return dayjs().unix() + 60 * 60 * getOffsetHours();
}

export async function handleFirstCellExecution(panel: NotebookPanel) {
  const workflowId = getWorkflowId(panel);
  const output = await handleNotebookSessionContents(
    panel,
    generateExperimentIdAndStartTime(workflowId, getNotebookDirectory(panel))
  );
  parseKernelJson<IExperimentStart>(output);
}

export async function handleLastCellExecution(
  panel: NotebookPanel,
  username: string
) {
  try {
    const endTime = await handleNotebookSessionContents(panel, getEndTime);
    const environment = await getCurrentExperimentEnvironment(panel);

    if (
      !environment.workflow_id ||
      !environment.experiment_id ||
      !environment.start_time
    ) {
      throw new Error('Missing experiment metadata in kernel environment.');
    }

    const startTimeUnix = toUnixTimestamp(environment.start_time);
    const endTimeUnix = toUnixTimestamp(environment.end_time ?? endTime ?? '');

    await saveSessionMetricsFile(
      panel,
      username,
      environment.workflow_id,
      environment.experiment_id,
      startTimeUnix,
      endTimeUnix
    );
    await saveJsonFile(
      panel,
      resolveNotebookPath(
        panel,
        `.lib/experiments/${environment.workflow_id}/${environment.experiment_id}/timestamps.json`
      ),
      {
        start_time: environment.start_time,
        end_time: environment.end_time ?? endTime
      }
    );
    await handleNotebookSessionContents(panel, cleanExperimentMetadata);
  } catch (err) {
    console.error(err, 'Error detected');
  }
}

/**
 * @param panel NotebookPanel to handle
 * This function handles the contents of a NotebookPanel, specifically saving the username to a file.
 * It waits for the session context to be ready, then checks if a kernel is available.
 * If a kernel is found, it executes a code snippet to save the username to a file named `.lib/hostname`.
 * If the execution is successful, it logs a success message.
 * This executes each time that a Notebook is opened or refreshed.
 */

export async function handleNotebookSessionContents(
  panel: NotebookPanel,
  code: string
): Promise<string | void> {
  await panel.sessionContext.ready;
  const kernel = panel.sessionContext.session?.kernel;
  if (kernel) {
    const future = kernel.requestExecute({ code });
    return await captureKernelOutput(future).then(output => {
      return output;
    });
  } else {
    console.warn('No active kernel found.');
  }
}

export function captureKernelOutput(
  future: Kernel.IFuture<
    KernelMessage.IExecuteRequestMsg,
    KernelMessage.IExecuteReplyMsg
  >
): Promise<string> {
  return new Promise(resolve => {
    let result = '';

    future.onIOPub = (msg: KernelMessage.IIOPubMessage) => {
      const msgType = msg.header.msg_type;

      if (msgType === 'stream') {
        const content = msg.content as KernelMessage.IStreamMsg['content'];
        result += content.text;
      } else if (msgType === 'execute_result') {
        const content =
          msg.content as KernelMessage.IExecuteResultMsg['content'];
        const data = content.data['text/plain'];
        result += data;
      } else if (msgType === 'error') {
        const content = msg.content as KernelMessage.IErrorMsg['content'];
        result += content.ename + ': ' + content.evalue;
      }
    };

    future.done.then(() => resolve(result.trim()));
  });
}

export async function handleLoadWorkflowList(
  panel: NotebookPanel
): Promise<string[]> {
  const workflowList = await listDirectoryNames(
    panel,
    resolveNotebookPath(panel, '.lib/experiments')
  );
  const environment = await getCurrentExperimentEnvironmentSafe(panel);
  return uniqueNonEmptyStrings([
    environment?.workflow_id,
    ...workflowList,
    getWorkflowId(panel)
  ]);
}

export async function handleLoadExperimentList(
  workflowId: string,
  panel: NotebookPanel
): Promise<string[]> {
  const experimentList = await listDirectoryNames(
    panel,
    resolveNotebookPath(panel, `.lib/experiments/${workflowId}`)
  );
  const environment = await getCurrentExperimentEnvironmentSafe(panel);
  return uniqueNonEmptyStrings([
    environment?.workflow_id === workflowId ? environment.experiment_id : null,
    ...experimentList
  ]);
}

export async function getHandleSessionMetrics(
  workflowId: string,
  experimentId: string,
  panel: NotebookPanel
) {
  return await readTextFile(
    panel,
    resolveNotebookPath(
      panel,
      `.lib/experiments/${workflowId}/${experimentId}/metrics.csv`
    )
  );
}

async function getCurrentExperimentEnvironment(
  panel: NotebookPanel
): Promise<IExperimentEnvironment> {
  const output = await handleNotebookSessionContents(
    panel,
    getExperimentEnvironment
  );
  return parseKernelJson<IExperimentEnvironment>(output);
}

async function getCurrentExperimentEnvironmentSafe(
  panel: NotebookPanel
): Promise<IExperimentEnvironment | null> {
  try {
    return await getCurrentExperimentEnvironment(panel);
  } catch (error) {
    return null;
  }
}

function uniqueNonEmptyStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value)))
  );
}

export async function handleGetTime(
  workflowId: string,
  experimentId: string,
  panel: NotebookPanel
) {
  const jsonTime = await readJsonFile<{
    start_time: string;
    end_time: string | null;
  }>(
    panel,
    resolveNotebookPath(
      panel,
      `.lib/experiments/${workflowId}/${experimentId}/timestamps.json`
    )
  );

  if (jsonTime) {
    const { start_time, end_time } = jsonTime;
    const startTimeUnix = toUnixTimestamp(start_time);
    const endTimeUnix =
      end_time !== null ? toUnixTimestamp(end_time) : currentUnixTimestamp();
    return { startTimeUnix, endTimeUnix, start_time };
  }

  const environment = await getCurrentExperimentEnvironment(panel);
  if (environment.start_time) {
    return {
      startTimeUnix: toUnixTimestamp(environment.start_time),
      endTimeUnix: environment.end_time
        ? toUnixTimestamp(environment.end_time)
        : currentUnixTimestamp(),
      start_time: environment.start_time
    };
  }

  return null;
}
