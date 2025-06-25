import { showDialog, Dialog } from '@jupyterlab/apputils';

interface IJuptyerDialogWarning {
  message?: string;
  buttonLabel?: string;
  action?: () => void;
}

export default function JupyterDialogWarning({
  message,
  buttonLabel,
  action
}: IJuptyerDialogWarning) {
  showDialog({
    title: 'Warning ⚠️',
    body: message ?? 'There was some error, please contact the admin.',
    buttons: [Dialog.okButton({ label: buttonLabel ?? 'Continue' })]
  }).then(result => {
    // The dialog closes automatically, no need to manually trigger it.
    if (result.button.accept) {
      action?.();
    }
  });
}
