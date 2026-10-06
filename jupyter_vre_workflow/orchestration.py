"""Persistent services for the Autumn School orchestration demonstration."""

import hashlib
import csv
import json
import os
import re
import asyncio
import time
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

    def get_orchestration(self, user, relative):
        local = self.select_metadata(user, relative)
        path = self.orchestration_path(user, local["experiment"]["id"])
        if path.is_file():
            return json.loads(path.read_text())
        return {
            "status": "idle", "target_site_id": None, "current_stage": None,
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
        prediction = next(
            (item for item in predictions.get("results", []) if item["site"]["id"] == target_site_id),
            None,
        )
        if prediction is None:
            raise ValueError("Select one site with a completed prediction")
        key = (self.user_key(user), local["experiment"]["id"])
        task = self.orchestration_tasks.get(key)
        if task is not None and not task.done():
            raise ValueError("A simulated rerun is already active")
        state = {
            "status": "running", "target_site_id": target_site_id,
            "current_stage": "Queued", "progress": 0, "log": [],
            "result": None, "comparison": None, "error": None,
            "comparison_path": None, "log_path": None,
            "simulated": True, "started_at": utc_now(), "completed_at": None,
            "actual_demo_elapsed_s": 0,
        }
        path = self.orchestration_path(user, local["experiment"]["id"])
        self._write_json(path, state)
        task = asyncio.create_task(
            self._run_orchestration(user, local, prediction, path)
        )
        self.orchestration_tasks[key] = task
        task.add_done_callback(lambda _task: self.orchestration_tasks.pop(key, None))
        return state

    async def _run_orchestration(self, user, local, prediction, path):
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
        total_weight = sum(weight for _, weight in stages)
        completed_weight = 0
        demo_start = time.monotonic()
        try:
            for label, weight in stages:
                state["current_stage"] = label
                entry = {
                    "stage": label, "started_at": utc_now(),
                    "relative_duration_weight": weight,
                    "planned_demo_delay_s": self.orchestration_stage_seconds * weight,
                    "simulated": True,
                }
                state["log"].append(entry)
                self._write_json(path, state)
                stage_start = time.monotonic()
                await asyncio.sleep(max(0, self.orchestration_stage_seconds * weight))
                entry["completed_at"] = utc_now()
                entry["actual_elapsed_s"] = round(time.monotonic() - stage_start, 6)
                completed_weight += weight
                state["progress"] = round(100 * completed_weight / total_weight)
                self._write_json(path, state)
            state["result"] = self._simulated_target_result(local, prediction)
            state["comparison"] = self._comparison(local, prediction, state["result"])
            state["status"] = "completed"
            state["current_stage"] = "Simulation complete; all results remain local"
            state["completed_at"] = utc_now()
            state["actual_demo_elapsed_s"] = round(time.monotonic() - demo_start, 6)
            folder = path.parent
            self._write_json(folder / "orchestration-log.json", {
                "experiment": local["experiment"], "target_site_id": prediction["site"]["id"],
                "simulated": True, "actual_demo_elapsed_s": state["actual_demo_elapsed_s"],
                "log": state["log"],
            })
            self._write_json(folder / "comparison.json", state["comparison"])
            state["log_path"] = str((folder / "orchestration-log.json").relative_to(self.root))
            state["comparison_path"] = str((folder / "comparison.json").relative_to(self.root))
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
