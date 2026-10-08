"""Persistent services for the Autumn School orchestration demonstration."""

import hashlib
import csv
import json
import os
import re
import shutil
import asyncio
import time
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen


SITES = [
    {"id": "GRNET", "name": "GRNET Athens", "country": "Greece", "flag": "🇬🇷", "lat": 37.986, "lon": 23.726, "pue": 1.48, "carbon_intensity_g_kwh": 380, "performance_factor": 1.00, "available": True},
    {"id": "NIKHEF", "name": "Nikhef", "country": "Netherlands", "flag": "🇳🇱", "lat": 52.357, "lon": 4.954, "pue": 1.35, "carbon_intensity_g_kwh": 185, "performance_factor": 1.20, "available": True},
    {"id": "CESNET", "name": "CESNET", "country": "Czech Republic", "flag": "🇨🇿", "lat": 50.077, "lon": 14.428, "pue": 1.42, "carbon_intensity_g_kwh": 510, "performance_factor": 0.92, "available": True},
    {"id": "KIT", "name": "KIT GridKa", "country": "Germany", "flag": "🇩🇪", "lat": 49.012, "lon": 8.411, "pue": 1.28, "carbon_intensity_g_kwh": 320, "performance_factor": 1.30, "available": True},
    {"id": "INFN-CNAF", "name": "INFN-CNAF", "country": "Italy", "flag": "🇮🇹", "lat": 44.493, "lon": 11.340, "pue": 1.50, "carbon_intensity_g_kwh": 235, "performance_factor": 1.08, "available": True},
    {"id": "IN2P3-CC", "name": "IN2P3-CC", "country": "France", "flag": "🇫🇷", "lat": 45.776, "lon": 4.828, "pue": 1.31, "carbon_intensity_g_kwh": 55, "performance_factor": 1.24, "available": True},
]


def utc_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class FederationDemoClient:
    ENDPOINT = "http://juvre-demo-federation:8080/v1/register"

    def __init__(self, endpoint=None, post_json=None):
        self.endpoint = endpoint if endpoint is not None else os.environ.get(
            "JUVRE_FEDERATION_URL", ""
        )
        self.post_json = post_json or self._post_json

    @staticmethod
    def _post_json(url, payload):
        request = Request(
            url,
            data=json.dumps(payload).encode(),
            method="POST",
            headers={"Content-Type": "application/json", "Accept": "application/json"},
        )
        try:
            with urlopen(request, timeout=5) as response:
                return json.load(response)
        except (OSError, URLError, ValueError) as error:
            raise RuntimeError(f"Federation endpoint unavailable: {error}") from error

    def register(self, payload):
        if self.endpoint:
            result = self.post_json(self.endpoint, payload)
        else:
            result = {
                "accepted": True,
                "membership_id": "GD-AS-DEMO-" + hashlib.sha256(
                    payload["user"].encode()
                ).hexdigest()[:10].upper(),
            }
        if not isinstance(result, dict) or not result.get("accepted"):
            raise RuntimeError("Federation registration was not accepted")
        return result

    def describe(self):
        return {
            "mode": "demo",
            "configured_endpoint": self.endpoint or "embedded://demo-federation",
            "kubernetes_service": self.ENDPOINT,
        }


class CatalogueDemoClient:
    ENDPOINT = "http://juvre-demo-federation:8080/v1/catalogue"

    def __init__(self, endpoint=None, post_json=None):
        self.endpoint = endpoint if endpoint is not None else os.environ.get(
            "JUVRE_CATALOGUE_URL", ""
        )
        self.post_json = post_json or FederationDemoClient._post_json

    def sync(self, payload):
        if self.endpoint:
            result = self.post_json(self.endpoint, payload)
        else:
            key = hashlib.sha256(
                f"{payload['user_key']}:{payload['experiment']['id']}".encode()
            ).hexdigest()[:16].upper()
            result = {"accepted": True, "catalogue_id": f"GD-AS-DEMO-{key}"}
        if not isinstance(result, dict) or not result.get("accepted"):
            raise RuntimeError("GD-AS-DEMO catalogue did not accept synchronisation")
        return result

    def describe(self):
        return {
            "mode": "GD-AS-DEMO demonstration catalogue",
            "configured_endpoint": self.endpoint or "embedded://demo-catalogue",
            "kubernetes_service": self.ENDPOINT,
        }


class OrchestrationManager:
    def __init__(self, root, federation_client=None, catalogue_client=None,
                 prediction_site_seconds=None, orchestration_stage_seconds=None):
        self.root = Path(root).resolve()
        self.federation_client = federation_client or FederationDemoClient()
        self.catalogue_client = catalogue_client or CatalogueDemoClient()
        self.prediction_site_seconds = (
            float(prediction_site_seconds)
            if prediction_site_seconds is not None
            else float(os.environ.get("JUVRE_PREDICTION_SITE_SECONDS", "75"))
        )
        self.prediction_tasks = {}
        self.prediction_cancellations = {}
        self.orchestration_stage_seconds = (
            float(orchestration_stage_seconds)
            if orchestration_stage_seconds is not None
            else float(os.environ.get("JUVRE_ORCHESTRATION_STAGE_SECONDS", "4"))
        )
        self.orchestration_tasks = {}

    @staticmethod
    def user_key(user):
        user = user.strip() if isinstance(user, str) else ""
        if not user:
            user = "local-user"
        slug = re.sub(r"[^a-zA-Z0-9._-]+", "-", user).strip("-") or "user"
        digest = hashlib.sha256(user.encode()).hexdigest()[:8]
        return f"{slug[:40]}-{digest}"

    @staticmethod
    def default_node_name(user):
        value = int(hashlib.sha256((user or "local-user").encode()).hexdigest()[:8], 16)
        return f"GD-DEMO-{value % 1000:03d}"

    def user_folder(self, user):
        folder = (self.root / "m3l2" / self.user_key(user)).resolve()
        m3l2 = (self.root / "m3l2").resolve()
        if m3l2 != folder.parent:
            raise ValueError("Invalid user scope")
        return folder

    def get_registration(self, user):
        folder = self.user_folder(user)
        path = folder / "registration.json"
        registration = json.loads(path.read_text()) if path.is_file() else None
        return {
            "user_key": self.user_key(user),
            "registered": registration is not None,
            "registration": registration,
            "default_node_name": self.default_node_name(user),
            "vo": "GD-AS-DEMO",
            "sites": SITES if registration else [SITES[0]],
            "selected_site_id": "GRNET",
            "federation": self.federation_client.describe(),
            "demo_notice": "Federation membership and site availability are stable demo data.",
        }

    def register(self, user, data):
        required = {"node_name", "site", "operator", "contact"}
        if not isinstance(data, dict) or not required.issubset(data):
            raise ValueError("Node name, site, operator and contact are required")
        clean = {}
        for key in required:
            value = data[key]
            if not isinstance(value, str) or not value.strip() or len(value) > 160:
                raise ValueError(f"Invalid registration field: {key}")
            clean[key] = value.strip()
        if not re.fullmatch(r"GD-DEMO-[A-Z0-9-]{3,32}", clean["node_name"]):
            raise ValueError("Node name must use the GD-DEMO-… format")
        payload = {"user": user or "local-user", "vo": "GD-AS-DEMO", **clean}
        receipt = self.federation_client.register(payload)
        registration = {
            **payload,
            "membership_id": receipt["membership_id"],
            "registered_at": utc_now(),
            "simulated": True,
        }
        folder = self.user_folder(user)
        folder.mkdir(parents=True, exist_ok=True)
        self._write_json(folder / "registration.json", registration)
        return self.get_registration(user)

    def resolve_experiment(self, relative):
        if not isinstance(relative, str) or not relative or Path(relative).is_absolute():
            raise ValueError("Expected an experiment path relative to the Jupyter root")
        folder = (self.root / relative).resolve()
        if self.root not in folder.parents or not (folder / "run.json").is_file():
            raise ValueError("Experiment does not exist")
        return folder

    def experiment_folder(self, user, experiment_id):
        safe_id = re.sub(r"[^a-zA-Z0-9._-]+", "-", str(experiment_id)).strip("-")
        if not safe_id:
            raise ValueError("Experiment has no usable identifier")
        return self.user_folder(user) / "experiments" / safe_id

    def catalogue_folder(self):
        folder = self.root / "juvre" / "lab-catalogue"
        folder.mkdir(parents=True, exist_ok=True)
        return folder

    def share_experiment(self, user, relative, display_name=None):
        registration = self.get_registration(user)
        if not registration["registered"]:
            raise ValueError("Register this node before sharing an experiment")
        source = self.resolve_experiment(relative)
        run = json.loads((source / "run.json").read_text())
        run_id = str(run.get("id") or "")
        if not run_id:
            raise ValueError("Experiment has no run ID")
        catalogue_id = hashlib.sha256(
            f"{registration['user_key']}:{run_id}".encode()
        ).hexdigest()[:20]
        target = self.catalogue_folder() / catalogue_id
        target.mkdir(parents=True, exist_ok=True)
        allowed = [
            run.get("artifacts", {}).get("input", "notebook.ipynb"),
            run.get("artifacts", {}).get("output", "executed.ipynb"),
            run.get("artifacts", {}).get("metrics", "metrics.csv"),
            "ro-crate-metadata.json", "cim-record.json", "eimps-cloud.json",
        ]
        files = []
        for name in allowed:
            candidate = source / name
            if candidate.is_file() and candidate.parent == source:
                shutil.copy2(candidate, target / name)
                files.append({
                    "name": name,
                    "sha256": hashlib.sha256(candidate.read_bytes()).hexdigest(),
                    "size": candidate.stat().st_size,
                })
        public_run = {
            key: run.get(key)
            for key in (
                "schema_version", "id", "workflow_id", "status", "start_time",
                "end_time", "kernel_name", "input_sha256", "output_sha256",
                "artifacts", "telemetry",
            )
        }
        self._write_json(target / "run.json", public_run)
        files.append({
            "name": "run.json",
            "sha256": hashlib.sha256((target / "run.json").read_bytes()).hexdigest(),
            "size": (target / "run.json").stat().st_size,
        })
        manifest = {
            "schema_version": 1,
            "catalogue_id": catalogue_id,
            "shared": True,
            "shared_at": utc_now(),
            "owner_display_name": (display_name or registration["registration"]["operator"])[:160],
            "owner_key": registration["user_key"],
            "run_id": run_id,
            "title": run.get("workflow_id") or run_id,
            "date": run.get("end_time") or run.get("start_time"),
            "source_site": registration["registration"]["site"],
            "crate_valid": (target / "ro-crate-metadata.json").is_file(),
            "files": files,
        }
        self._write_json(target / "manifest.json", manifest)
        return manifest

    def catalogue(self):
        records = []
        submissions_path = self.root / "juvre" / "fdmi" / "orchestration-submissions.json"
        submissions = (
            json.loads(submissions_path.read_text())
            if submissions_path.is_file()
            else []
        )
        for path in self.catalogue_folder().glob("*/manifest.json"):
            try:
                record = json.loads(path.read_text())
                record["site_results"] = [
                    item for item in submissions
                    if item["original_experiment_id"] == record["run_id"]
                    and not item.get("stale")
                ]
                records.append(record)
            except (OSError, ValueError):
                continue
        return sorted(records, key=lambda item: item.get("shared_at", ""), reverse=True)

    def bundle_path(self, catalogue_id):
        if not re.fullmatch(r"[a-f0-9]{20}", str(catalogue_id)):
            raise ValueError("Invalid catalogue identifier")
        folder = self.catalogue_folder() / catalogue_id
        manifest_path = folder / "manifest.json"
        if not manifest_path.is_file():
            raise ValueError("Shared experiment does not exist")
        bundle = folder / f"{catalogue_id}.zip"
        manifest = json.loads(manifest_path.read_text())
        with zipfile.ZipFile(bundle, "w", zipfile.ZIP_DEFLATED) as archive:
            archive.write(manifest_path, "manifest.json")
            for item in manifest["files"]:
                archive.write(folder / item["name"], item["name"])
        return bundle

    def shared_result_bundle(self, attempt_id):
        result = next(
            (
                item
                for record in self.catalogue()
                for item in record.get("site_results", [])
                if item["attempt_id"] == attempt_id
            ),
            None,
        )
        if result is None:
            raise ValueError("Shared site result does not exist")
        path = (self.root / result["bundle_path"]).resolve()
        if self.root not in path.parents or not path.is_file():
            raise ValueError("Shared site result bundle is unavailable")
        return path

    def import_shared(self, user, catalogue_id):
        folder = self.catalogue_folder() / str(catalogue_id)
        manifest = json.loads((folder / "manifest.json").read_text())
        for item in manifest["files"]:
            source = folder / item["name"]
            if hashlib.sha256(source.read_bytes()).hexdigest() != item["sha256"]:
                raise ValueError(f"Hash verification failed for {item['name']}")
        target = self.root / "juvre" / "imports" / self.user_key(user) / str(catalogue_id)
        if not target.exists():
            target.mkdir(parents=True)
            for item in manifest["files"]:
                shutil.copy2(folder / item["name"], target / item["name"])
            self._write_json(target / "import.json", {
                "source_catalogue_id": catalogue_id,
                "source_run_id": manifest["run_id"],
                "imported_at": utc_now(),
                "verified": True,
                "dependencies": ["Jupyter kernel declared by notebook metadata"],
                "missing_inputs": ["External notebook inputs are not included unless listed in the manifest"],
            })
        return {
            "path": str(target.relative_to(self.root)),
            "notebook_path": str((target / "notebook.ipynb").relative_to(self.root)),
            "verified": True,
            "dependencies": ["Jupyter kernel declared by notebook metadata"],
            "missing_inputs": ["External notebook inputs must be supplied separately"],
            "source_run_id": manifest["run_id"],
        }

    @staticmethod
    def _parse_time(value):
        if not value:
            return None
        return datetime.fromisoformat(value.replace("Z", "+00:00"))

    def select_metadata(self, user, relative):
        registration = self.get_registration(user)
        if not registration["registered"]:
            raise ValueError("Register this node before selecting metadata")
        source_folder = self.resolve_experiment(relative)
        run = json.loads((source_folder / "run.json").read_text())
        missing = []
        if run.get("status") != "succeeded":
            missing.append("a successful run status")
        start = self._parse_time(run.get("start_time"))
        end = self._parse_time(run.get("end_time"))
        runtime_s = (end - start).total_seconds() if start and end else None
        if runtime_s is None or runtime_s <= 0:
            missing.append("valid start and end timestamps")
        artifacts = run.get("artifacts", {})
        for key, fallback in (("input", "notebook.ipynb"), ("output", "executed.ipynb")):
            if not (source_folder / artifacts.get(key, fallback)).is_file():
                missing.append(f"{key} notebook artefact")

        metrics_path = source_folder / artifacts.get("metrics", "metrics.csv")
        metric_names = set()
        final_energy_j = None
        average_power_w = None
        if metrics_path.is_file():
            with metrics_path.open(newline="") as stream:
                for row in csv.DictReader(stream):
                    name = row.get("metric")
                    if name:
                        metric_names.add(name)
                    try:
                        value = float(row.get("value", ""))
                    except (TypeError, ValueError):
                        continue
                    if name == "energy_j":
                        final_energy_j = value
                    elif name == "average_power_w":
                        average_power_w = value
        crate_path = source_folder / "ro-crate-metadata.json"
        source = (
            "local RO-Crate plus run.json and metrics.csv"
            if crate_path.is_file()
            else "local run.json and metrics.csv"
        )
        local = {
            "user_key": registration["user_key"],
            "experiment_path": relative,
            "experiment": {
                "id": run.get("id"),
                "workflow_id": run.get("workflow_id"),
                "status": run.get("status"),
                "runtime_s": runtime_s,
            },
            "source": source,
            "ro_crate_available": crate_path.is_file(),
            "metrics_available": sorted(metric_names),
            "measurements": {
                "energy_j": final_energy_j,
                "average_power_w": average_power_w,
            },
            "minimum_ready": not missing,
            "missing": missing,
            "selected_at": utc_now(),
            "sync": None,
        }
        target = self.experiment_folder(user, run.get("id"))
        target.mkdir(parents=True, exist_ok=True)
        saved = target / "metadata.json"
        if saved.is_file():
            prior = json.loads(saved.read_text())
            if prior.get("experiment_path") == relative:
                local["sync"] = prior.get("sync")
        self._write_json(saved, local)
        return self._metadata_response(local)

    def sync_metadata(self, user, relative):
        local = self.select_metadata(user, relative)
        if not local["minimum_ready"]:
            raise ValueError("Experiment metadata is incomplete: " + ", ".join(local["missing"]))
        payload = {
            "vo": "GD-AS-DEMO",
            "user_key": local["user_key"],
            "experiment": local["experiment"],
            "source": local["source"],
        }
        result = self.catalogue_client.sync(payload)
        folder = self.experiment_folder(user, local["experiment"]["id"])
        saved = json.loads((folder / "metadata.json").read_text())
        saved["sync"] = {
            "catalogue_id": result["catalogue_id"],
            "synced_at": utc_now(),
            "target": self.catalogue_client.describe(),
            "simulated": True,
        }
        self._write_json(folder / "metadata.json", saved)
        self._write_json(folder / "catalogue.json", {"payload": payload, **saved["sync"]})
        return self._metadata_response(saved)

    def prediction_path(self, user, experiment_id):
        return self.experiment_folder(user, experiment_id) / "predictions.json"

    def get_prediction(self, user, relative):
        local = self.select_metadata(user, relative)
        path = self.prediction_path(user, local["experiment"]["id"])
        if path.is_file():
            return json.loads(path.read_text())
        return {
            "status": "idle", "queue": [], "results": [], "current_site": None,
            "current_stage": None, "progress": 0, "error": None,
            "assumptions": self._prediction_assumptions(local),
        }

    def start_prediction(self, user, relative, site_ids):
        local = self.select_metadata(user, relative)
        if not local["minimum_ready"]:
            raise ValueError("Experiment metadata is incomplete: " + ", ".join(local["missing"]))
        if not isinstance(site_ids, list) or not site_ids:
            raise ValueError("Select at least one demo site")
        known = {site["id"] for site in SITES}
        if len(set(site_ids)) != len(site_ids) or any(site not in known for site in site_ids):
            raise ValueError("Site selection contains an unsupported or duplicate site")
        key = (self.user_key(user), local["experiment"]["id"])
        existing = self.prediction_tasks.get(key)
        if existing is not None and not existing.done():
            raise ValueError("A prediction queue is already running")
        state = {
            "status": "queued",
            "queue": [{"site_id": site_id, "status": "queued"} for site_id in site_ids],
            "results": [], "current_site": None, "current_stage": None,
            "progress": 0, "error": None, "started_at": utc_now(),
            "completed_at": None,
            "assumptions": self._prediction_assumptions(local),
        }
        path = self.prediction_path(user, local["experiment"]["id"])
        path.parent.mkdir(parents=True, exist_ok=True)
        self._write_json(path, state)
        cancellation = asyncio.Event()
        self.prediction_cancellations[key] = cancellation
        task = asyncio.create_task(
            self._run_prediction(user, relative, local, site_ids, cancellation)
        )
        self.prediction_tasks[key] = task
        task.add_done_callback(lambda _task: self.prediction_tasks.pop(key, None))
        return state

    def cancel_prediction(self, user, relative):
        local = self.select_metadata(user, relative)
        key = (self.user_key(user), local["experiment"]["id"])
        cancellation = self.prediction_cancellations.get(key)
        if cancellation is None:
            raise ValueError("No prediction queue is running")
        cancellation.set()
        return self.get_prediction(user, relative)

    async def _run_prediction(self, user, relative, local, site_ids, cancellation):
        path = self.prediction_path(user, local["experiment"]["id"])
        state = json.loads(path.read_text())
        stages = [
            "Preparing experiment metadata",
            "Estimating simulated training",
            "Estimating simulated inference",
            "Calculating site results",
        ]
        total_steps = len(site_ids) * len(stages)
        completed_steps = 0
        try:
            state["status"] = "running"
            for index, site_id in enumerate(site_ids):
                site = next(site for site in SITES if site["id"] == site_id)
                state["current_site"] = site_id
                state["queue"][index]["status"] = "running"
                for stage in stages:
                    if cancellation.is_set():
                        state["status"] = "cancelled"
                        state["queue"][index]["status"] = "cancelled"
                        state["current_stage"] = "Cancelled by participant"
                        state["completed_at"] = utc_now()
                        self._write_json(path, state)
                        return
                    state["current_stage"] = stage
                    state["progress"] = round(100 * completed_steps / total_steps)
                    self._write_json(path, state)
                    await asyncio.sleep(max(0, self.prediction_site_seconds / len(stages)))
                    completed_steps += 1
                state["results"].append(self._estimate_site(local, site))
                state["queue"][index]["status"] = "completed"
                state["progress"] = round(100 * completed_steps / total_steps)
                self._write_json(path, state)
            state["status"] = "completed"
            state["current_site"] = None
            state["current_stage"] = "Saved predictions locally"
            state["progress"] = 100
            state["completed_at"] = utc_now()
        except Exception as error:
            state["status"] = "failed"
            state["error"] = str(error)
            state["completed_at"] = utc_now()
        finally:
            self._write_json(path, state)

    @staticmethod
    def _prediction_assumptions(local):
        measurements = local["measurements"]
        runtime = local["experiment"]["runtime_s"]
        if measurements["average_power_w"] is not None:
            power = measurements["average_power_w"]
            power_source = "measured average_power_w"
        elif measurements["energy_j"] is not None and runtime:
            power = measurements["energy_j"] / runtime
            power_source = "derived from measured energy_j / runtime"
        else:
            power = 120.0
            power_source = "demo assumption: 120 W IT power because no usable power or energy metric exists"
        return {
            "base_runtime_s": runtime,
            "base_it_power_w": power,
            "power_source": power_source,
            "training_duration": "measured runtime divided by stable site performance factor",
            "inference_duration": "15% of site training duration, minimum 5 seconds",
            "inference_power": "65% of training IT power",
            "energy_boundary": "IT energy only before PUE; source telemetry is treated as IT/component energy",
            "facility_formula": "facility kWh = IT kWh × site PUE (applied once)",
            "emissions_formula": "gCO2e = facility kWh × demo carbon intensity gCO2e/kWh",
            "assessment_scope": "Operational estimate only; not live grid data and not a full SCI assessment",
        }

    @staticmethod
    def _workload_result(duration_s, power_w, site):
        it_kwh = power_w * duration_s / 3_600_000
        facility_kwh = it_kwh * site["pue"]
        emissions_g = facility_kwh * site["carbon_intensity_g_kwh"]
        return {
            "duration_s": round(duration_s, 6),
            "it_power_w": round(power_w, 6),
            "it_energy_kwh": round(it_kwh, 9),
            "facility_energy_kwh": round(facility_kwh, 9),
            "operational_emissions_gco2e": round(emissions_g, 6),
        }

    def _estimate_site(self, local, site):
        assumptions = self._prediction_assumptions(local)
        training_duration = assumptions["base_runtime_s"] / site["performance_factor"]
        inference_duration = max(5.0, training_duration * 0.15)
        power = assumptions["base_it_power_w"]
        return {
            "site": site,
            "status": "completed",
            "simulated": True,
            "inputs": {
                "base_runtime_s": assumptions["base_runtime_s"],
                "base_it_power_w": power,
                "performance_factor": site["performance_factor"],
                "pue": site["pue"],
                "carbon_intensity_g_kwh": site["carbon_intensity_g_kwh"],
            },
            "assumptions": assumptions,
            "training": self._workload_result(training_duration, power, site),
            "inference": self._workload_result(inference_duration, power * 0.65, site),
        }

    def orchestration_path(self, user, experiment_id):
        return self.experiment_folder(user, experiment_id) / "orchestration.json"

    def _attempt(self, user, relative, attempt_id):
        local = self.select_metadata(user, relative)
        path = self.orchestration_path(user, local["experiment"]["id"])
        if not path.is_file():
            raise ValueError("No orchestration attempts exist for this experiment")
        state = json.loads(path.read_text())
        attempt = next(
            (item for item in state.get("attempts", []) if item["attempt_id"] == attempt_id),
            None,
        )
        if attempt is None:
            raise ValueError("Site attempt does not exist")
        if attempt["status"] != "completed":
            raise ValueError("Only completed site attempts can be packaged")
        return local, path, state, attempt

    def prepare_result_bundle(self, user, relative, attempt_id, downloaded=False):
        local, state_path, state, attempt = self._attempt(
            user, relative, attempt_id
        )
        source_folder = self.resolve_experiment(relative)
        prediction_state = json.loads(
            self.prediction_path(user, local["experiment"]["id"]).read_text()
        )
        prediction = next(
            item
            for item in prediction_state["results"]
            if item["site"]["id"] == attempt["site_id"]
        )
        source_records = {}
        for name in ("cim-record.json", "eimps-cloud.json"):
            path = source_folder / name
            if path.is_file():
                source_records[name] = hashlib.sha256(path.read_bytes()).hexdigest()
        source_revision = hashlib.sha256(
            json.dumps(
                {
                    "result": attempt["result"],
                    "log": attempt["log"],
                    "prediction": prediction,
                    "source_records": source_records,
                },
                sort_keys=True,
            ).encode()
        ).hexdigest()
        existing = attempt.get("bundle") or {}
        bundle_path = self.root / existing.get("path", "missing")
        if existing.get("source_revision") == source_revision and bundle_path.is_file():
            if downloaded:
                attempt["bundle"]["downloaded_at"] = utc_now()
                self._write_json(state_path, state)
            return attempt["bundle"]

        safe_attempt = re.sub(r"[^a-zA-Z0-9._-]+", "-", attempt_id)
        folder = state_path.parent / "attempts" / safe_attempt
        folder.mkdir(parents=True, exist_ok=True)
        values = {
            "result.json": attempt["result"],
            "site.json": attempt["result"]["site"],
            "prediction.json": prediction,
            "execution-log.json": {
                "attempt_id": attempt_id,
                "simulated": True,
                "entries": attempt["log"],
            },
            "provenance.json": {
                "schema_version": 1,
                "attempt_id": attempt_id,
                "original_experiment_id": local["experiment"]["id"],
                "original_experiment_path": relative,
                "selected_site_id": attempt["site_id"],
                "prediction_source": "predictions.json",
                "cim_record": "cim-record.json" if "cim-record.json" in source_records else None,
                "eimps_record": "eimps-cloud.json" if "eimps-cloud.json" in source_records else None,
                "mode": "simulated",
                "statement": "No VM, remote notebook execution, or remote scientific output was produced.",
            },
        }
        for name, value in values.items():
            self._write_json(folder / name, value)
        for name in source_records:
            shutil.copy2(source_folder / name, folder / name)
        payload_names = [*values, *source_records]
        checksums = {
            name: hashlib.sha256((folder / name).read_bytes()).hexdigest()
            for name in payload_names
        }
        crate_name = "ro-crate-metadata.json"
        generated = utc_now()
        crate = {
            "@context": "https://w3id.org/ro/crate/1.1/context",
            "@graph": [
                {
                    "@id": crate_name,
                    "@type": "CreativeWork",
                    "about": {"@id": "./"},
                    "conformsTo": {"@id": "https://w3id.org/ro/crate/1.1"},
                },
                {
                    "@id": "./",
                    "@type": "Dataset",
                    "name": f"Simulated JuVRE result for {attempt['site_id']}",
                    "description": "A simulated orchestration result bundle; no remote notebook was executed.",
                    "datePublished": generated,
                    "identifier": attempt_id,
                    "hasPart": [{"@id": name} for name in payload_names],
                    "mentions": {"@id": "#attempt"},
                },
                {
                    "@id": "#attempt",
                    "@type": "CreateAction",
                    "identifier": attempt_id,
                    "name": "Simulated multi-site orchestration attempt",
                    "actionStatus": {"@id": "https://schema.org/CompletedActionStatus"},
                    "object": {"@id": "prediction.json"},
                    "result": {"@id": "result.json"},
                    "location": {"@id": "site.json"},
                    "isBasedOn": [
                        {"@id": f"urn:juvre:experiment:{local['experiment']['id']}"},
                        *({"@id": name} for name in source_records),
                    ],
                },
                *[
                    {
                        "@id": name,
                        "@type": "File",
                        "encodingFormat": "application/json",
                        "sha256": checksums[name],
                    }
                    for name in payload_names
                ],
            ],
        }
        self._write_json(folder / crate_name, crate)
        checksums[crate_name] = hashlib.sha256(
            (folder / crate_name).read_bytes()
        ).hexdigest()
        manifest = {
            "schema_version": 1,
            "attempt_id": attempt_id,
            "original_experiment_id": local["experiment"]["id"],
            "site_id": attempt["site_id"],
            "simulated": True,
            "source_revision": source_revision,
            "files": [
                {"name": name, "sha256": digest}
                for name, digest in sorted(checksums.items())
            ],
            "omitted": [
                "executed notebook: no remote execution occurred",
                "scientific outputs: none were produced by the simulation",
            ],
        }
        self._write_json(folder / "manifest.json", manifest)
        bundle_hash = hashlib.sha256(
            json.dumps(manifest, sort_keys=True).encode()
        ).hexdigest()
        archive_path = folder / f"{safe_attempt}.zip"
        with zipfile.ZipFile(archive_path, "w", zipfile.ZIP_DEFLATED) as archive:
            archive.write(folder / "manifest.json", "manifest.json")
            for name in checksums:
                archive.write(folder / name, name)
        attempt["bundle"] = {
            "status": "ready",
            "path": str(archive_path.relative_to(self.root)),
            "sha256": bundle_hash,
            "source_revision": source_revision,
            "generated_at": generated,
            "downloaded_at": utc_now() if downloaded else None,
            "simulated": True,
        }
        if attempt.get("fdmi") and attempt["fdmi"].get("bundle_sha256") != bundle_hash:
            attempt["fdmi"]["stale"] = True
        self._write_json(state_path, state)
        return attempt["bundle"]

    def submit_result_fdmi(self, user, relative, attempt_id):
        bundle = self.prepare_result_bundle(user, relative, attempt_id)
        local, state_path, state, attempt = self._attempt(user, relative, attempt_id)
        store_path = self.root / "juvre" / "fdmi" / "orchestration-submissions.json"
        store_path.parent.mkdir(parents=True, exist_ok=True)
        records = json.loads(store_path.read_text()) if store_path.is_file() else []
        existing = next(
            (
                item for item in records
                if item["attempt_id"] == attempt_id
                and item["bundle_sha256"] == bundle["sha256"]
            ),
            None,
        )
        if existing is None:
            versions = [item["version"] for item in records if item["attempt_id"] == attempt_id]
            for item in records:
                if item["attempt_id"] == attempt_id:
                    item["stale"] = True
            version = max(versions, default=0) + 1
            key = hashlib.sha256(f"{attempt_id}:{bundle['sha256']}".encode()).hexdigest()
            existing = {
                "attempt_id": attempt_id,
                "original_experiment_id": local["experiment"]["id"],
                "site_id": attempt["site_id"],
                "prediction_record": f"{bundle['path']}#prediction.json",
                "cim_record": f"{relative}/cim-record.json" if (self.resolve_experiment(relative) / "cim-record.json").is_file() else None,
                "eimps_record": f"{relative}/eimps-cloud.json" if (self.resolve_experiment(relative) / "eimps-cloud.json").is_file() else None,
                "bundle_sha256": bundle["sha256"],
                "bundle_path": bundle["path"],
                "version": version,
                "receipt": f"FDMI-SIM-{key[:16].upper()}",
                "submitted_at": utc_now(),
                "simulated": True,
                "stale": False,
            }
            records.append(existing)
            self._write_json(store_path, records)
        attempt["fdmi"] = dict(existing)
        self._write_json(state_path, state)
        return attempt["fdmi"]

    def result_bundle_path(self, user, relative, attempt_id):
        bundle = self.prepare_result_bundle(
            user, relative, attempt_id, downloaded=True
        )
        return self.root / bundle["path"]

    def result_review(self, user, relative, attempt_id):
        bundle = self.prepare_result_bundle(user, relative, attempt_id)
        local, _, _, attempt = self._attempt(user, relative, attempt_id)
        return {
            "attempt_id": attempt_id,
            "original_experiment_id": local["experiment"]["id"],
            "site_id": attempt["site_id"],
            "bundle_sha256": bundle["sha256"],
            "bundle_path": bundle["path"],
            "simulated": True,
            "fdmi": attempt.get("fdmi"),
        }

    def get_orchestration(self, user, relative):
        local = self.select_metadata(user, relative)
        path = self.orchestration_path(user, local["experiment"]["id"])
        if path.is_file():
            return json.loads(path.read_text())
        return {
            "status": "idle", "target_site_id": None, "target_site_ids": [],
            "attempts": [], "concurrency_limit": 3, "current_stage": None,
            "progress": 0, "log": [], "result": None, "comparison": None,
            "comparison_path": None, "log_path": None,
            "error": None, "simulated": True,
        }

    def start_orchestration(self, user, relative, target_site_id):
        local = self.select_metadata(user, relative)
        predictions_path = self.prediction_path(user, local["experiment"]["id"])
        if not predictions_path.is_file():
            raise ValueError("Generate site predictions before simulating orchestration")
        predictions = json.loads(predictions_path.read_text())
        target_site_ids = (
            target_site_id if isinstance(target_site_id, list) else [target_site_id]
        )
        if not target_site_ids or len(target_site_ids) > 3:
            raise ValueError("Select between one and three predicted sites")
        available = {
            item["site"]["id"]: item for item in predictions.get("results", [])
        }
        if len(set(target_site_ids)) != len(target_site_ids) or any(
            site_id not in available for site_id in target_site_ids
        ):
            raise ValueError("Every target must have a completed prediction")
        selected = [available[site_id] for site_id in target_site_ids]
        key = (self.user_key(user), local["experiment"]["id"])
        task = self.orchestration_tasks.get(key)
        if task is not None and not task.done():
            raise ValueError("A simulated rerun is already active")
        state = {
            "status": "running", "target_site_id": target_site_ids[0],
            "target_site_ids": target_site_ids, "concurrency_limit": 3,
            "current_stage": "Queued", "progress": 0, "log": [],
            "result": None, "comparison": None, "error": None,
            "comparison_path": None, "log_path": None,
            "simulated": True, "started_at": utc_now(), "completed_at": None,
            "actual_demo_elapsed_s": 0,
            "attempts": [
                {
                    "attempt_id": f"{local['experiment']['id']}-{item['site']['id']}-{int(time.time() * 1000)}",
                    "site_id": item["site"]["id"], "status": "queued",
                    "progress": 0, "log": [], "result": None,
                    "comparison": None, "error": None, "simulated": True,
                    "started_at": None, "completed_at": None,
                }
                for item in selected
            ],
        }
        path = self.orchestration_path(user, local["experiment"]["id"])
        self._write_json(path, state)
        task = asyncio.create_task(
            self._run_orchestration(user, local, selected, path)
        )
        self.orchestration_tasks[key] = task
        task.add_done_callback(lambda _task: self.orchestration_tasks.pop(key, None))
        return state

    async def _run_orchestration(self, user, local, predictions, path):
        state = json.loads(path.read_text())
        stages = [
            ("Preparing the local package", 1),
            ("Sending metadata to the target", 3),
            ("Requesting simulated resources", 2),
            ("Preparing the virtual execution environment", 4),
            ("Starting simulated training", 1),
            ("Running simulated inference", 1),
            ("Collecting simulated outputs", 2),
            ("Saving results locally", 1),
        ]
        demo_start = time.monotonic()
        folder = path.parent

        async def run_attempt(index, prediction):
            attempt = state["attempts"][index]
            attempt["status"] = "running"
            attempt["started_at"] = utc_now()
            completed_weight = 0
            total_weight = sum(weight for _, weight in stages)
            for label, weight in stages:
                state["current_stage"] = f"{prediction['site']['id']}: {label}"
                entry = {
                    "stage": label, "started_at": utc_now(),
                    "relative_duration_weight": weight,
                    "planned_demo_delay_s": self.orchestration_stage_seconds * weight,
                    "simulated": True,
                }
                attempt["log"].append(entry)
                self._write_json(path, state)
                stage_start = time.monotonic()
                await asyncio.sleep(max(0, self.orchestration_stage_seconds * weight))
                entry["completed_at"] = utc_now()
                entry["actual_elapsed_s"] = round(time.monotonic() - stage_start, 6)
                completed_weight += weight
                attempt["progress"] = round(100 * completed_weight / total_weight)
                state["progress"] = round(
                    sum(item["progress"] for item in state["attempts"])
                    / len(state["attempts"])
                )
                self._write_json(path, state)
            attempt["result"] = self._simulated_target_result(local, prediction)
            attempt["comparison"] = self._comparison(
                local, prediction, attempt["result"]
            )
            attempt["status"] = "completed"
            attempt["progress"] = 100
            attempt["completed_at"] = utc_now()
            prefix = prediction["site"]["id"].lower()
            log_path = folder / f"{prefix}-simulation-log.json"
            comparison_path = folder / f"{prefix}-comparison.json"
            result_path = folder / f"{prefix}-simulation-result.json"
            self._write_json(log_path, {"attempt": attempt["attempt_id"], "simulated": True, "log": attempt["log"]})
            self._write_json(comparison_path, attempt["comparison"])
            self._write_json(result_path, attempt["result"])
            attempt["log_path"] = str(log_path.relative_to(self.root))
            attempt["comparison_path"] = str(comparison_path.relative_to(self.root))
            attempt["result_path"] = str(result_path.relative_to(self.root))

        async def guarded(index, prediction):
            try:
                await run_attempt(index, prediction)
            except asyncio.CancelledError:
                state["attempts"][index]["status"] = "cancelled"
                raise
            except Exception as error:
                state["attempts"][index]["status"] = "failed"
                state["attempts"][index]["error"] = str(error)
                state["attempts"][index]["completed_at"] = utc_now()

        try:
            await asyncio.gather(
                *(guarded(index, prediction) for index, prediction in enumerate(predictions))
            )
            completed = [
                item for item in state["attempts"] if item["status"] == "completed"
            ]
            failed = [item for item in state["attempts"] if item["status"] == "failed"]
            if completed:
                state["result"] = completed[0]["result"]
                state["comparison"] = completed[0]["comparison"]
                state["log"] = completed[0]["log"]
                self._write_json(folder / "orchestration-log.json", {
                    "experiment": local["experiment"],
                    "target_site_id": completed[0]["site_id"],
                    "simulated": True,
                    "log": completed[0]["log"],
                })
                self._write_json(folder / "comparison.json", completed[0]["comparison"])
                state["log_path"] = str((folder / "orchestration-log.json").relative_to(self.root))
                state["comparison_path"] = str((folder / "comparison.json").relative_to(self.root))
            state["status"] = "completed"
            if failed:
                state["status"] = "partial"
            state["current_stage"] = "Simulations complete; all results remain local"
            state["completed_at"] = utc_now()
            state["progress"] = 100
            state["actual_demo_elapsed_s"] = round(time.monotonic() - demo_start, 6)
            state["bundle_path"] = str(path.relative_to(self.root))
        except Exception as error:
            state["status"] = "failed"
            state["error"] = str(error)
            state["completed_at"] = utc_now()
            state["actual_demo_elapsed_s"] = round(time.monotonic() - demo_start, 6)
        finally:
            self._write_json(path, state)

    @staticmethod
    def _simulated_target_result(local, prediction):
        seed = int(hashlib.sha256(
            f"{local['experiment']['id']}:{prediction['site']['id']}".encode()
        ).hexdigest()[:8], 16)
        duration_factor = 0.97 + (seed % 7) / 100
        power_factor = 0.98 + ((seed // 7) % 6) / 100
        site = prediction["site"]
        power = prediction["inputs"]["base_it_power_w"] * power_factor
        training = OrchestrationManager._workload_result(
            prediction["training"]["duration_s"] * duration_factor, power, site
        )
        inference = OrchestrationManager._workload_result(
            prediction["inference"]["duration_s"] * duration_factor, power * 0.65, site
        )
        return {
            "site": site, "training": training, "inference": inference,
            "modelled_workload_duration_s": round(training["duration_s"] + inference["duration_s"], 6),
            "deterministic_factors": {
                "duration_factor": duration_factor, "power_factor": power_factor,
            },
            "assumptions": prediction["assumptions"],
            "simulated": True,
            "result_location": "local m3l2 folder; no remote outputs were retrieved",
        }

    @staticmethod
    def _comparison(local, prediction, target):
        runtime = local["experiment"]["runtime_s"]
        energy_j = local["measurements"]["energy_j"]
        power = local["measurements"]["average_power_w"]
        if energy_j is not None:
            original_it = energy_j / 3_600_000
        elif power is not None and runtime:
            original_it = power * runtime / 3_600_000
        else:
            original_it = None
        return {
            "schema_version": 1, "generated_at": utc_now(), "simulated": True,
            "experiment_id": local["experiment"]["id"],
            "original": {
                "site": "local source node", "training_duration_s": runtime,
                "inference_duration_s": None, "it_energy_kwh": original_it,
                "facility_energy_kwh": None, "operational_emissions_gco2e": None,
                "pue": None, "carbon_intensity_g_kwh": None,
                "assumptions": ["Original run does not distinguish training from inference", "Facility overhead and operational emissions unavailable without source-site PUE and carbon intensity"],
            },
            "prediction": {"site": prediction["site"], "training": prediction["training"], "inference": prediction["inference"], "assumptions": prediction["assumptions"]},
            "simulated_target_run": target,
            "notice": "Local comparison of an original run, stable prediction and deterministic simulated target run; no remote execution or result retrieval occurred.",
        }

    @staticmethod
    def _metadata_response(local):
        result = dict(local)
        result["metadata_status"] = "Local and online" if local.get("sync") else "Local"
        result["online_definition"] = "Online means present in the GD-AS-DEMO demonstration catalogue, not FDMI."
        return result

    @staticmethod
    def _write_json(path, value):
        temporary = path.with_suffix(path.suffix + ".tmp")
        temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")
        temporary.replace(path)
