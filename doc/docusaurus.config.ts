import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Jupyter VRE Workflow',
  tagline: 'Platform-agnostic sustainability assessment for Jupyter workflows',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://greendigit-ecojupyter.sztaki.hu',
  baseUrl: '/docs/',

  organizationName: 'g-uva',
  projectName: 'Jupyter VRE Workflow',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          editUrl: 'https://github.com/g-uva/EcoJupyter/tree/master/doc/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Jupyter VRE Workflow',
      logo: {
        alt: 'Jupyter VRE Workflow Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'mainSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://github.com/g-uva/EcoJupyter',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {label: 'Introduction', to: '/'},
            {label: 'Installation', to: '/installation/jupyterlab'},
            {label: 'Modules', to: '/modules/telemetry'},
          ],
        },
        {
          title: 'Project',
          items: [
            {label: 'GitHub', href: 'https://github.com/g-uva/EcoJupyter'},
            {label: 'GreenDIGIT', href: 'https://greendigit-project.eu/'},
            {label: 'PyPI', href: 'https://pypi.org/project/ecojupyter/'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Jupyter VRE Workflow — GreenDIGIT Project, University of Amsterdam. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'yaml'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
