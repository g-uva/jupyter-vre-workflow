import { ServerConnection } from '@jupyterlab/services';

export type WorkflowModuleKey =
  | 'telemetry'
  | 'reproducibility'
  | 'orchestration';

export interface IInstalledModule {
  installed: boolean;
  bundled?: boolean;
  activated?: boolean;
  installation_mode?: 'mock-installation' | 'activation' | null;
  endpoint_mode?: string;
  prerequisites?: string[];
  version?: string;
  installedAt?: string;
}

export interface ITelemetryComponentStatus {
  installed: boolean;
  path: string | null;
}

export interface ITelemetryStatus {
  installed: boolean;
  components: {
    prometheus: ITelemetryComponentStatus;
    scaphandre: ITelemetryComponentStatus;
  };
}

export type InstalledModules = Record<WorkflowModuleKey, IInstalledModule>;

const MODULE_STATUS_STORAGE_KEY = 'jupyter-vre-workflow.installedModules';

export const DEFAULT_MODULE_STATUS: InstalledModules = {
  telemetry: { installed: false },
  reproducibility: { installed: false },
  orchestration: { installed: false }
};

function mergeModuleStatus(
  saved?: Partial<InstalledModules>
): InstalledModules {
  return {
    telemetry: {
      ...DEFAULT_MODULE_STATUS.telemetry
    },
    reproducibility: {
      ...DEFAULT_MODULE_STATUS.reproducibility,
      ...saved?.reproducibility
    },
    orchestration: {
      ...DEFAULT_MODULE_STATUS.orchestration,
      ...saved?.orchestration
    }
  };
}

async function moduleStatusRequest(
  init?: RequestInit
): Promise<InstalledModules> {
  const settings = ServerConnection.makeSettings();
  const requestUrl = `${settings.baseUrl.replace(/\/?$/, '/')}api/jupyter-vre-workflow/module-status`;
  const response = await ServerConnection.makeRequest(
    requestUrl,
    init ?? { method: 'GET' },
    settings
  );
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        'Telemetry services are not available in this Jupyter session. Restart JupyterLab to load the Jupyter VRE Workflow server extension.'
      );
    }
    throw new Error(`Unable to check telemetry services (${response.status}).`);
  }
  return response.json() as Promise<InstalledModules>;
}

export async function getTelemetryStatus(): Promise<ITelemetryStatus> {
  return (await moduleStatusRequest()).telemetry as ITelemetryStatus;
}

export function getModuleStatus(): Promise<InstalledModules> {
  return moduleStatusRequest();
}

export function activateModule(
  moduleKey: 'reproducibility' | 'orchestration'
): Promise<InstalledModules> {
  return moduleStatusRequest({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ module: moduleKey })
  });
}

export function runMockModuleInstaller(
  moduleKey: 'reproducibility' | 'orchestration',
  callbacks: {
    onProgress?: (value: { label: string; progress: number }) => void;
    onLog?: (value: { text: string }) => void;
  } = {}
): Promise<InstalledModules> {
  const settings = ServerConnection.makeSettings();
  const url = `${settings.baseUrl.replace(/\/?$/, '/')}api/jupyter-vre-workflow/module-install?module=${encodeURIComponent(moduleKey)}`;
  return new Promise((resolve, reject) => {
    const source = new EventSource(url);
    let complete = false;
    source.addEventListener('progress', event => {
      callbacks.onProgress?.(JSON.parse((event as MessageEvent).data));
    });
    source.addEventListener('log', event => {
      callbacks.onLog?.(JSON.parse((event as MessageEvent).data));
    });
    source.addEventListener('done', event => {
      complete = true;
      source.close();
      resolve(JSON.parse((event as MessageEvent).data));
    });
    source.onerror = () => {
      if (complete) {
        return;
      }
      source.close();
      reject(new Error('The mock module installation stream was interrupted.'));
    };
  });
}

export function loadModuleStatus(): InstalledModules {
  try {
    const saved = window.localStorage.getItem(MODULE_STATUS_STORAGE_KEY);
    return mergeModuleStatus(saved ? JSON.parse(saved) : undefined);
  } catch (error) {
    return DEFAULT_MODULE_STATUS;
  }
}

export function saveModuleStatus(modules: InstalledModules): void {
  window.localStorage.setItem(
    MODULE_STATUS_STORAGE_KEY,
    JSON.stringify(modules)
  );
}

export function markModuleInstalled(
  modules: InstalledModules,
  moduleKey: WorkflowModuleKey,
  version = 'local'
): InstalledModules {
  const updated = {
    ...modules,
    [moduleKey]: {
      installed: true,
      version,
      installedAt: new Date().toISOString()
    }
  };

  saveModuleStatus(updated);
  return updated;
}
