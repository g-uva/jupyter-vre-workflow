import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

const modules = [
  {
    title: 'Telemetry Module',
    body: 'Provides the observability layer for notebook runs. It can connect to telemetry services such as Scaphandre and Prometheus, expose energy measurements, and make sustainability indicators available to the workflow interface.',
    href: 'https://github.com/g-uva/jupyter-vre-telemetry',
  },
  {
    title: 'Reproducibility Module',
    body: 'Handles workflow context, notebook metadata and export packaging. It is intended to remain independently deployable while providing a common integration point for catalogues, RO-Crate metadata and storage services.',
    href: 'https://github.com/g-uva/jupyter-vre-reproducibility',
  },
  {
    title: 'Orchestration Module',
    body: 'Connects workflow traces to scheduling, placement and replay services. It allows orchestration systems to be integrated without coupling their implementation directly to the JupyterLab user interface.',
    href: 'https://github.com/g-uva/jupyter-vre-orchestration',
  },
];

export default function Home(): ReactNode {
  return (
    <Layout
      title="Jupyter VRE Workflow"
      description="A GreenDIGIT JupyterLab workflow tool for telemetry, reproducibility and orchestration in virtual research environments.">
      <main>
        <section className={styles.hero}>
          <div className="container">
            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <p className={styles.eyebrow}>GreenDIGIT Virtual Research Environment</p>
                <Heading as="h1" className={styles.title}>
                  Jupyter VRE Workflow
                </Heading>
                <p className={styles.lede}>
                  A JupyterLab integration framework for virtual research
                  environment workflows. It keeps telemetry, reproducibility and
                  orchestration modules loosely coupled while making them
                  accessible from one coherent user interface.
                </p>
                <div className={styles.actions}>
                  <Link className="button button--primary button--lg" to="/intro">
                    Open documentation
                  </Link>
                </div>
              </div>
              <div className={styles.summaryPanel} aria-label="Workflow capabilities">
                <div>
                  <span className={styles.metric}>3</span>
                  <span className={styles.metricLabel}>Integrated modules</span>
                </div>
                <div>
                  <span className={styles.metric}>JupyterLab</span>
                  <span className={styles.metricLabel}>Primary user environment</span>
                </div>
                <div>
                  <span className={styles.metric}>FDMI</span>
                  <span className={styles.metricLabel}>Metadata export target</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <Heading as="h2">Workflow Overview</Heading>
              <p>
                Jupyter VRE Workflow is not a monolithic implementation of every
                capability. It provides the common JupyterLab surface, lifecycle
                hooks and integration points needed to compose independent modules
                into a single workflow experience.
              </p>
            </div>
            <div className={styles.moduleGrid}>
              {modules.map(module => (
                <article className={styles.moduleCard} key={module.title}>
                  <Heading as="h3">{module.title}</Heading>
                  <p>{module.body}</p>
                  <a href={module.href}>GitHub placeholder</a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.fundingSection}>
          <div className="container">
            <div className={styles.fundingCard}>
              <div className={styles.logoRow}>
                <img
                  src="/docs/img/eu-funded.png"
                  alt="Funded by the European Union"
                  className={styles.euLogo}
                />
                <img
                  src="/docs/img/greendigit-logo.png"
                  alt="GreenDIGIT"
                  className={styles.greendigitLogo}
                />
              </div>
              <p>
                This work is funded from the European Union's Horizon Europe
                research and innovation programme through the GreenDIGIT project,
                under the grant agreement No.{' '}
                <a href="https://cordis.europa.eu/project/id/101131207">
                  101131207
                </a>.
              </p>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
