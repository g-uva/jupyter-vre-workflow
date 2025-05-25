// src/server.ts
import express, { Request, Response } from 'express';
import { spawn } from 'child_process';

const app = express();
const PORT = process.env.PORT || 3001;

// Define your ordered steps:
const STEPS: { label: string; cmd: string }[] = [
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
      'git clone https://github.com/hubblo-org/scaphandre.git',
      'cd scaphandre',
      'cargo build --release',
      'sudo mv ./target/release/scaphandre /usr/local/bin',
      'cd ~',
      'rm -rf scaphandre'
    ].join(' && ')
  }
  // …add Prometheus, Grafana steps here
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
