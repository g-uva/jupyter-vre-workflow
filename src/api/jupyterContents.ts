import { NotebookPanel } from '@jupyterlab/notebook';
import { Contents } from '@jupyterlab/services';

let contentsManager: Contents.IManager | null = null;

export function setContentsManager(manager: Contents.IManager): void {
  contentsManager = manager;
}

function dirname(path: string): string {
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  return parts.join('/');
}

function joinPath(...parts: string[]): string {
  return parts
    .flatMap(part => part.split('/'))
    .filter(part => part && part !== '.')
    .join('/');
}

function getNotebookDirectory(panel: NotebookPanel): string {
  return dirname(panel.context.path);
}

export function resolveNotebookPath(
  panel: NotebookPanel,
  path: string
): string {
  return joinPath(getNotebookDirectory(panel), path);
}

function getContentsManager(panel: NotebookPanel): Contents.IManager {
  if (!contentsManager) {
    throw new Error('Jupyter contents manager has not been initialized.');
  }

  return contentsManager;
}

export async function pathExists(
  panel: NotebookPanel,
  path: string
): Promise<boolean> {
  try {
    await getContentsManager(panel).get(path, { content: false });
    return true;
  } catch (error) {
    return false;
  }
}

export async function ensureDirectory(
  panel: NotebookPanel,
  path: string
): Promise<void> {
  const manager = getContentsManager(panel);
  const normalizedPath = manager.normalize(path);
  const parts = normalizedPath.split('/').filter(Boolean);
  let current = '';

  for (const part of parts) {
    current = joinPath(current, part);

    if (await pathExists(panel, current)) {
      continue;
    }

    try {
      await manager.save(current, {
        type: 'directory',
        format: 'json',
        content: null
      });
    } catch (error) {
      if (!(await pathExists(panel, current))) {
        throw error;
      }
    }
  }
}

export async function saveTextFile(
  panel: NotebookPanel,
  path: string,
  content: string
): Promise<void> {
  const parent = dirname(path);
  if (parent) {
    await ensureDirectory(panel, parent);
  }

  await getContentsManager(panel).save(path, {
    type: 'file',
    format: 'text',
    content
  });
}

export async function readTextFile(
  panel: NotebookPanel,
  path: string
): Promise<string | null> {
  try {
    const model = await getContentsManager(panel).get(path, {
      content: true,
      type: 'file',
      format: 'text'
    });
    return typeof model.content === 'string' ? model.content : null;
  } catch (error) {
    return null;
  }
}

export async function listDirectoryNames(
  panel: NotebookPanel,
  path: string
): Promise<string[]> {
  try {
    const model = await getContentsManager(panel).get(path, {
      content: true,
      type: 'directory'
    });

    if (!Array.isArray(model.content)) {
      return [];
    }

    return model.content
      .filter((entry: Contents.IModel) => entry.type === 'directory')
      .map((entry: Contents.IModel) => entry.name);
  } catch (error) {
    return [];
  }
}

export async function saveJsonFile(
  panel: NotebookPanel,
  path: string,
  content: unknown
): Promise<void> {
  await saveTextFile(panel, path, JSON.stringify(content, null, 2));
}

export async function readJsonFile<T>(
  panel: NotebookPanel,
  path: string
): Promise<T | null> {
  const content = await readTextFile(panel, path);
  if (content === null) {
    return null;
  }

  return JSON.parse(content) as T;
}
