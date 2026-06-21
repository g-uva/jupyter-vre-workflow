import asyncio
import json
from pathlib import Path
from shlex import quote
from typing import Dict, List

from jupyter_server.base.handlers import APIHandler
from tornado import web


INSTALL_DIR = str(Path.home() / ".bin")
Q_INSTALL_DIR = quote(INSTALL_DIR)
SCAPHANDRE_VERSION = "v1.0.0"
SCAPHANDRE_BIN = str(Path(INSTALL_DIR) / "scaphandre")
Q_SCAPHANDRE_BIN = quote(SCAPHANDRE_BIN)
SCAPHANDRE_SRC_DIR = str(Path(INSTALL_DIR) / "scaphandre-src")
Q_SCAPHANDRE_SRC_DIR = quote(SCAPHANDRE_SRC_DIR)
PROMETHEUS_DIR = str(Path(INSTALL_DIR) / "prometheus-unzipped")
Q_PROMETHEUS_DIR = quote(PROMETHEUS_DIR)
PROMETHEUS_CONFIG = str(Path(INSTALL_DIR) / "prometheus.yml")
Q_PROMETHEUS_CONFIG = quote(PROMETHEUS_CONFIG)
SCAPHANDRE_LOG = str(Path(INSTALL_DIR) / "scaphandre.log")
Q_SCAPHANDRE_LOG = quote(SCAPHANDRE_LOG)
PROMETHEUS_LOG = str(Path(INSTALL_DIR) / "prometheus.log")
Q_PROMETHEUS_LOG = quote(PROMETHEUS_LOG)

STEPS: List[Dict[str, str]] = [
    {"label": "Prepare install directory", "cmd": f"mkdir -p {Q_INSTALL_DIR}"},
    {
        "label": "Check system package access",
        "cmd": "command -v sudo && command -v apt-get",
    },
    {"label": "Update apt-get", "cmd": "sudo apt-get update"},
    {
        "label": "Install dependencies",
        "cmd": "sudo apt-get install -y build-essential pkg-config libssl-dev lsof curl git wget tar ca-certificates",
    },
    {
        "label": "Download Rust installer",
        "cmd": " && ".join(
            [
                "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y",
                "source $HOME/.cargo/env",
            ]
        ),
    },
    {
        "label": "Install Rust toolchain 1.65.0",
        "cmd": " && ".join(
            [
                "source $HOME/.cargo/env",
                "rustup install 1.65.0",
            ]
        ),
    },
    {
        "label": "Clone Scaphandre",
        "cmd": " && ".join(
            [
                f"cd {Q_INSTALL_DIR}",
                f"rm -rf {Q_SCAPHANDRE_SRC_DIR}",
                f"git clone --depth 1 --branch {SCAPHANDRE_VERSION} https://github.com/hubblo-org/scaphandre.git {Q_SCAPHANDRE_SRC_DIR}",
            ]
        ),
    },
    {
        "label": "Build Scaphandre",
        "cmd": " && ".join(
            [
                "source $HOME/.cargo/env",
                f"cd {Q_SCAPHANDRE_SRC_DIR}",
                "cargo +1.65.0 build --release",
            ]
        ),
    },
    {
        "label": "Install Scaphandre binary",
        "cmd": " && ".join(
            [
                f"cd {Q_SCAPHANDRE_SRC_DIR}",
                f"rm -rf {Q_SCAPHANDRE_BIN}",
                f"mv ./target/release/scaphandre {Q_SCAPHANDRE_BIN}",
                f"chmod +x {Q_SCAPHANDRE_BIN}",
                f"rm -rf {Q_SCAPHANDRE_SRC_DIR}",
            ]
        ),
    },
    {
        "label": "Stop existing Scaphandre exporter",
        "cmd": " && ".join(
            [
                'pkill -f "[s]caphandre prometheus" || true',
            ]
        ),
    },
    {
        "label": "Start Scaphandre exporter",
        "cmd": " && ".join(
            [
                f"nohup {Q_SCAPHANDRE_BIN} prometheus --address=0.0.0.0 --port=8081 --containers > {Q_SCAPHANDRE_LOG} 2>&1 &",
            ]
        ),
    },
    {
        "label": "Download Prometheus",
        "cmd": " && ".join(
            [
                f"cd {Q_INSTALL_DIR}",
                f"rm -rf {Q_PROMETHEUS_DIR}",
                "wget https://github.com/prometheus/prometheus/releases/download/v2.52.0/prometheus-2.52.0.linux-amd64.tar.gz",
            ]
        ),
    },
    {
        "label": "Unpack Prometheus",
        "cmd": " && ".join(
            [
                f"cd {Q_INSTALL_DIR}",
                "tar xzf prometheus-2.52.0.linux-amd64.tar.gz",
                f"mv ./prometheus-2.52.0.linux-amd64 {Q_PROMETHEUS_DIR}",
                "rm -rf prometheus-2.52.0.linux-amd64.tar.gz",
            ]
        ),
    },
    {
        "label": "Write Prometheus config",
        "cmd": "\n".join(
            [
                f"cat > {Q_PROMETHEUS_CONFIG} <<'EOF'",
                "global:",
                "  scrape_interval: 15s",
                "scrape_configs:",
                "  - job_name: 'scaphandre'",
                "    static_configs:",
                "      - targets: ['localhost:8081']",
                "EOF",
            ]
        ),
    },
    {
        "label": "Stop existing Prometheus",
        "cmd": "\n".join(
            [
                'pkill -f "[p]rometheus.*--config.file=.*prometheus.yml" || true',
            ]
        ),
    },
    {
        "label": "Start Prometheus",
        "cmd": "\n".join(
            [
                f"nohup {Q_PROMETHEUS_DIR}/prometheus --config.file={Q_PROMETHEUS_CONFIG} --web.listen-address=0.0.0.0:9090 > {Q_PROMETHEUS_LOG} 2>&1 &",
            ]
        ),
    },
]


class MetricsInstallHandler(APIHandler):
    @web.authenticated
    async def get(self):
        self.set_header("Content-Type", "text/event-stream")
        self.set_header("Cache-Control", "no-cache")
        self.set_header("Connection", "keep-alive")

        for step_index, step in enumerate(STEPS):
            label = step["label"]
            progress = round((step_index / len(STEPS)) * 100)
            await self._write_event(
                "progress",
                {"step": step_index, "label": label, "progress": progress},
            )

            process = await asyncio.create_subprocess_shell(
                step["cmd"],
                executable="/bin/bash",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            await asyncio.gather(
                self._stream_output(step_index, process.stdout),
                self._stream_output(step_index, process.stderr),
            )

            code = await process.wait()
            if code != 0:
                await self._write_event(
                    "install-error",
                    f'Step "{label}" failed with exit code {code}.',
                )
                return

            progress = round(((step_index + 1) / len(STEPS)) * 100)
            await self._write_event(
                "progress",
                {"step": step_index, "label": label, "progress": progress},
            )

        await self._write_event("done", {})

    async def _stream_output(self, step_index, stream):
        if stream is None:
            return

        while True:
            line = await stream.readline()
            if not line:
                break
            await self._write_event(
                "log",
                {"step": step_index, "text": line.decode(errors="replace")},
            )

    async def _write_event(self, event, data):
        self.write(f"event: {event}\n")
        self.write(f"data: {json.dumps(data)}\n\n")
        await self.flush()
