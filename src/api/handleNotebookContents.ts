import { JupyterFrontEnd } from '@jupyterlab/application';
import { NotebookPanel } from '@jupyterlab/notebook';
import { KernelMessage } from '@jupyterlab/services';

export const saveUsernameSh = `
!mkdir -p .lib
!echo \${HOSTNAME#jupyter-} > .lib/hostname
!echo "✅ Username saved to .lib/hostname"
`;

export const generateExperimentId = `
import os
from datetime import UTC, datetime, timezone
import hashlib

ts = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
experiment_id = f"experiment-{hashlib.sha256(ts.encode()).hexdigest()[:8]}-{ts}"
os.environ["EXPERIMENT_ID"] = experiment_id
!echo "Created experiment ID environment var $EXPERIMENT_ID"
`;

export const createExperimentIdFolderSh = `
!mkdir -p ".lib/$EXPERIMENT_ID"
!echo "Created experiment ID folder $EXPERIMENT_ID"
`;

export const getExperimentId = `
import os
print("Getting experiment ID: " + os.environ["EXPERIMENT_ID"])
`;

// const getUsernameCode = `
// print("to test")
// `;

// Create and save session ID
/**
 * {
            "experiment_id": self.experiment_id,
            "start_time": str(self.start_time),
            "end_time": str(end_time),
            "duration_sec": duration,
            "cells_executed": self.executed_cells,
            "cells_failed": self.failed_cells
        }
 */
// Get all session IDs
// Install Scaphandre and Prometheus
// Start Prometheus server and Scaphandre
// Export metrics

export async function handleFirstCellExecution(
  app: JupyterFrontEnd<JupyterFrontEnd.IShell, 'desktop' | 'mobile'>
) {
  /**
   * TODO @goncalo:
   * - Folder skeleton (python, shell script)
   * - Pre-populate with files (execute script sh)
   *
   * - Save start time
   * - Generate and save experiment ID
   * - Register cells executed and failed
   */

  await app.serviceManager.contents.save('notebook-metrics-test-start.txt', {
    type: 'file',
    format: 'text',
    content: 'Hello, this is the first cell\n'
  });

  await app.serviceManager.contents
    .get('notebook-metrics-test-start.txt', { type: 'file' })
    .then((data: { content: unknown }) => {
      console.log('File content:', data.content);
    })
    .catch((error: Error) => {
      console.error('Error reading file:', error);
    });
}

export async function handleLastCellExecution(
  app: JupyterFrontEnd<JupyterFrontEnd.IShell, 'desktop' | 'mobile'>
) {
  await app.serviceManager.contents.save('notebook-metrics-test-end.txt', {
    type: 'file',
    format: 'text',
    content: 'Hello, this is the end cell\n'
  });
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
) {
  panel.sessionContext.ready.then(() => {
    const kernel = panel.sessionContext.session?.kernel;
    if (kernel) {
      kernel.requestExecute({ code }).onIOPub = (
        msg: KernelMessage.IIOPubMessage
      ) => handleIOPubResult(msg);
    } else {
      console.warn('No active kernel found.');
    }
  });
}

// Used for debugging purposes, to handle IOPub messages from the kernel.
function handleIOPubResult(
  msg: KernelMessage.IIOPubMessage
  // callback: (content: KernelMessage.IIOPubMessage['content']) => void
) {
  const msgType = msg.header.msg_type;

  if (msgType === 'stream') {
    const content = msg.content as KernelMessage.IStreamMsg['content'];
    console.log('Stream:', content.text);
  } else {
    console.warn(`Message type ${msgType} not handled yet.`);
  }
}
