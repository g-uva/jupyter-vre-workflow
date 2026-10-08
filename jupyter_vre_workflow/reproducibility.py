"""Services and durable state for the Autumn School reproducibility demo."""

import csv
import hashlib
import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen


CIM_STANDARDS = [
    {
        "key": "greendigit-commons",
        "label": "GreenDIGIT Commons",
        "profile": "Autumn School demonstration profile",
        "version": "Demo profile 2026.1",
        "description": (
            "A demonstrative vocabulary profile connecting notebook runs, "
            "measurements and provenance for the GreenDIGIT training workflow."
        ),
        "compliance": (
            "Demonstration guidance only. This is not an authoritative or "
            "certified GreenDIGIT specification."
        ),
    },
    {
        "key": "saref4energy",
        "label": "SAREF4Energy",
        "profile": "Energy domain extension",
        "version": "ETSI TS 103 410-1",
        "description": "SAREF extension for the energy domain.",
        "compliance": "Vocabulary mapping preview; no conformance assessment is performed.",
    },
    {
        "key": "saref4environment",
        "label": "SAREF4Environment",
        "profile": "Environment domain extension",
        "version": "ETSI TS 103 410-7",
        "description": "SAREF extension for environmental observations and properties.",
        "compliance": "Vocabulary mapping preview; no conformance assessment is performed.",
    },
    {
        "key": "saref4bldg",
        "label": "SAREF4BLDG",
        "profile": "Building domain extension",
        "version": "ETSI TS 103 410-3",
        "description": "SAREF extension for building devices and building spaces.",
        "compliance": "Vocabulary mapping preview; no conformance assessment is performed.",
    },
    {
        "key": "iec-cim",
        "label": "IEC CIM",
        "profile": "Common Information Model",
        "version": "IEC 61968 / IEC 61970 family",
        "description": "Common Information Model concepts for electric power systems.",
        "compliance": "Family reference only; no IEC profile validation is performed.",
    },
]

CIM_METADATA_PROFILES = [
    {
        "key": "default",
        "label": "GreenDIGIT Cloud detailed",
        "ri_type": "cloud",
        "profile_version": "2026.1",
        "description": (
            "Detailed experiment provenance with metric counts, units and value ranges."
        ),
        "experiment_term": "schema:Dataset",
        "metric_term": "sosa:Observation",
        "metric_summary_name": "JuVRE metric summary",
        "include_metric_extrema": True,
    },
    {
        "key": "compact-energy",
        "label": "GreenDIGIT Cloud compact",
        "ri_type": "cloud",
        "profile_version": "2026.1-compact",
        "description": (
            "A mock alternative that emits a compact metric inventory and energy-oriented mappings."
        ),
        "experiment_term": "schema:CreativeWork",
        "metric_term": "schema:PropertyValue",
        "metric_summary_name": "JuVRE energy metric inventory",
        "include_metric_extrema": False,
    },
]

CLOUD_FIELD_REGISTRY_VERSION = "greendigit-wp6-cloud-2026.1"
CLOUD_FIELD_REGISTRY = [
    {
        "source": "configured publication group",
        "eimps_target": "group",
        "definition": "Authorised server-side metric publication group.",
        "canonical_unit": None,
        "value_type": "string",
        "required": True,
        "transformation": "verbatim configured value",
        "measurement_boundary": "publication authorization",
        "provenance_requirements": "explicit user or deployment configuration",
        "standards_mapping": {"reference": "GreenDIGIT WP6 submission contract", "status": "exact"},
    },
    {
        "source": "configured site identifier",
        "eimps_target": "SiteName",
        "definition": "Registered identifier of the site executing the notebook.",
        "canonical_unit": None,
        "value_type": "string",
        "required": True,
        "transformation": "verbatim configured value",
        "measurement_boundary": "execution site",
        "provenance_requirements": "explicit selected-site configuration",
        "standards_mapping": {"reference": "GreenDIGIT WP6 Cloud schema", "status": "exact"},
    },
    {
        "source": "configured infrastructure type",
        "eimps_target": "CloudType",
        "definition": "Actual underlying cloud technology.",
        "canonical_unit": None,
        "value_type": "string",
        "required": True,
        "transformation": "verbatim configured value",
        "measurement_boundary": "execution infrastructure",
        "provenance_requirements": "explicit deployment configuration",
        "standards_mapping": {"reference": "GreenDIGIT WP6 Cloud schema", "status": "exact"},
    },
    {
        "source": "configured compute service",
        "eimps_target": "CloudComputeService",
        "definition": "Identifier of the cloud compute service.",
        "canonical_unit": None,
        "value_type": "string",
        "required": True,
        "transformation": "verbatim configured value",
        "measurement_boundary": "execution service",
        "provenance_requirements": "explicit deployment configuration",
        "standards_mapping": {"reference": "GreenDIGIT WP6 Cloud schema", "status": "exact"},
    },
    {
        "source": "run.id",
        "eimps_target": "ExecUnitID",
        "definition": "Stable identifier of the tracked execution unit.",
        "canonical_unit": None,
        "value_type": "string",
        "required": True,
        "transformation": "verbatim stable run identifier",
        "measurement_boundary": "notebook run",
        "provenance_requirements": "run.json id",
        "standards_mapping": {"reference": "GreenDIGIT WP6 Cloud schema", "status": "exact"},
    },
    {
        "source": "run start/end timestamps",
        "eimps_target": "StartExecTime, EndExecTime, WallClockTime_s",
        "definition": "UTC execution window and rounded elapsed wall-clock seconds.",
        "canonical_unit": "seconds",
        "value_type": "datetime|string, datetime|string, integer",
        "required": True,
        "transformation": "UTC ISO 8601; elapsed seconds rounded half up",
        "measurement_boundary": "tracked run lifecycle",
        "provenance_requirements": "run.json start_time and end_time",
        "standards_mapping": {"reference": "GreenDIGIT WP6 Cloud schema", "status": "exact"},
    },
    {
        "source": "run.status",
        "eimps_target": "Status, ExecUnitFinished",
        "definition": "Faithful execution status and integer terminal-state marker.",
        "canonical_unit": None,
        "value_type": "string, integer",
        "required": True,
        "transformation": "JuVRE status mapping; terminal status to 1, otherwise 0",
        "measurement_boundary": "tracked run lifecycle",
        "provenance_requirements": "run.json status",
        "standards_mapping": {"reference": "GreenDIGIT WP6 Cloud schema", "status": "exact"},
    },
    {
        "source": "configured VO/workload owner",
        "eimps_target": "Owner",
        "definition": "VO or workload-owner dimension, never a personal username guess.",
        "canonical_unit": None,
        "value_type": "string",
        "required": True,
        "transformation": "verbatim configured value",
        "measurement_boundary": "workload ownership",
        "provenance_requirements": "explicit user or deployment configuration",
        "standards_mapping": {"reference": "GreenDIGIT WP6 Cloud schema", "status": "exact"},
    },
    {
        "source": "attributable energy_j or Scaphandre process energy/power",
        "eimps_target": "EnergyWh",
        "definition": "Energy attributable to this notebook run.",
        "canonical_unit": "Wh",
        "value_type": "float",
        "required": True,
        "transformation": "J/3600, microjoule delta/3.6e9, or time-integrated microwatts/3.6e9",
        "measurement_boundary": "run-attributed process or execution unit only",
        "provenance_requirements": "explicit run attribution in metric labels; host totals are rejected",
        "standards_mapping": {"reference": "GreenDIGIT energy extension", "status": "GreenDIGIT extension"},
    },
    {
        "source": "evidenced workload accounting metrics",
        "eimps_target": "Work, Efficiency, CpuDuration_s, SuspendDuration_s, CPUNormalizationFactor",
        "definition": "Optional workload accounting values.",
        "canonical_unit": "field-specific",
        "value_type": "float or integer",
        "required": False,
        "transformation": "verbatim supported evidence only",
        "measurement_boundary": "workload accounting",
        "provenance_requirements": "defined source metric and unit",
        "standards_mapping": {"reference": "GreenDIGIT KPI inputs", "status": "input-to-KPI"},
    },
]

DEFAULT_CLOUD_CONFIGURATION = {
    "group": "greendigit",
    "site_name": "",
    "cloud_type": "",
    "cloud_compute_service": "",
    "owner": "",
}

DEFAULT_CRATE_CONFIGURATION = {
    "title": "",
    "description": "",
    "creator": "",
    "organization": "",
    "license": "",
    "publication_reference": "",
    "environment_information": "",
    "notebook_role": "https://schema.org/SoftwareSourceCode",
    "output_role": "https://schema.org/SoftwareSourceCode",
}


def demo_cim_response():
    """Return the contract exposed by the in-cluster CIM demonstration service."""
    return {
        "service": "JuVRE Autumn School CIM demonstration",
        "mode": "demo",
        "authenticated": True,
        "identity": "gd-super-user",
        "identity_note": "Simulated EGI Check-in identity; no real account was verified.",
        "standards": CIM_STANDARDS,
        "default_standard": "greendigit-commons",
        "metadata_profiles": CIM_METADATA_PROFILES,
        "default_metadata_profile": "default",
        "cloud_profile": {
            "ri_type": "cloud",
            "registry_version": CLOUD_FIELD_REGISTRY_VERSION,
            "field_registry": CLOUD_FIELD_REGISTRY,
        },
    }


class FdmiDemoClient:
    """Submit metadata to the FDMI demonstration service or local equivalent."""

    KUBERNETES_ENDPOINT = "http://juvre-demo-fdmi:8080/v1/submissions"

    def __init__(self, endpoint=None, post_json=None):
        self.endpoint = endpoint if endpoint is not None else os.environ.get(
            "JUVRE_FDMI_URL", ""
        )
        self.post_json = post_json or self._post_json

    @staticmethod
    def _post_json(url, payload):
        request = Request(
            url,
            data=json.dumps(payload).encode(),
            headers={"Accept": "application/json", "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urlopen(request, timeout=5) as response:
                return json.load(response)
        except (OSError, URLError, ValueError) as error:
            raise RuntimeError(f"FDMI endpoint unavailable: {error}") from error

    def describe(self):
        return {
            "mode": "internal Kubernetes demo" if self.endpoint else "embedded local demo",
            "endpoint": self.endpoint or "embedded://demo-fdmi",
            "kubernetes_service": self.KUBERNETES_ENDPOINT,
            "external_integration": False,
        }

    def submit(self, payload):
        if self.endpoint:
            result = self.post_json(self.endpoint, payload)
        else:
            key = payload["idempotency_key"]
            result = {
                "accepted": True,
                "receipt": f"FDMI-DEMO-{key[:16].upper()}",
                "idempotency_key": key,
                "message": "Accepted by the embedded Autumn School FDMI target.",
            }
        if not isinstance(result, dict) or not result.get("accepted") or not result.get("receipt"):
            raise RuntimeError("FDMI endpoint rejected or returned an invalid receipt")
        return result


class CimDemoClient:
    """Fetch CIM demonstration data from Kubernetes or the local fallback."""

    def __init__(self, endpoint=None, fetch_json=None):
        self.endpoint = endpoint if endpoint is not None else os.environ.get(
            "JUVRE_CIM_URL", ""
        )
        self.fetch_json = fetch_json or self._fetch_json

    @staticmethod
    def _fetch_json(url):
        request = Request(url, headers={"Accept": "application/json"})
        try:
            with urlopen(request, timeout=5) as response:
                return json.load(response)
        except (OSError, URLError, ValueError) as error:
            raise RuntimeError(f"CIM endpoint unavailable: {error}") from error

    def connect(self):
        data = self.fetch_json(self.endpoint) if self.endpoint else demo_cim_response()
        required = {"authenticated", "identity", "standards", "default_standard"}
        if not isinstance(data, dict) or not required.issubset(data):
            raise RuntimeError("CIM endpoint returned an invalid response")
        if not data["authenticated"]:
            raise RuntimeError("Demo authentication was not accepted")
        result = dict(data)
        result.setdefault("metadata_profiles", CIM_METADATA_PROFILES)
        result.setdefault("default_metadata_profile", "default")
        result.setdefault(
            "cloud_profile",
            {
                "ri_type": "cloud",
                "registry_version": CLOUD_FIELD_REGISTRY_VERSION,
                "field_registry": CLOUD_FIELD_REGISTRY,
            },
        )
        result["endpoint"] = self.endpoint or "embedded://demo-cim"
        result["connected"] = True
        return result


class ReproducibilityManager:
    """Persist configuration beside one tracked experiment and build previews."""

    STATE_FILE = "reproducibility.json"

    def __init__(self, root, fdmi_client=None):
        self.root = Path(root).resolve()
        self.fdmi_client = fdmi_client or FdmiDemoClient()

    def resolve_experiment(self, relative):
        if not isinstance(relative, str) or not relative or Path(relative).is_absolute():
            raise ValueError("Expected an experiment path relative to the Jupyter root")
        folder = (self.root / relative).resolve()
        if self.root not in folder.parents or not (folder / "run.json").is_file():
            raise ValueError("Experiment does not exist")
        return folder

    @staticmethod
    def _default_state():
        return {
            "schema_version": 2,
            "standard_key": None,
            "metadata_profile_key": "default",
            "cloud_configuration": dict(DEFAULT_CLOUD_CONFIGURATION),
            "crate_configuration": dict(DEFAULT_CRATE_CONFIGURATION),
            "mapping": {
                "experiment_term": "schema:Dataset",
                "metric_term": "sosa:Observation",
            },
            "configuration_revision": None,
            "cim_connection": None,
            "fdmi_connection": None,
            "crate": None,
            "publication": None,
        }

    def _load(self, folder):
        path = folder / self.STATE_FILE
        if not path.is_file():
            return self._default_state()
        saved = json.loads(path.read_text())
        state = self._default_state()
        default_mapping = dict(state["mapping"])
        state.update(saved)
        state["schema_version"] = 2
        default_mapping.update(saved.get("mapping", {}))
        state["mapping"] = default_mapping
        cloud_configuration = dict(DEFAULT_CLOUD_CONFIGURATION)
        cloud_configuration.update(saved.get("cloud_configuration", {}))
        state["cloud_configuration"] = cloud_configuration
        crate_configuration = dict(DEFAULT_CRATE_CONFIGURATION)
        crate_configuration.update(saved.get("crate_configuration", {}))
        state["crate_configuration"] = crate_configuration
        if state.get("standard_key"):
            state["configuration_revision"] = self._revision(
                state["standard_key"],
                state["mapping"],
                state["metadata_profile_key"],
                state["cloud_configuration"],
                state["crate_configuration"],
            )
        return state

    @staticmethod
    def _revision(
        standard_key, mapping, metadata_profile_key, cloud_configuration,
        crate_configuration
    ):
        source = json.dumps(
            {
                "standard_key": standard_key,
                "metadata_profile_key": metadata_profile_key,
                "mapping": mapping,
                "cloud_configuration": cloud_configuration,
                "crate_configuration": crate_configuration,
            },
            sort_keys=True,
        ).encode()
        return hashlib.sha256(source).hexdigest()[:16]

    def get(self, relative):
        folder = self.resolve_experiment(relative)
        state = self._load(folder)
        run = json.loads((folder / "run.json").read_text())
        metrics_path = folder / run.get("artifacts", {}).get("metrics", "metrics.csv")
        metrics = []
        if metrics_path.is_file():
            with metrics_path.open(newline="") as stream:
                seen = set()
                for row in csv.DictReader(stream):
                    name = row.get("metric")
                    if not name or name in seen:
                        continue
                    seen.add(name)
                    metrics.append(
                        {
                            "source": name,
                            "unit": row.get("unit") or "unknown",
                            "mapped_type": state["mapping"]["metric_term"],
                        }
                    )
        standard = next(
            (item for item in CIM_STANDARDS if item["key"] == state["standard_key"]),
            None,
        )
        state["standard"] = standard
        metadata_profile = next(
            (
                item
                for item in CIM_METADATA_PROFILES
                if item["key"] == state["metadata_profile_key"]
            ),
            None,
        )
        state["metadata_profile"] = metadata_profile
        state["preview"] = {
            "experiment_id": run.get("id"),
            "workflow_id": run.get("workflow_id"),
            "run_status": run.get("status"),
            "run_type": state["mapping"]["experiment_term"],
            "metadata_profile": metadata_profile["label"] if metadata_profile else None,
            "metrics": metrics,
        }
        locations = {
            "title": "@graph[./].name",
            "description": "@graph[./].description",
            "creator": "@graph[./].creator",
            "organization": "@graph[#creator].affiliation",
            "license": "@graph[./].license",
            "publication_reference": "@graph[./].citation",
            "environment_information": "@graph[#run].environment",
            "notebook_role": "@graph[notebook.ipynb].additionalType",
            "output_role": "@graph[executed.ipynb].additionalType",
        }
        state["crate_configuration_preview"] = [
            {
                "field": key,
                "value": value,
                "source": "participant configuration" if value else "run default",
                "jsonld_location": locations[key],
                "valid": not value or key not in {"license", "publication_reference"}
                or value.startswith(("http://", "https://")),
            }
            for key, value in state["crate_configuration"].items()
        ]
        state["configured"] = standard is not None and metadata_profile is not None
        state["fdmi_target"] = self.fdmi_client.describe()
        source_revision = self._source_revision(folder, run)
        state["source_revision"] = source_revision
        state["crate_current"] = bool(
            state.get("crate")
            and state["crate"].get("configuration_revision")
            == state["configuration_revision"]
            and state["crate"].get("source_revision") == source_revision
        )
        return state

    def configure(
        self,
        relative,
        standard_key,
        mapping,
        metadata_profile_key=None,
        cloud_configuration=None,
        crate_configuration=None,
    ):
        folder = self.resolve_experiment(relative)
        if standard_key not in {item["key"] for item in CIM_STANDARDS}:
            raise ValueError("Unsupported CIM standard")
        if not isinstance(mapping, dict):
            raise ValueError("Mapping must be an object")
        allowed = {"experiment_term", "metric_term"}
        if set(mapping) - allowed:
            raise ValueError("Only the preview experiment and metric terms are editable")
        previous = self._load(folder)
        profile_key = metadata_profile_key or previous["metadata_profile_key"]
        profile = next(
            (item for item in CIM_METADATA_PROFILES if item["key"] == profile_key),
            None,
        )
        if profile is None:
            raise ValueError("Unsupported CIM metadata profile")
        merged = dict(previous["mapping"])
        if metadata_profile_key and metadata_profile_key != previous["metadata_profile_key"]:
            merged.update(
                {
                    "experiment_term": profile["experiment_term"],
                    "metric_term": profile["metric_term"],
                }
            )
        for key, value in mapping.items():
            if not isinstance(value, str) or not value.strip() or len(value) > 120:
                raise ValueError(f"Invalid mapping value for {key}")
            merged[key] = value.strip()
        cloud = dict(previous["cloud_configuration"])
        if cloud_configuration is not None:
            if not isinstance(cloud_configuration, dict):
                raise ValueError("Cloud configuration must be an object")
            if set(cloud_configuration) - set(DEFAULT_CLOUD_CONFIGURATION):
                raise ValueError("Cloud configuration contains unsupported fields")
            for key, value in cloud_configuration.items():
                if not isinstance(value, str) or len(value.strip()) > 160:
                    raise ValueError(f"Invalid cloud configuration value for {key}")
                cloud[key] = value.strip()
        crate_config = dict(previous["crate_configuration"])
        if crate_configuration is not None:
            if not isinstance(crate_configuration, dict):
                raise ValueError("RO-Crate configuration must be an object")
            if set(crate_configuration) - set(DEFAULT_CRATE_CONFIGURATION):
                raise ValueError("RO-Crate configuration contains unsupported fields")
            for key, value in crate_configuration.items():
                if not isinstance(value, str) or len(value.strip()) > 500:
                    raise ValueError(f"Invalid RO-Crate configuration value for {key}")
                value = value.strip()
                if key in {"license", "publication_reference", "notebook_role", "output_role"} and value and not value.startswith(("http://", "https://")):
                    raise ValueError(f"{key} must be an absolute HTTP(S) identifier")
                crate_config[key] = value
        revision = self._revision(
            standard_key, merged, profile_key, cloud, crate_config
        )
        changed = revision != previous.get("configuration_revision")
        previous.update(
            {
                "standard_key": standard_key,
                "metadata_profile_key": profile_key,
                "mapping": merged,
                "cloud_configuration": cloud,
                "crate_configuration": crate_config,
                "configuration_revision": revision,
            }
        )
        if changed and previous.get("publication"):
            previous["publication"]["stale"] = True
        self._write_state(folder, previous)
        if (previous.get("cim_connection") or {}).get("connected"):
            return self.generate_crate(relative)
        return self.get(relative)

    def publish(self, relative):
        folder = self.resolve_experiment(relative)
        state = self._load(folder)
        crate = state.get("crate") or {}
        if (
            not crate
            or crate.get("configuration_revision") != state.get("configuration_revision")
            or crate.get("source_revision") != self._source_revision(folder)
        ):
            raise ValueError("Generate an up-to-date RO-Crate artefact first")
        if not (state.get("fdmi_connection") or {}).get("connected"):
            raise ValueError("Connect to the mock FDMI service before synchronising")
        crate_path = folder / crate.get("name", "ro-crate-metadata.json")
        if not crate_path.is_file():
            raise ValueError("Generated RO-Crate artefact is missing")
        artifact_sha256 = hashlib.sha256(crate_path.read_bytes()).hexdigest()
        previous = state.get("publication") or {}
        if (
            not previous.get("stale")
            and previous.get("artifact_sha256") == artifact_sha256
            and previous.get("receipt")
        ):
            return self.get(relative)
        run = json.loads((folder / "run.json").read_text())
        payload = {
            "experiment_id": run.get("id"),
            "workflow_id": run.get("workflow_id"),
            "standard_key": state.get("standard_key"),
            "metadata_profile_key": state.get("metadata_profile_key"),
            "artifact_name": crate_path.name,
            "artifact_sha256": artifact_sha256,
            "idempotency_key": hashlib.sha256(
                f"{run.get('id')}:{artifact_sha256}".encode()
            ).hexdigest(),
            "ro_crate_metadata": json.loads(crate_path.read_text()),
        }
        result = self.fdmi_client.submit(payload)
        submitted = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        catalogue_path = self.root / "juvre" / "fdmi" / "submissions.json"
        catalogue_path.parent.mkdir(parents=True, exist_ok=True)
        catalogue = (
            json.loads(catalogue_path.read_text()) if catalogue_path.is_file() else []
        )
        matching = next(
            (
                item
                for item in catalogue
                if item["experiment_id"] == run.get("id")
                and item["artifact_sha256"] == artifact_sha256
            ),
            None,
        )
        versions = [
            item["version"]
            for item in catalogue
            if item["experiment_id"] == run.get("id")
        ]
        version = matching["version"] if matching else max(versions, default=0) + 1
        if matching is None:
            catalogue.append(
                {
                    "experiment_id": run.get("id"),
                    "workflow_id": run.get("workflow_id"),
                    "artifact_sha256": artifact_sha256,
                    "receipt": result["receipt"],
                    "version": version,
                    "submitted_at": submitted,
                    "metadata_profile_key": state.get("metadata_profile_key"),
                    "eimps_ready": crate.get("eimps_ready", False),
                }
            )
            self._write_json_artifact(catalogue_path, catalogue)
        state["publication"] = {
            "status": "accepted",
            "receipt": result["receipt"],
            "message": result.get("message"),
            "idempotency_key": payload["idempotency_key"],
            "artifact_sha256": artifact_sha256,
            "submitted_at": submitted,
            "version": version,
            "endpoint": self.fdmi_client.describe()["endpoint"],
            "stale": False,
        }
        self._write_state(folder, state)
        return self.get(relative)

    def connect_fdmi(self, relative):
        folder = self.resolve_experiment(relative)
        state = self._load(folder)
        target = self.fdmi_client.describe()
        state["fdmi_connection"] = {
            "connected": True,
            "connected_at": datetime.now(timezone.utc).isoformat().replace(
                "+00:00", "Z"
            ),
            "mode": target["mode"],
            "endpoint": target["endpoint"],
            "external_integration": False,
        }
        self._write_state(folder, state)
        return self.get(relative)

    def fdmi_catalogue(self):
        path = self.root / "juvre" / "fdmi" / "submissions.json"
        return json.loads(path.read_text()) if path.is_file() else []

    def mark_cim_connected(self, relative, connection):
        folder = self.resolve_experiment(relative)
        state = self._load(folder)
        state["cim_connection"] = {
            "connected": True,
            "endpoint": connection["endpoint"],
            "identity": connection["identity"],
            "mode": "demo",
        }
        self._write_state(folder, state)
        return self.get(relative)

    @staticmethod
    def _write_state(folder, state):
        path = folder / ReproducibilityManager.STATE_FILE
        temporary = path.with_suffix(path.suffix + ".tmp")
        temporary.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n")
        temporary.replace(path)

    @staticmethod
    def _source_revision(folder, run=None):
        run_path = folder / "run.json"
        if run is None:
            run = json.loads(run_path.read_text())
        metrics_name = run.get("artifacts", {}).get("metrics", "metrics.csv")
        digest = hashlib.sha256()
        for path in (run_path, folder / metrics_name):
            if path.is_file():
                digest.update(path.name.encode())
                digest.update(path.read_bytes())
        return digest.hexdigest()[:16]

    @staticmethod
    def _parse_time(value):
        if not value:
            return None
        return datetime.fromisoformat(value.replace("Z", "+00:00"))

    @staticmethod
    def _metric_rows(path):
        rows = []
        with path.open(newline="") as stream:
            for row in csv.DictReader(stream):
                try:
                    labels = json.loads(row.get("labels") or "{}")
                    value = float(row["value"])
                    timestamp = float(row["timestamp_unix"])
                except (KeyError, TypeError, ValueError, json.JSONDecodeError):
                    continue
                rows.append({**row, "labels": labels, "value": value, "timestamp": timestamp})
        return rows

    @staticmethod
    def _is_run_attributed(labels, run_id):
        return (
            labels.get("attribution") in {"run", "experiment"}
            or labels.get("scope") in {"run", "experiment", "notebook"}
            or labels.get("experiment_id") == run_id
            or labels.get("exec_unit_id") == run_id
        )

    def _attributable_energy(self, rows, run):
        run_id = run.get("id")
        direct = [
            row
            for row in rows
            if row["metric"] == "energy_j"
            and row.get("unit") == "joules"
            and self._is_run_attributed(row["labels"], run_id)
        ]
        if direct:
            value_j = max(row["value"] for row in direct)
            return value_j / 3600, {
                "source_metric": "energy_j",
                "original_unit": "joules",
                "source_value": value_j,
                "converted_value": value_j / 3600,
                "canonical_unit": "Wh",
                "attribution_method": "explicit run-attribution label",
                "measurement_boundary": "notebook run",
                "coverage": "run cumulative energy",
                "confidence": "high",
            }

        energy_rows = [
            row
            for row in rows
            if row["metric"].startswith("scaph_process_")
            and "energy" in row["metric"]
            and row["metric"].endswith("_microjoules")
            and self._is_run_attributed(row["labels"], run_id)
        ]
        if energy_rows:
            by_labels = {}
            for row in energy_rows:
                key = json.dumps(row["labels"], sort_keys=True)
                by_labels.setdefault(key, []).append(row["value"])
            delta_uj = sum(max(values) - min(values) for values in by_labels.values())
            return delta_uj / 3_600_000_000, {
                "source_metric": energy_rows[0]["metric"],
                "original_unit": "microjoules",
                "source_value": delta_uj,
                "converted_value": delta_uj / 3_600_000_000,
                "canonical_unit": "Wh",
                "attribution_method": "Scaphandre process counter with matching run label",
                "measurement_boundary": "run-attributed processes",
                "coverage": "counter delta over observed run window",
                "confidence": "high",
            }

        power_rows = [
            row
            for row in rows
            if row["metric"].startswith("scaph_process_")
            and "power" in row["metric"]
            and row["metric"].endswith("_microwatts")
            and self._is_run_attributed(row["labels"], run_id)
        ]
        if len(power_rows) >= 2:
            by_labels = {}
            for row in power_rows:
                key = json.dumps(row["labels"], sort_keys=True)
                by_labels.setdefault(key, []).append(row)
            energy_uj = 0
            for series in by_labels.values():
                series.sort(key=lambda row: row["timestamp"])
                for first, second in zip(series, series[1:]):
                    energy_uj += (
                        (first["value"] + second["value"])
                        / 2
                        * (second["timestamp"] - first["timestamp"])
                    )
            return energy_uj / 3_600_000_000, {
                "source_metric": power_rows[0]["metric"],
                "original_unit": "microwatts",
                "source_value": energy_uj,
                "converted_value": energy_uj / 3_600_000_000,
                "canonical_unit": "Wh",
                "attribution_method": "trapezoidal integration of run-labelled process power",
                "measurement_boundary": "run-attributed processes",
                "coverage": "observed process-power samples",
                "confidence": "medium",
            }
        return None, None

    def _harmonize(self, folder, state, run, rows):
        cloud = state["cloud_configuration"]
        metadata_profile = next(
            item
            for item in CIM_METADATA_PROFILES
            if item["key"] == state["metadata_profile_key"]
        )
        status_map = {
            "succeeded": "finished",
            "failed": "failed",
            "cancelled": "cancelled",
            "interrupted": "interrupted",
            "running": "running",
        }
        terminal = run.get("status") in {"succeeded", "failed", "cancelled", "interrupted"}
        payload = {}
        configured_fields = {
            "group": cloud["group"],
            "SiteName": cloud["site_name"],
            "CloudType": cloud["cloud_type"],
            "CloudComputeService": cloud["cloud_compute_service"],
            "Owner": cloud["owner"],
        }
        payload.update({key: value for key, value in configured_fields.items() if value})
        if run.get("id"):
            payload["ExecUnitID"] = str(run["id"])
        if run.get("start_time"):
            payload["StartExecTime"] = run["start_time"]
        if run.get("end_time"):
            payload["EndExecTime"] = run["end_time"]
        if run.get("status"):
            payload["Status"] = status_map.get(run["status"], str(run["status"]))
            payload["ExecUnitFinished"] = int(terminal)
        start = self._parse_time(run.get("start_time"))
        end = self._parse_time(run.get("end_time"))
        if start and end:
            payload["WallClockTime_s"] = int((end - start).total_seconds() + 0.5)
        energy_wh, energy_provenance = self._attributable_energy(rows, run)
        if energy_wh is not None:
            payload["EnergyWh"] = energy_wh

        required = [
            "group", "SiteName", "CloudType", "CloudComputeService",
            "ExecUnitID", "StartExecTime", "EndExecTime", "Status",
            "ExecUnitFinished", "WallClockTime_s", "Owner", "EnergyWh",
        ]
        missing = [field for field in required if field not in payload]
        quality_flags = []
        if "EnergyWh" in missing:
            quality_flags.append("energy_not_attributable_to_run")
        if any(field in missing for field in configured_fields):
            quality_flags.append("incomplete_explicit_cloud_configuration")
        unsupported = [
            "Work", "Efficiency", "CpuDuration_s", "SuspendDuration_s",
            "CPUNormalizationFactor",
        ]
        summaries = []
        for name in sorted({row["metric"] for row in rows}):
            selected = [row for row in rows if row["metric"] == name]
            summary = {
                "source_metric": name,
                "original_units": sorted(
                    {row.get("unit") or "unknown" for row in selected}
                ),
                "sample_count": len(selected),
                "source": "metrics.csv",
                "attribution_method": (
                    "explicit metric label"
                    if any(
                        self._is_run_attributed(row["labels"], run.get("id"))
                        for row in selected
                    )
                    else "not attributed"
                ),
                "measurement_boundary": "source metric boundary retained",
                "time_window": {
                    "start": min(row["timestamp"] for row in selected),
                    "end": max(row["timestamp"] for row in selected),
                },
                "coverage": "observed samples only",
                "confidence": "source",
                "standards_mapping": {
                    "reference": "GreenDIGIT CIM metric registry",
                    "status": "contextual",
                },
            }
            if metadata_profile["include_metric_extrema"]:
                summary["observed_value_range"] = [
                    min(row["value"] for row in selected),
                    max(row["value"] for row in selected),
                ]
            summaries.append(summary)
        if energy_provenance:
            summaries.append({
                **energy_provenance,
                "source": "metrics.csv",
                "time_window": {"start": run.get("start_time"), "end": run.get("end_time")},
                "standards_mapping": {
                    "reference": "GreenDIGIT WP6 EnergyWh",
                    "status": "exact",
                },
            })
        validation = {
            "syntax_valid": True,
            "eimps_ready": not missing,
            "missing_required_fields": missing,
            "missing_reasons": {
                field: (
                    "No run-attributable energy measurement is available."
                    if field == "EnergyWh"
                    else "Required explicit configuration or run evidence is missing."
                )
                for field in missing
            },
            "quality_flags": quality_flags,
            "unsupported_optional_fields": unsupported,
            "endpoint_acceptance": "not submitted",
            "downstream_cloud_compatibility": "compatible" if not missing else "draft",
        }
        return {
            "schema_version": 1,
            "record_type": "GreenDIGIT CIM harmonised Cloud execution record",
            "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "identifiers": {
                "run_id": run.get("id"),
                "workflow_id": run.get("workflow_id"),
            },
            "infrastructure": dict(cloud),
            "execution": {
                "status": run.get("status"),
                "start_time": run.get("start_time"),
                "end_time": run.get("end_time"),
            },
            "environment": {
                "notebook_path": run.get("notebook_path"),
                "kernel_name": run.get("kernel_name"),
                "telemetry_status": (run.get("telemetry") or {}).get("status"),
                "telemetry_source": (run.get("telemetry") or {}).get("source"),
                "telemetry_scope": (run.get("telemetry") or {}).get("scope"),
            },
            "descriptive_metadata": dict(state["crate_configuration"]),
            "measurements": summaries,
            "measurement_collection": metadata_profile["metric_summary_name"],
            "eimps_cloud": payload,
            "profile": {
                "ri_type": "cloud",
                "registry_version": CLOUD_FIELD_REGISTRY_VERSION,
                "metadata_profile_key": state["metadata_profile_key"],
                "metadata_profile_version": metadata_profile["profile_version"],
                "configuration_revision": state["configuration_revision"],
                "source_revision": self._source_revision(folder, run),
            },
            "validation": validation,
        }

    @staticmethod
    def _write_json_artifact(path, value):
        temporary = path.with_suffix(path.suffix + ".tmp")
        temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")
        temporary.replace(path)

    def generate_crate(self, relative):
        folder = self.resolve_experiment(relative)
        state = self._load(folder)
        if not (state.get("cim_connection") or {}).get("connected"):
            raise ValueError("Connect successfully to the CIM service first")
        standard = next(
            (item for item in CIM_STANDARDS if item["key"] == state["standard_key"]),
            None,
        )
        metadata_profile = next(
            (item for item in CIM_METADATA_PROFILES if item["key"] == state["metadata_profile_key"]),
            None,
        )
        if standard is None or metadata_profile is None or not state.get("configuration_revision"):
            raise ValueError("Configure a supported CIM standard and metadata profile first")
        run = json.loads((folder / "run.json").read_text())
        source_revision = self._source_revision(folder, run)
        current = state.get("crate") or {}
        if (
            current.get("configuration_revision") == state["configuration_revision"]
            and current.get("source_revision") == source_revision
            and all(
                (folder / name).is_file()
                for name in ("eimps-cloud.json", "cim-record.json", "ro-crate-metadata.json")
            )
        ):
            return self.get(relative)
        artifacts = run.get("artifacts", {})
        names = {
            "input": artifacts.get("input", "notebook.ipynb"),
            "output": artifacts.get("output", "executed.ipynb"),
            "metrics": artifacts.get("metrics", "metrics.csv"),
            "run": "run.json",
            "eimps": "eimps-cloud.json",
            "cim": "cim-record.json",
        }
        missing = [name for name in list(names.values())[:4] if not (folder / name).is_file()]
        if missing:
            raise ValueError("Missing run files: " + ", ".join(missing))
        rows = self._metric_rows(folder / names["metrics"])
        harmonized = self._harmonize(folder, state, run, rows)
        self._write_json_artifact(folder / names["eimps"], harmonized["eimps_cloud"])
        self._write_json_artifact(folder / names["cim"], harmonized)

        generated = harmonized["generated_at"]
        crate_name = "ro-crate-metadata.json"
        action_id = f"#run-{run['id']}"
        standard_id = f"#standard-{standard['key']}"
        profile_id = f"#metadata-profile-{metadata_profile['key']}"
        file_labels = {
            names["input"]: ("Input notebook snapshot", ["File", "SoftwareSourceCode"]),
            names["output"]: ("Executed notebook", ["File", "SoftwareSourceCode"]),
            names["metrics"]: ("Experiment source metrics", "File"),
            names["run"]: ("JuVRE run record", "File"),
            names["eimps"]: ("Draft EIMPS Cloud export", "File"),
            names["cim"]: ("Versioned CIM harmonised record", "File"),
        }
        file_entities = []
        crate_config = state["crate_configuration"]
        for name, (label, kind) in file_labels.items():
            entity = {
                "@id": name,
                "@type": kind,
                "name": label,
                "encodingFormat": "application/json" if name.endswith(".json") else (
                    "text/csv" if name.endswith(".csv") else "application/x-ipynb+json"
                ),
                "sha256": hashlib.sha256((folder / name).read_bytes()).hexdigest(),
            }
            if name == names["input"]:
                entity["additionalType"] = crate_config["notebook_role"]
            elif name == names["output"]:
                entity["additionalType"] = crate_config["output_role"]
            if name in {names["eimps"], names["cim"]}:
                entity.update({
                    "about": {"@id": action_id},
                    "isBasedOn": [{"@id": names["run"]}, {"@id": names["metrics"]}],
                    "additionalProperty": {
                        "@type": "PropertyValue",
                        "name": "GreenDIGIT Cloud export status",
                        "value": (
                            "EIMPS-ready"
                            if harmonized["validation"]["eimps_ready"]
                            else "draft"
                        ),
                    },
                })
            file_entities.append(entity)
        action_status = {
            "succeeded": "https://schema.org/CompletedActionStatus",
            "failed": "https://schema.org/FailedActionStatus",
            "cancelled": "https://schema.org/FailedActionStatus",
            "interrupted": "https://schema.org/FailedActionStatus",
            "running": "https://schema.org/ActiveActionStatus",
        }.get(run.get("status"), "https://schema.org/PotentialActionStatus")
        root = {
            "@id": "./",
            "@type": "Dataset",
            "name": crate_config["title"] or f"JuVRE Cloud experiment {run.get('workflow_id')} / {run.get('id')}",
            "description": crate_config["description"] or "Tracked notebook execution with source telemetry, CIM provenance and a local EIMPS Cloud export.",
            "datePublished": generated,
            "hasPart": [{"@id": name} for name in file_labels],
            "mentions": [
                {"@id": action_id},
                {"@id": standard_id},
                {"@id": profile_id},
            ],
        }
        contextual_entities = []
        if crate_config["license"]:
            root["license"] = {"@id": crate_config["license"]}
        if crate_config["publication_reference"]:
            root["citation"] = {"@id": crate_config["publication_reference"]}
            contextual_entities.append({
                "@id": crate_config["publication_reference"],
                "@type": "CreativeWork",
            })
        if crate_config["creator"] or crate_config["organization"]:
            root["creator"] = {"@id": "#creator"}
            creator = {
                "@id": "#creator",
                "@type": "Person" if crate_config["creator"] else "Organization",
                "name": crate_config["creator"] or crate_config["organization"],
            }
            if crate_config["organization"] and crate_config["creator"]:
                creator["affiliation"] = {
                    "@id": "#creator-organization"
                }
                contextual_entities.append({
                    "@id": "#creator-organization",
                    "@type": "Organization",
                    "name": crate_config["organization"],
                })
            contextual_entities.append(creator)
        graph = [
            {
                "@id": crate_name,
                "@type": "CreativeWork",
                "about": {"@id": "./"},
                "conformsTo": {"@id": "https://w3id.org/ro/crate/1.1"},
            },
            root,
            {
                "@id": action_id,
                "@type": "CreateAction",
                "identifier": str(run["id"]),
                "name": "Execute tracked Jupyter notebook experiment",
                "actionStatus": {"@id": action_status},
                "startTime": run.get("start_time"),
                "endTime": run.get("end_time"),
                "object": {"@id": names["input"]},
                "result": [
                    {"@id": names["output"]}, {"@id": names["metrics"]},
                    {"@id": names["eimps"]}, {"@id": names["cim"]},
                ],
                "instrument": {"@id": names["input"]},
                "additionalProperty": {
                    "@type": "PropertyValue",
                    "name": "execution environment",
                    "value": crate_config["environment_information"] or run.get("kernel_name") or "not recorded",
                },
            },
            {
                "@id": standard_id,
                "@type": "CreativeWork",
                "name": standard["label"],
                "version": standard["version"],
                "description": standard["description"],
                "additionalProperty": {
                    "@type": "PropertyValue",
                    "name": "standards mapping status",
                    "value": "contextual",
                },
            },
            {
                "@id": profile_id,
                "@type": "CreativeWork",
                "name": metadata_profile["label"],
                "version": metadata_profile["profile_version"],
                "description": metadata_profile["description"],
                "additionalProperty": {
                    "@type": "PropertyValue",
                    "name": "CIM resource-infrastructure type",
                    "value": "cloud",
                },
            },
            *file_entities,
            *contextual_entities,
        ]
        crate = {"@context": "https://w3id.org/ro/crate/1.1/context", "@graph": graph}
        crate_path = folder / crate_name
        self._write_json_artifact(crate_path, crate)
        revision_name = f"{state['configuration_revision']}-{source_revision}"
        revision_folder = folder / "export-revisions" / revision_name
        revision_folder.mkdir(parents=True, exist_ok=True)
        for name in (names["eimps"], names["cim"], crate_name):
            shutil.copy2(folder / name, revision_folder / name)
        previous_generation = (state.get("crate") or {}).get("generation", 0)
        previous_crate = state.get("crate") or {}
        state["crate"] = {
            "name": crate_name,
            "path": str(crate_path.relative_to(self.root)),
            "generated_at": generated,
            "configuration_revision": state["configuration_revision"],
            "source_revision": harmonized["profile"]["source_revision"],
            "metadata_profile_key": state["metadata_profile_key"],
            "generation": previous_generation + 1,
            "eimps_ready": harmonized["validation"]["eimps_ready"],
            "missing_required_fields": harmonized["validation"]["missing_required_fields"],
            "quality_flags": harmonized["validation"]["quality_flags"],
            "artifacts": {
                "ro_crate": str(crate_path.relative_to(self.root)),
                "eimps_cloud": str((folder / names["eimps"]).relative_to(self.root)),
                "cim_record": str((folder / names["cim"]).relative_to(self.root)),
            },
            "revision_path": str(revision_folder.relative_to(self.root)),
        }
        state["export_comparison"] = {
            "previous_revision": previous_crate.get("revision_path"),
            "current_revision": str(revision_folder.relative_to(self.root)),
            "mapping_changed": bool(previous_crate) and previous_crate.get("configuration_revision") != state["configuration_revision"],
            "measurements_changed": bool(previous_crate) and previous_crate.get("source_revision") != source_revision,
            "artifacts": ["cim-record.json", "eimps-cloud.json", "ro-crate-metadata.json"],
        }
        if state.get("publication"):
            state["publication"]["stale"] = True
        self._write_state(folder, state)
        return self.get(relative)
