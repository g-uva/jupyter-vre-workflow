export type WorkflowModuleKey =
  | 'telemetry'
  | 'reproducibility'
  | 'orchestration';

export interface IInstalledModule {
  installed: boolean;
  version?: string;
  installedAt?: string;
}

export type InstalledModules = Record<WorkflowModuleKey, IInstalledModule>;

const MODULE_STATUS_STORAGE_KEY = 'ecojupyter.installedModules';

export const DEFAULT_MODULE_STATUS: InstalledModules = {
  telemetry: { installed: true },
  reproducibility: { installed: true },
  orchestration: { installed: true }
};

function mergeModuleStatus(saved?: Partial<InstalledModules>): InstalledModules {
  return {
    telemetry: {
      ...DEFAULT_MODULE_STATUS.telemetry,
      ...saved?.telemetry
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
