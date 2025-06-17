import { NotebookPanel } from '@jupyterlab/notebook';
import { KernelMessage } from '@jupyterlab/services';
import { Kernel } from '@jupyterlab/services';
import {
  generateExperimentId,
  createExperimentIdFolderSh,
  getAndSetWorkflowId,
  // cleanExperimentId,
  // getStartEndTime,
  getExperimentList
} from './apiScripts';

export async function handleFirstCellExecution(panel: NotebookPanel) {
  await handleNotebookSessionContents(panel, generateExperimentId);
  await handleNotebookSessionContents(panel, createExperimentIdFolderSh);
  await handleNotebookSessionContents(panel, getAndSetWorkflowId);
}

export async function handleLastCellExecution(_panel: NotebookPanel) {
  // await handleNotebookSessionContents(panel, cleanExperimentId);
  // await handleNotebookSessionContents(panel, getStartEndTime);
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

export async function handleLoadExperimentList(
  panel: NotebookPanel
): Promise<string[]> {
  const experimentList = await handleNotebookSessionContents(
    panel,
    getExperimentList
  );
  return experimentList ? experimentList.split(' ') : [''];
}
