import { NotebookPanel } from '@jupyterlab/notebook';
import { KernelMessage } from '@jupyterlab/services';
import { Kernel } from '@jupyterlab/services';
import {
  generateExperimentIdAndStartTime,
  createExperimentIdFolderSh,
  getAndSetWorkflowId,
  getWorkflowList,
  getEndTime,
  getExperimentList,
  saveStartEndTime,
  cleanExperimentMetadata,
  saveSessionMetrics
} from './apiScripts';

export async function handleFirstCellExecution(panel: NotebookPanel) {
  await handleNotebookSessionContents(panel, generateExperimentIdAndStartTime);
  await handleNotebookSessionContents(panel, getAndSetWorkflowId);
  await handleNotebookSessionContents(panel, createExperimentIdFolderSh);
}

export async function handleLastCellExecution(panel: NotebookPanel) {
  try {
    await handleNotebookSessionContents(panel, getEndTime);
    await handleNotebookSessionContents(panel, saveSessionMetrics);
    await handleNotebookSessionContents(panel, saveStartEndTime);
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
  const experimentList = await handleNotebookSessionContents(
    panel,
    getWorkflowList
  );
  return experimentList ? experimentList.split(' ') : [''];
}

export async function handleLoadExperimentList(
  worfklowId: string,
  panel: NotebookPanel
): Promise<string[]> {
  const experimentList = await handleNotebookSessionContents(
    panel,
    getExperimentList(worfklowId)
  );
  return experimentList
    ? experimentList.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/g) || []
    : [''];
}
