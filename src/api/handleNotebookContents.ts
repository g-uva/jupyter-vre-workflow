import { JupyterFrontEnd } from '@jupyterlab/application';

export async function handleFirstCellExecution(
  app: JupyterFrontEnd<JupyterFrontEnd.IShell, 'desktop' | 'mobile'>
) {
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

