import { NotebookPanel } from '@jupyterlab/notebook';
import {
  readJsonFile,
  resolveNotebookPath,
  saveJsonFile
} from './jupyterContents';

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

const MODULE_STATUS_PATH = '.lib/modules.json';

export const DEFAULT_MODULE_STATUS: InstalledModules = {
  telemetry: { installed: false },
  reproducibility: { installed: false },
  orchestration: { installed: false }
};

export async function loadModuleStatus(
  panel: NotebookPanel
): Promise<InstalledModules> {
  const saved = await readJsonFile<Partial<InstalledModules>>(
    panel,
    resolveNotebookPath(panel, MODULE_STATUS_PATH)
  );

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

export async function saveModuleStatus(
  panel: NotebookPanel,
  modules: InstalledModules
): Promise<void> {
  await saveJsonFile(
    panel,
    resolveNotebookPath(panel, MODULE_STATUS_PATH),
    modules
  );
}

export async function markModuleInstalled(
  panel: NotebookPanel,
  modules: InstalledModules,
  moduleKey: WorkflowModuleKey,
  version = 'local'
): Promise<InstalledModules> {
  const updated = {
    ...modules,
    [moduleKey]: {
      installed: true,
      version,
      installedAt: new Date().toISOString()
    }
  };

  await saveModuleStatus(panel, updated);
  return updated;
}
