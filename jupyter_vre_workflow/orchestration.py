"""Persistent services for the Autumn School orchestration demonstration."""

import hashlib
import csv
import json
import os
import re
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
    ENDPOINT = "http://juvre-mock-federation:8080/v1/register"

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
            raise RuntimeError(f"Mock federation endpoint unavailable: {error}") from error

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
            raise RuntimeError("Mock federation rejected the registration")
        return result

    def describe(self):
        return {
            "mode": "mock",
            "configured_endpoint": self.endpoint or "embedded://mock-federation",
            "kubernetes_service": self.ENDPOINT,
        }


class CatalogueDemoClient:
    ENDPOINT = "http://juvre-mock-federation:8080/v1/catalogue"

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
            raise RuntimeError("Mock GD-AS-DEMO catalogue rejected synchronisation")
        return result

    def describe(self):
        return {
            "mode": "mock GD-AS-DEMO catalogue",
            "configured_endpoint": self.endpoint or "embedded://mock-catalogue",
            "kubernetes_service": self.ENDPOINT,
        }


class OrchestrationManager:
    def __init__(self, root, federation_client=None, catalogue_client=None):
        self.root = Path(root).resolve()
        self.federation_client = federation_client or FederationDemoClient()
        self.catalogue_client = catalogue_client or CatalogueDemoClient()

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

    @staticmethod
    def _metadata_response(local):
        result = dict(local)
        result["metadata_status"] = "Local and online" if local.get("sync") else "Local"
        result["online_definition"] = "Online means present only in the mock GD-AS-DEMO catalogue, not FDMI."
        return result

    @staticmethod
    def _write_json(path, value):
        temporary = path.with_suffix(path.suffix + ".tmp")
        temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")
        temporary.replace(path)
