import { NotebookPanel } from '@jupyterlab/notebook';
import { KernelMessage } from '@jupyterlab/services';

export const saveUsernameSh = `
%%bash
mkdir -p .lib
echo \${HOSTNAME#jupyter-} > .lib/hostname
echo "Username saved to .lib/hostname"
`;

export const generateExperimentId = `
import os
from datetime import UTC, datetime, timezone
import hashlib

ts = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
os.environ["START_TIME"] = ts
experiment_id = f"experiment-{hashlib.sha256(ts.encode()).hexdigest()[:8]}-{ts}"
os.environ["EXPERIMENT_ID"] = experiment_id
print("Created experiment ID environment var $EXPERIMENT_ID")
`;

export const createExperimentIdFolderSh = `
%%bash
mkdir -p ".lib/$EXPERIMENT_ID"
echo "Created experiment ID folder $EXPERIMENT_ID"
`;

export const getExperimentId = `
import os
print("Getting experiment ID: " + os.environ["EXPERIMENT_ID"])
`;

export const getUsernameSh = `
%%bash
cat .lib/hostname
`;

export const installPrometheusScaphandre: string = `
%%bash
curl -O https://raw.githubusercontent.com/g-uva/JupyterK8sMonitor/refs/heads/master/scaphandre-prometheus-ownpod/install-scaphandre-prometheus.sh
sudo chmod +x install-scaphandre-prometheus.sh
./install-scaphandre-prometheus.sh
sudo rm -rf ./install-scaphandre-prometheus.sh
`;

export const cleanExperimentId = `
import os
os.environ["EXPERIMENT_ID"] = ""
print("Cleared EXPERIMENT_ID")
`;

export const moveExperimentFolder = `
%%bash
# HOME="/home/jovyan"
HOME="."
if [ -n "$EXPERIMENT_ID" ]; then
  mkdir -p $HOME/experiments
  mv $HOME/.lib/experiments/$EXPERIMENT_ID $HOME/experiments/$EXPERIMENT_ID
  echo "Moved experiment: $EXPERIMENT_ID"
else
  echo "No EXPERIMENT_ID set, skipping move."
fi
`;

export const getStartEndTime = `
import os
st = os.environ["START_TIME"]
et = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
print(st + et)
`;

/**
 * TODO @goncalo for adnan:
 * - Folder skeleton (python, shell script)
 * - Pre-populate with files (execute script sh)
 */

// Start/end time
// Cell executed + failed + time for each
// Everything in JSON format.

// Manual with buttons
// Export metrics
// Install + start scaphandre and Prometheus

// automatic
// Get all experiments' ids.

export async function handleFirstCellExecution(panel: NotebookPanel) {
  await handleNotebookSessionContents(panel, generateExperimentId);
  await handleNotebookSessionContents(panel, createExperimentIdFolderSh);
}

export async function handleLastCellExecution(panel: NotebookPanel) {
  await handleNotebookSessionContents(panel, moveExperimentFolder);
  await handleNotebookSessionContents(panel, cleanExperimentId);
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
function handleIOPubResult(msg: KernelMessage.IIOPubMessage) {
  const msgType = msg.header.msg_type;

  if (msgType === 'stream') {
    const content = msg.content as KernelMessage.IStreamMsg['content'];
    console.log('Stream:', content.text);
  } else if (msgType === 'execute_result') {
    const content = msg.content as KernelMessage.IExecuteResultMsg['content'];
    console.log('Execute result:', content.data['text/plain']);
  } else if (msgType === 'error') {
    const content = msg.content as KernelMessage.IErrorMsg['content'];
    console.error('Kernel error:', content.ename, content.evalue);
  } else if (msgType === 'status') {
    const content = msg.content as KernelMessage.IStatusMsg['content'];
    console.log('Kernel status:', content.execution_state);
  } else {
    console.warn(`Message type ${msgType} not handled yet.`);
  }
}

/**
 * Fetch the current username from the kernel's hostname
 */
export async function fetchUsernameFromKernel(
  panel: NotebookPanel
): Promise<string> {
  const kernel = panel.sessionContext.session?.kernel;
  if (!kernel) {
    throw new Error('No kernel available');
  }

  const code = getUsernameSh;

  let username = '';
  const future = kernel.requestExecute({ code });
  future.onIOPub = msg => {
    if (msg.header.msg_type === 'stream') {
      const content = msg.content as any;
      username = content.text.trim();
    }
  };

  await future.done;
  return username;
}
