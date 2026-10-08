import { ServerConnection } from '@jupyterlab/services';

export type WorkflowModuleKey =
  | 'telemetry'
  | 'reproducibility'
  | 'orchestration';

export interface IInstalledModule {
  installed: boolean;
  bundled?: boolean;
  activated?: boolean;
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
