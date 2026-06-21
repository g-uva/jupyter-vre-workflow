// src/server.ts
import express, { Request, Response } from 'express';
import { spawn } from 'child_process';

const app = express();
const PORT = process.env.PORT || 3001;

// Define your ordered steps:
const STEPS: { label: string; cmd: string }[] = [
  { label: 'Prepare install directory', cmd: 'mkdir -p /home/jovyan/.bin' },
  { label: 'Update apt-get', cmd: 'sudo apt-get update' },
  {
    label: 'Install dependencies',
    cmd: 'sudo apt-get install -y pkg-config libssl-dev lsof'
  },
  {
    label: 'Install Rust',
    cmd: [
      "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y",
      'source $HOME/.cargo/env',
      'rustup install 1.65.0',
      'rustup override set 1.65.0'
    ].join(' && ')
  },
  {
    label: 'Clone & build Scaphandre',
    cmd: [
      'cd /home/jovyan/.bin',
      'rm -rf scaphandre',
      'git clone https://github.com/hubblo-org/scaphandre.git',
      'cd scaphandre',
      'cargo build --release',
      'sudo mv ./target/release/scaphandre /usr/local/bin',
      'cd /home/jovyan/.bin',
      'rm -rf scaphandre'
    ].join(' && ')
  },
  {
    label: 'Start Scaphandre exporter',
    cmd: [
      'pkill -f "scaphandre prometheus" || true',
      'nohup scaphandre prometheus --address=0.0.0.0 --port=8081 --containers > /home/jovyan/.bin/scaphandre.log 2>&1 &'
    ].join(' && ')
  },
  {
    label: 'Install Prometheus',
    cmd: [
      'cd /home/jovyan/.bin',
      'sudo rm -rf /home/jovyan/.bin/prometheus-unzipped',
      'wget https://github.com/prometheus/prometheus/releases/download/v2.52.0/prometheus-2.52.0.linux-amd64.tar.gz',
      'tar xzf prometheus-2.52.0.linux-amd64.tar.gz',
      'mv ./prometheus-2.52.0.linux-amd64 /home/jovyan/.bin/prometheus-unzipped',
      'rm -rf prometheus-2.52.0.linux-amd64.tar.gz'
    ].join(' && ')
  },
  {
    label: 'Start Prometheus',
    cmd: [
      "cat > /home/jovyan/.bin/prometheus.yml <<'EOF'",
      'global:',
      '  scrape_interval: 15s',
      'scrape_configs:',
      "  - job_name: 'scaphandre'",
      '    static_configs:',
      "      - targets: ['localhost:8081']",
      'EOF',
      'pkill -f "prometheus.*prometheus.yml" || true',
      'nohup /home/jovyan/.bin/prometheus-unzipped/prometheus --config.file=/home/jovyan/.bin/prometheus.yml --web.listen-address=0.0.0.0:9090 > /home/jovyan/.bin/prometheus.log 2>&1 &'
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
