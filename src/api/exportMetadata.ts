import { NotebookPanel } from '@jupyterlab/notebook';
import { toLowerCaseWithUnderscores } from '../helpers/utils';
import { IExportJsonProps } from './apiScripts';
import { resolveNotebookPath, saveJsonFile } from './jupyterContents';

const GCAT_ITEMS_URL = 'https://api.d4science.org/gcat/items';

async function getEnvironmentOS(): Promise<string> {
  const platform = window.navigator.platform || window.navigator.userAgent;
  return platform ? `Browser (${platform})` : 'Browser (Unknown OS)';
}

export async function exportSendJson(
  panel: NotebookPanel,
  props: IExportJsonProps
): Promise<unknown> {
  const os = await getEnvironmentOS();
  const platform = 'GreenDIGIT';
  const node = 'node_01';
  const lang = 'python';
  const projectId = 'greendigit_development';

  const jsonPayload = {
    name: toLowerCaseWithUnderscores(props.title),
    title: props.title,
    license_id: 'AFL-3.0',
    private: 'False',
    notes: 'GD call test environmnet.',
    url: 'null',
    tags: [{ name: 'Test' }],
    resources: [
      {
        name: 'RO-Crate metadata',
        url: 'https://data.d4science.net/5Apv',
        format: 'zip'
      }
    ],
    extras: [
      { key: 'Creation Date', value: props.creation_date },
      { key: 'Creator', value: props.creator },
      { key: 'Creator Email', value: props.email },
      { key: 'Creator Name PI (Principal Investigator)', value: props.orcid },
      { key: 'Environment OS', value: os },
      { key: 'Environment Platform', value: platform },
      { key: 'Experiment Dependencies', value: 'null' },
      { key: 'Experiment ID', value: props.experiment_id },
      { key: 'GreenDIGIT Node', value: node },
      { key: 'Programming Language', value: lang },
      { key: 'Project ID', value: projectId },
      { key: 'Session reading metrics', value: props.session_metrics },
      { key: 'system:type', value: 'Experiment' }
    ]
  };

  await saveJsonFile(
    panel,
    resolveNotebookPath(panel, '.lib/export_metadata.json'),
    jsonPayload
  );

  const response = await fetch(GCAT_ITEMS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${props.token}`
    },
    body: JSON.stringify(jsonPayload)
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`Metadata export failed: ${response.status} ${text}`);
  }

  return payload;
}
