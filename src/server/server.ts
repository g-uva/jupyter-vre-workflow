// Dev-only Express mirror. JupyterLab uses ecojupyter.handlers for /api/run-install.
import express, { Request, Response } from 'express';
import { spawn } from 'child_process';
import { homedir } from 'os';

const app = express();
const PORT = process.env.PORT || 3001;
const INSTALL_DIR = `${homedir()}/.bin`;
const SCAPHANDRE_VERSION = 'v1.0.0';
const SCAPHANDRE_BIN = `${INSTALL_DIR}/scaphandre`;
const SCAPHANDRE_SRC_DIR = `${INSTALL_DIR}/scaphandre-src`;
const PROMETHEUS_DIR = `${INSTALL_DIR}/prometheus-unzipped`;
const PROMETHEUS_CONFIG = `${INSTALL_DIR}/prometheus.yml`;

// Define your ordered steps:
const STEPS: { label: string; cmd: string }[] = [
  { label: 'Prepare install directory', cmd: `mkdir -p ${INSTALL_DIR}` },
  {
    label: 'Check system package access',
    cmd: 'command -v sudo && command -v apt-get'
  },
  { label: 'Update apt-get', cmd: 'sudo apt-get update' },
  {
    label: 'Install dependencies',
    cmd: 'sudo apt-get install -y build-essential pkg-config libssl-dev lsof curl git wget tar ca-certificates'
  },
  {
    label: 'Download Rust installer',
    cmd: [
      "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y",
      'source $HOME/.cargo/env'
    ].join(' && ')
  },
  {
    label: 'Install Rust toolchain 1.65.0',
    cmd: [
      'source $HOME/.cargo/env',
      'rustup install 1.65.0',
    ].join(' && ')
  },
  {
    label: 'Clone Scaphandre',
    cmd: [
      `cd ${INSTALL_DIR}`,
      `rm -rf ${SCAPHANDRE_SRC_DIR}`,
      `git clone --depth 1 --branch ${SCAPHANDRE_VERSION} https://github.com/hubblo-org/scaphandre.git ${SCAPHANDRE_SRC_DIR}`
    ].join(' && ')
  },
  {
    label: 'Build Scaphandre',
    cmd: [
      'source $HOME/.cargo/env',
      `cd ${SCAPHANDRE_SRC_DIR}`,
      'cargo +1.65.0 build --release'
    ].join(' && ')
  },
  {
    label: 'Install Scaphandre binary',
    cmd: [
      `cd ${SCAPHANDRE_SRC_DIR}`,
      `rm -rf ${SCAPHANDRE_BIN}`,
      `mv ./target/release/scaphandre ${SCAPHANDRE_BIN}`,
      `chmod +x ${SCAPHANDRE_BIN}`,
      `rm -rf ${SCAPHANDRE_SRC_DIR}`
    ].join(' && ')
  },
  {
    label: 'Stop existing Scaphandre exporter',
    cmd: [
      'pkill -f "[s]caphandre prometheus" || true'
    ].join(' && ')
  },
  {
    label: 'Start Scaphandre exporter',
    cmd: [
      `nohup ${SCAPHANDRE_BIN} prometheus --address=0.0.0.0 --port=8081 --containers > ${INSTALL_DIR}/scaphandre.log 2>&1 &`
    ].join(' && ')
  },
  {
    label: 'Download Prometheus',
    cmd: [
      `cd ${INSTALL_DIR}`,
      `rm -rf ${PROMETHEUS_DIR}`,
      'wget https://github.com/prometheus/prometheus/releases/download/v2.52.0/prometheus-2.52.0.linux-amd64.tar.gz'
    ].join(' && ')
  },
  {
    label: 'Unpack Prometheus',
    cmd: [
      `cd ${INSTALL_DIR}`,
      'tar xzf prometheus-2.52.0.linux-amd64.tar.gz',
      `mv ./prometheus-2.52.0.linux-amd64 ${PROMETHEUS_DIR}`,
      'rm -rf prometheus-2.52.0.linux-amd64.tar.gz'
    ].join(' && ')
  },
  {
    label: 'Write Prometheus config',
    cmd: [
      `cat > ${PROMETHEUS_CONFIG} <<'EOF'`,
      'global:',
      '  scrape_interval: 15s',
      'scrape_configs:',
      "  - job_name: 'scaphandre'",
      '    static_configs:',
      "      - targets: ['localhost:8081']",
      'EOF'
    ].join('\n')
  },
  {
    label: 'Stop existing Prometheus',
    cmd: ['pkill -f "[p]rometheus.*--config.file=.*prometheus.yml" || true'].join(
      '\n'
    )
  },
  {
    label: 'Start Prometheus',
    cmd: [
      `nohup ${PROMETHEUS_DIR}/prometheus --config.file=${PROMETHEUS_CONFIG} --web.listen-address=0.0.0.0:9090 > ${INSTALL_DIR}/prometheus.log 2>&1 &`
    ].join('\n')
  }
];

app.get('/api/run-install', (_req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });

  let stepIndex = 0;

  const runNext = () => {
    if (stepIndex >= STEPS.length) {
      res.write('event: done\ndata: {}\n\n');
      return res.end();
    }

    const { label, cmd } = STEPS[stepIndex];
    const startedProgress = Math.round((stepIndex / STEPS.length) * 100);
    res.write(
      `event: progress\ndata: ${JSON.stringify({ step: stepIndex, label, progress: startedProgress })}\n\n`
    );

    const child = spawn(cmd, { shell: true, env: process.env });

    // Stream stdout
    child.stdout.on('data', data => {
      res.write(
        `event: log\ndata: ${JSON.stringify({ step: stepIndex, text: data.toString() })}\n\n`
      );
    });
    // Stream stderr
    child.stderr.on('data', data => {
      res.write(
        `event: log\ndata: ${JSON.stringify({ step: stepIndex, text: data.toString() })}\n\n`
      );
    });

    child.on('exit', code => {
      if (code !== 0) {
        res.write(
          `event: install-error\ndata: ${JSON.stringify(`Step "${label}" failed with exit code ${code}.`)}\n\n`
        );
        return res.end();
      }

      const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100);
      res.write(
        `event: progress\ndata: ${JSON.stringify({ step: stepIndex, label, progress })}\n\n`
      );
      stepIndex += 1;
      runNext();
    });
  };

  runNext();
});

app.listen(PORT, () => {
  console.log(`Installer API running on http://localhost:${PORT}`);
});
