import { ServerConnection } from '@jupyterlab/services';

export interface IInstallerProgress {
  step: number;
  label?: string;
  progress: number;
}

export interface IInstallerLog {
  step: number;
  text: string;
}

interface IRunMetricsInstallerOptions {
  onProgress?: (progress: IInstallerProgress) => void;
  onLog?: (log: IInstallerLog) => void;
}

export async function runMetricsInstaller({
  onProgress,
  onLog
}: IRunMetricsInstallerOptions = {}): Promise<void> {
  const settings = ServerConnection.makeSettings();
  const requestUrl = `${settings.baseUrl.replace(/\/?$/, '/')}api/run-install`;

  return new Promise((resolve, reject) => {
    const eventSource = new EventSource(requestUrl);
    let settled = false;

    eventSource.addEventListener('progress', event => {
      onProgress?.(JSON.parse((event as MessageEvent).data));
    });

    eventSource.addEventListener('log', event => {
      onLog?.(JSON.parse((event as MessageEvent).data));
    });

    eventSource.addEventListener('done', () => {
      settled = true;
      eventSource.close();
      resolve();
    });

    eventSource.addEventListener('install-error', event => {
      settled = true;
      eventSource.close();
      reject(new Error(JSON.parse((event as MessageEvent).data)));
    });

    eventSource.onerror = () => {
      if (settled) {
        return;
      }
      settled = true;
      eventSource.close();
      reject(
        new Error(
          'Metrics installer endpoint is unavailable. Restart JupyterLab after installing the Jupyter VRE Workflow server extension.'
        )
      );
    };
  });
}
