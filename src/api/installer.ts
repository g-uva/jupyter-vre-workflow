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

    eventSource.addEventListener('progress', event => {
      onProgress?.(JSON.parse((event as MessageEvent).data));
    });

    eventSource.addEventListener('log', event => {
      onLog?.(JSON.parse((event as MessageEvent).data));
    });

    eventSource.addEventListener('done', () => {
      eventSource.close();
      resolve();
    });

    eventSource.addEventListener('install-error', event => {
      eventSource.close();
      reject(new Error((event as MessageEvent).data));
    });

    eventSource.onerror = () => {
      eventSource.close();
      reject(new Error('Metrics installer stream failed.'));
    };
  });
}
