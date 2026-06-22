import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  mainSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: 'Introduction',
    },
    {
      type: 'doc',
      id: 'prerequisites',
      label: 'Prerequisites',
    },
    {
      type: 'category',
      label: 'Installation',
      items: [
        'installation/jupyterlab',
        'installation/ecojupyter',
        'installation/modules',
      ],
    },
    {
      type: 'category',
      label: 'Modules',
      items: [
        'modules/telemetry',
        'modules/reproducibility',
        'modules/orchestration',
      ],
    },
    {
      type: 'doc',
      id: 'validation',
      label: 'Validation & Troubleshooting',
    },
  ],
};

export default sidebars;
