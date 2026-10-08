import asyncio
import json
import nbformat
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from shlex import quote
from typing import Dict, List

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
from tornado import web

from .experiments import ExperimentManager
from .telemetry import ScaphandreCsvExporter
from .reproducibility import CimDemoClient, FdmiDemoClient, ReproducibilityManager
from .orchestration import CatalogueDemoClient, FederationDemoClient, OrchestrationManager


class ExperimentsHandler(APIHandler):
    def initialize(self, manager):
        self.manager = manager

    @web.authenticated
    async def post(self):
        body = self.get_json_body() or {}
        if not isinstance(body, dict):
            raise web.HTTPError(400, reason="Expected a JSON object")
        try:
            record = self.manager.start(body.get("notebook_path", ""), body.get("notebook"))
        except (ValueError, OSError, nbformat.ValidationError, AttributeError, TypeError) as error:
            raise web.HTTPError(400, reason=str(error)) from error
        self.set_status(202)
        self.finish(record)

    @web.authenticated
    async def get(self):
        try:
            self.finish(self.manager.get(self.get_argument("path")))
        except (ValueError, OSError) as error:
            raise web.HTTPError(404, reason=str(error)) from error

    @web.authenticated
    async def delete(self):
        path = self.get_argument("path")
        try:
            task = self.manager.tasks.get(path)
            if task is not None and not task.done():
                self.manager.cancel(path)
                status = "cancelling"
            else:
                self.manager.delete(path)
                status = "deleted"
        except ValueError as error:
            raise web.HTTPError(400, reason=str(error)) from error
        self.set_status(202 if status == "cancelling" else 200)
        self.finish({"status": status})


INSTALL_DIR = str(Path.home() / ".bin")
Q_INSTALL_DIR = quote(INSTALL_DIR)
SCAPHANDRE_VERSION = "v1.0.0"
SCAPHANDRE_BIN = str(Path(INSTALL_DIR) / "scaphandre")
Q_SCAPHANDRE_BIN = quote(SCAPHANDRE_BIN)
SCAPHANDRE_SRC_DIR = str(Path(INSTALL_DIR) / "scaphandre-src")
Q_SCAPHANDRE_SRC_DIR = quote(SCAPHANDRE_SRC_DIR)
PROMETHEUS_DIR = str(Path(INSTALL_DIR) / "prometheus-unzipped")
Q_PROMETHEUS_DIR = quote(PROMETHEUS_DIR)
PROMETHEUS_BIN = str(Path(PROMETHEUS_DIR) / "prometheus")
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


def _installed_executable(configured_path: str, command: str):
    """Return installation details for a configured or PATH executable."""
    resolved_path = (
        configured_path
        if os.access(configured_path, os.X_OK)
        else shutil.which(command)
    )
    return {
        "installed": resolved_path is not None,
        "path": resolved_path,
    }


def get_module_status(root_dir=None):
    scaphandre = _installed_executable(SCAPHANDRE_BIN, "scaphandre")
    prometheus = _installed_executable(PROMETHEUS_BIN, "prometheus")
    activation_path = (
        Path(root_dir).resolve() / "juvre" / "configuration" / "modules.json"
        if root_dir else None
    )
    activated = {}
    if activation_path and activation_path.is_file():
        activated = json.loads(activation_path.read_text())
    return {
        "telemetry": {
            "installed": scaphandre["installed"] and prometheus["installed"],
            "components": {
                "prometheus": prometheus,
                "scaphandre": scaphandre,
            },
        },
        "reproducibility": {
            "installed": True,
            "bundled": True,
            "activated": bool(activated.get("reproducibility")),
            "endpoint_mode": "embedded or configured Kubernetes mocks",
            "prerequisites": ["A saved JuVRE experiment"],
        },
        "orchestration": {
            "installed": True,
            "bundled": True,
            "activated": bool(activated.get("orchestration")),
            "endpoint_mode": "embedded demonstration federation",
            "prerequisites": ["A saved JuVRE experiment", "Demo node registration"],
        },
    }


class ModuleStatusHandler(APIHandler):
    def initialize(self, root_dir):
        self.root_dir = Path(root_dir).resolve()

    @web.authenticated
    async def get(self):
        self.finish(get_module_status(self.root_dir))

    @web.authenticated
    async def post(self):
        body = self.get_json_body() or {}
        module = body.get("module")
        if module not in {"reproducibility", "orchestration"}:
            raise web.HTTPError(400, reason="Only bundled modules can be activated")
        path = self.root_dir / "juvre" / "configuration" / "modules.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        saved = json.loads(path.read_text()) if path.is_file() else {}
        saved[module] = {"activated": True, "activated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")}
        temporary = path.with_suffix(".json.tmp")
        temporary.write_text(json.dumps(saved, indent=2) + "\n")
        temporary.replace(path)
        self.finish(get_module_status(self.root_dir))


class CimConnectionHandler(APIHandler):
    """Server-side bridge to the cluster-internal CIM endpoint."""

    def initialize(self, client, manager):
        self.client = client
        self.manager = manager

    @web.authenticated
    async def post(self):
        body = self.get_json_body() or {}
        try:
            result = await asyncio.to_thread(self.client.connect)
            if body.get("path"):
                self.manager.mark_cim_connected(body["path"], result)
        except RuntimeError as error:
            raise web.HTTPError(502, reason=str(error)) from error
        except (ValueError, OSError, json.JSONDecodeError) as error:
            raise web.HTTPError(400, reason=str(error)) from error
        self.finish(result)


class ReproducibilityConfigHandler(APIHandler):
    def initialize(self, manager):
        self.manager = manager

    @web.authenticated
    async def get(self):
        try:
            self.finish(self.manager.get(self.get_argument("path")))
        except (ValueError, OSError, json.JSONDecodeError) as error:
            raise web.HTTPError(404, reason=str(error)) from error

    @web.authenticated
    async def put(self):
        body = self.get_json_body() or {}
        try:
            result = self.manager.configure(
                body.get("path"),
                body.get("standard_key"),
                body.get("mapping", {}),
                body.get("metadata_profile_key"),
                body.get("cloud_configuration"),
                body.get("crate_configuration"),
            )
        except (ValueError, OSError, json.JSONDecodeError) as error:
            raise web.HTTPError(400, reason=str(error)) from error
        self.finish(result)


class RoCrateHandler(APIHandler):
    def initialize(self, manager):
        self.manager = manager

    @web.authenticated
    async def post(self):
        body = self.get_json_body() or {}
        try:
            self.finish(self.manager.generate_crate(body.get("path")))
        except (ValueError, OSError, json.JSONDecodeError) as error:
            raise web.HTTPError(400, reason=str(error)) from error


class FdmiPublishHandler(APIHandler):
    def initialize(self, manager):
        self.manager = manager

    @web.authenticated
    async def post(self):
        body = self.get_json_body() or {}
        try:
            result = await asyncio.to_thread(
                self.manager.publish, body.get("path")
            )
        except RuntimeError as error:
            raise web.HTTPError(502, reason=str(error)) from error
        except (ValueError, OSError, json.JSONDecodeError) as error:
            raise web.HTTPError(400, reason=str(error)) from error
        self.finish(result)


class FdmiConnectionHandler(APIHandler):
    def initialize(self, manager):
        self.manager = manager

    @web.authenticated
    async def post(self):
        body = self.get_json_body() or {}
        try:
            self.finish(self.manager.connect_fdmi(body.get("path")))
        except (ValueError, OSError, json.JSONDecodeError) as error:
            raise web.HTTPError(400, reason=str(error)) from error

    @web.authenticated
    async def get(self):
        self.finish({"submissions": self.manager.fdmi_catalogue()})


class OrchestrationRegistrationHandler(APIHandler):
    def initialize(self, manager):
        self.manager = manager

    @web.authenticated
    async def get(self):
        self.finish(self.manager.get_registration(self.get_argument("user", "")))

    @web.authenticated
    async def post(self):
        body = self.get_json_body() or {}
        try:
            result = await asyncio.to_thread(
                self.manager.register, body.get("user", ""), body.get("registration")
            )
        except RuntimeError as error:
            raise web.HTTPError(502, reason=str(error)) from error
        except (ValueError, OSError, json.JSONDecodeError) as error:
            raise web.HTTPError(400, reason=str(error)) from error
        self.finish(result)


class OrchestrationMetadataHandler(APIHandler):
    def initialize(self, manager):
        self.manager = manager

    @web.authenticated
    async def post(self):
        body = self.get_json_body() or {}
        action = body.get("action", "select")
        try:
            method = self.manager.sync_metadata if action == "sync" else self.manager.select_metadata
            result = await asyncio.to_thread(
                method, body.get("user", ""), body.get("path")
            )
        except RuntimeError as error:
            raise web.HTTPError(502, reason=str(error)) from error
        except (ValueError, OSError, json.JSONDecodeError) as error:
            raise web.HTTPError(400, reason=str(error)) from error
        self.finish(result)


class OrchestrationPredictionHandler(APIHandler):
    def initialize(self, manager):
        self.manager = manager

    @web.authenticated
    async def get(self):
        try:
            self.finish(self.manager.get_prediction(
                self.get_argument("user", ""), self.get_argument("path")
            ))
        except (ValueError, OSError, json.JSONDecodeError) as error:
            raise web.HTTPError(400, reason=str(error)) from error

    @web.authenticated
    async def post(self):
        body = self.get_json_body() or {}
        try:
            self.finish(self.manager.start_prediction(
                body.get("user", ""), body.get("path"), body.get("site_ids")
            ))
        except (ValueError, OSError, json.JSONDecodeError) as error:
            raise web.HTTPError(400, reason=str(error)) from error

    @web.authenticated
    async def delete(self):
        body = self.get_json_body() or {}
        try:
            self.finish(self.manager.cancel_prediction(
                body.get("user", ""), body.get("path")
            ))
        except (ValueError, OSError, json.JSONDecodeError) as error:
            raise web.HTTPError(400, reason=str(error)) from error


class OrchestrationRunHandler(APIHandler):
    def initialize(self, manager):
        self.manager = manager

    @web.authenticated
    async def get(self):
        try:
            self.finish(self.manager.get_orchestration(
                self.get_argument("user", ""), self.get_argument("path")
            ))
        except (ValueError, OSError, json.JSONDecodeError) as error:
            raise web.HTTPError(400, reason=str(error)) from error


class WorkshopCatalogueHandler(APIHandler):
    def initialize(self, manager, experiment_manager):
        self.manager = manager
        self.experiment_manager = experiment_manager

    @web.authenticated
    async def get(self):
        catalogue_id = self.get_argument("catalogue_id", None)
        if catalogue_id:
            try:
                path = self.manager.bundle_path(catalogue_id)
            except (ValueError, OSError, json.JSONDecodeError) as error:
                raise web.HTTPError(404, reason=str(error)) from error
            self.set_header("Content-Type", "application/zip")
            self.set_header(
                "Content-Disposition", f'attachment; filename="{path.name}"'
            )
            self.finish(path.read_bytes())
            return
        self.finish({"experiments": self.manager.catalogue()})

    @web.authenticated
    async def post(self):
        body = self.get_json_body() or {}
        action = body.get("action")
        try:
            if action == "share":
                result = self.manager.share_experiment(
                    body.get("user", ""), body.get("path"), body.get("display_name")
                )
            elif action == "import":
                result = self.manager.import_shared(
                    body.get("user", ""), body.get("catalogue_id")
                )
            elif action == "replay":
                imported = self.manager.import_shared(
                    body.get("user", ""), body.get("catalogue_id")
                )
                record = self.experiment_manager.start(imported["notebook_path"])
                run_path = self.experiment_manager.resolve(record["path"]) / "run.json"
                saved = json.loads(run_path.read_text())
                saved["source_run_id"] = imported["source_run_id"]
                saved["source_catalogue_id"] = body.get("catalogue_id")
                temporary = run_path.with_suffix(".json.tmp")
                temporary.write_text(json.dumps(saved, indent=2) + "\n")
                temporary.replace(run_path)
                self.experiment_manager.records[record["path"]].update(saved)
                result = saved
            else:
                raise ValueError("Unsupported catalogue action")
        except (ValueError, OSError, json.JSONDecodeError) as error:
            raise web.HTTPError(400, reason=str(error)) from error
        self.finish(result)

    @web.authenticated
    async def post(self):
        body = self.get_json_body() or {}
        try:
            self.finish(self.manager.start_orchestration(
                body.get("user", ""), body.get("path"),
                body.get("site_ids", body.get("target_site_id"))
            ))
        except (ValueError, OSError, json.JSONDecodeError) as error:
            raise web.HTTPError(400, reason=str(error)) from error

class MetricsInstallHandler(APIHandler):
    @web.authenticated
    async def get(self):
        self.set_header("Content-Type", "text/event-stream")
        self.set_header("Cache-Control", "no-cache")
        self.set_header("Connection", "keep-alive")
        self.set_header("X-Accel-Buffering", "no")

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

            output_tasks = [
                asyncio.create_task(
                    self._stream_output(step_index, process.stdout)
                ),
                asyncio.create_task(
                    self._stream_output(step_index, process.stderr)
                ),
            ]
            wait_task = asyncio.create_task(process.wait())
            while not wait_task.done():
                try:
                    await asyncio.wait_for(asyncio.shield(wait_task), timeout=15)
                except asyncio.TimeoutError:
                    await self._write_event(
                        "heartbeat",
                        {"step": step_index, "label": label},
                    )

            await asyncio.gather(*output_tasks)
            code = await wait_task
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


def setup_handlers(web_app):
    """Register authenticated API handlers below Jupyter's configured base URL."""
    base_url = web_app.settings.get("base_url", "/")
    root_dir = web_app.settings["contents_manager"].root_dir
    manager = ExperimentManager(root_dir)
    telemetry_exporter = ScaphandreCsvExporter(root_dir)
    cim_client = CimDemoClient()
    reproducibility_manager = ReproducibilityManager(root_dir, FdmiDemoClient())
    orchestration_manager = OrchestrationManager(
        root_dir, FederationDemoClient(), CatalogueDemoClient()
    )
    namespace = url_path_join(base_url, "api", "jupyter-vre-workflow")
    web_app.add_handlers(
        ".*$",
        [
            (
                url_path_join(namespace, "experiments"),
                ExperimentsHandler,
                {"manager": manager},
            ),
            (
                url_path_join(namespace, "module-status"),
                ModuleStatusHandler,
                {"root_dir": root_dir},
            ),
            (
                url_path_join(namespace, "reproducibility", "cim", "connect"),
                CimConnectionHandler,
                {"client": cim_client, "manager": reproducibility_manager},
            ),
            (
                url_path_join(namespace, "reproducibility", "crate"),
                RoCrateHandler,
                {"manager": reproducibility_manager},
            ),
            (
                url_path_join(namespace, "reproducibility", "config"),
                ReproducibilityConfigHandler,
                {"manager": reproducibility_manager},
            ),
            (
                url_path_join(namespace, "reproducibility", "fdmi", "connect"),
                FdmiConnectionHandler,
                {"manager": reproducibility_manager},
            ),
            (
                url_path_join(namespace, "reproducibility", "publish"),
                FdmiPublishHandler,
                {"manager": reproducibility_manager},
            ),
            (
                url_path_join(namespace, "orchestration", "registration"),
                OrchestrationRegistrationHandler,
                {"manager": orchestration_manager},
            ),
            (
                url_path_join(namespace, "orchestration", "metadata"),
                OrchestrationMetadataHandler,
                {"manager": orchestration_manager},
            ),
            (
                url_path_join(namespace, "orchestration", "predictions"),
                OrchestrationPredictionHandler,
                {"manager": orchestration_manager},
            ),
            (
                url_path_join(namespace, "orchestration", "runs"),
                OrchestrationRunHandler,
                {"manager": orchestration_manager},
            ),
            (
                url_path_join(namespace, "orchestration", "catalogue"),
                WorkshopCatalogueHandler,
                {"manager": orchestration_manager, "experiment_manager": manager},
            ),
            (url_path_join(namespace, "run-install"), MetricsInstallHandler),
        ],
    )
    web_app.settings["jupyter_vre_workflow_telemetry_exporter"] = telemetry_exporter
    return telemetry_exporter
