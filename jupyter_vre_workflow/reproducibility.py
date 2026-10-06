"""Services and durable state for the Autumn School reproducibility demo."""

import json
import os
import csv
import hashlib
from pathlib import Path
from datetime import datetime, timezone
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


def mock_cim_response():
    """Return the contract exposed by the in-cluster mock CIM service."""
    return {
        "service": "JuVRE Autumn School mock CIM",
        "mode": "demo",
        "authenticated": True,
        "identity": "gd-super-user",
        "identity_note": "Simulated EGI Check-in identity; no real account was verified.",
        "standards": CIM_STANDARDS,
        "default_standard": "greendigit-commons",
    }


class FdmiDemoClient:
    """Submit metadata to the mock FDMI service, or its local equivalent."""

    KUBERNETES_ENDPOINT = "http://juvre-mock-fdmi:8080/v1/submissions"

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
            raise RuntimeError(f"Mock FDMI endpoint unavailable: {error}") from error

    def describe(self):
        return {
            "mode": "internal Kubernetes mock" if self.endpoint else "embedded local mock",
            "endpoint": self.endpoint or "embedded://mock-fdmi",
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
                "message": "Accepted by the embedded Autumn School mock FDMI target.",
            }
        if not isinstance(result, dict) or not result.get("accepted") or not result.get("receipt"):
            raise RuntimeError("Mock FDMI endpoint rejected or returned an invalid receipt")
        return result


class CimDemoClient:
    """Fetch mock CIM data from Kubernetes, with an equivalent local fallback."""

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
            raise RuntimeError(f"Mock CIM endpoint unavailable: {error}") from error

    def connect(self):
        data = self.fetch_json(self.endpoint) if self.endpoint else mock_cim_response()
        required = {"authenticated", "identity", "standards", "default_standard"}
        if not isinstance(data, dict) or not required.issubset(data):
            raise RuntimeError("Mock CIM endpoint returned an invalid response")
        if not data["authenticated"]:
            raise RuntimeError("Demo authentication was not accepted")
        result = dict(data)
        result["endpoint"] = self.endpoint or "embedded://mock-cim"
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
            "schema_version": 1,
            "standard_key": None,
            "mapping": {
                "experiment_term": "schema:Dataset",
                "metric_term": "sosa:Observation",
            },
            "configuration_revision": None,
            "cim_connection": None,
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
        default_mapping.update(saved.get("mapping", {}))
        state["mapping"] = default_mapping
        return state

    @staticmethod
    def _revision(standard_key, mapping):
        source = json.dumps(
            {"standard_key": standard_key, "mapping": mapping}, sort_keys=True
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
        state["preview"] = {
            "experiment_id": run.get("id"),
            "workflow_id": run.get("workflow_id"),
            "run_status": run.get("status"),
            "run_type": state["mapping"]["experiment_term"],
            "metrics": metrics,
        }
        state["configured"] = standard is not None
        state["fdmi_target"] = self.fdmi_client.describe()
        state["crate_current"] = bool(
            state.get("crate")
            and state["crate"].get("configuration_revision")
            == state["configuration_revision"]
        )
        return state

    def configure(self, relative, standard_key, mapping):
        folder = self.resolve_experiment(relative)
        if standard_key not in {item["key"] for item in CIM_STANDARDS}:
            raise ValueError("Unsupported CIM standard")
        if not isinstance(mapping, dict):
            raise ValueError("Mapping must be an object")
        allowed = {"experiment_term", "metric_term"}
        if set(mapping) - allowed:
            raise ValueError("Only the preview experiment and metric terms are editable")
        previous = self._load(folder)
        merged = dict(previous["mapping"])
        for key, value in mapping.items():
            if not isinstance(value, str) or not value.strip() or len(value) > 120:
                raise ValueError(f"Invalid mapping value for {key}")
            merged[key] = value.strip()
        revision = self._revision(standard_key, merged)
        changed = revision != previous.get("configuration_revision")
        previous.update(
            {
                "standard_key": standard_key,
                "mapping": merged,
                "configuration_revision": revision,
            }
        )
        if changed and previous.get("publication"):
            previous["publication"]["stale"] = True
        self._write_state(folder, previous)
        return self.get(relative)

    def publish(self, relative):
        folder = self.resolve_experiment(relative)
        state = self._load(folder)
        crate = state.get("crate") or {}
        if (
            not crate
            or crate.get("configuration_revision") != state.get("configuration_revision")
        ):
            raise ValueError("Generate an up-to-date RO-Crate artefact first")
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
            "artifact_name": crate_path.name,
            "artifact_sha256": artifact_sha256,
            "idempotency_key": hashlib.sha256(
                f"{run.get('id')}:{artifact_sha256}".encode()
            ).hexdigest(),
            "ro_crate_metadata": json.loads(crate_path.read_text()),
        }
        result = self.fdmi_client.submit(payload)
        submitted = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        state["publication"] = {
            "status": "accepted",
            "receipt": result["receipt"],
            "message": result.get("message"),
            "idempotency_key": payload["idempotency_key"],
            "artifact_sha256": artifact_sha256,
            "submitted_at": submitted,
            "endpoint": self.fdmi_client.describe()["endpoint"],
            "stale": False,
        }
        self._write_state(folder, state)
        return self.get(relative)

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

    def generate_crate(self, relative):
        folder = self.resolve_experiment(relative)
        state = self._load(folder)
        if not (state.get("cim_connection") or {}).get("connected"):
            raise ValueError("Connect successfully to the mock CIM service first")
        standard = next(
            (item for item in CIM_STANDARDS if item["key"] == state["standard_key"]),
            None,
        )
        if standard is None or not state.get("configuration_revision"):
            raise ValueError("Configure a supported CIM standard first")
        run = json.loads((folder / "run.json").read_text())
        artifacts = run.get("artifacts", {})
        names = {
            "input": artifacts.get("input", "notebook.ipynb"),
            "output": artifacts.get("output", "executed.ipynb"),
            "metrics": artifacts.get("metrics", "metrics.csv"),
        }
        missing = [name for name in names.values() if not (folder / name).is_file()]
        if missing:
            raise ValueError("Missing run files: " + ", ".join(missing))

        metric_summaries = []
        with (folder / names["metrics"]).open(newline="") as stream:
            grouped = {}
            for row in csv.DictReader(stream):
                metric = row.get("metric")
                if not metric:
                    continue
                item = grouped.setdefault(
                    metric,
                    {"count": 0, "units": set(), "values": []},
                )
                item["count"] += 1
                if row.get("unit"):
                    item["units"].add(row["unit"])
                try:
                    item["values"].append(float(row["value"]))
                except (TypeError, ValueError):
                    pass
            for metric, item in sorted(grouped.items()):
                summary = {
                    "name": metric,
                    "count": item["count"],
                    "units": sorted(item["units"]),
                    "mapped_type": state["mapping"]["metric_term"],
                }
                if item["values"]:
                    summary["minimum"] = min(item["values"])
                    summary["maximum"] = max(item["values"])
                metric_summaries.append(summary)

        generated = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        crate_name = "ro-crate-metadata.json"
        standard_id = f"#standard-{standard['key']}"
        action_id = f"#run-{run['id']}"
        graph = [
            {
                "@id": crate_name,
                "@type": "CreativeWork",
                "about": {"@id": "./"},
                "conformsTo": {"@id": "https://w3id.org/ro/crate/1.1"},
            },
            {
                "@id": "./",
                "@type": "Dataset",
                "name": f"JuVRE experiment {run.get('workflow_id')} / {run.get('id')}",
                "datePublished": generated,
                "hasPart": [{"@id": value} for value in names.values()],
                "mentions": [{"@id": action_id}, {"@id": standard_id}],
                "additionalProperty": [
                    {
                        "@type": "PropertyValue",
                        "name": "JuVRE metric summary",
                        "value": metric_summaries,
                    },
                    {
                        "@type": "PropertyValue",
                        "name": "CIM preview mapping",
                        "value": state["mapping"],
                    },
                ],
            },
            {
                "@id": action_id,
                "@type": "CreateAction",
                "name": "Execute tracked Jupyter notebook experiment",
                "actionStatus": run.get("status"),
                "startTime": run.get("start_time"),
                "endTime": run.get("end_time"),
                "object": {"@id": names["input"]},
                "result": [{"@id": names["output"]}, {"@id": names["metrics"]}],
                "instrument": {"@id": names["input"]},
            },
            {
                "@id": standard_id,
                "@type": "CreativeWork",
                "name": standard["label"],
                "version": standard["version"],
                "description": standard["description"],
                "usageInfo": standard["compliance"],
            },
            {
                "@id": names["input"],
                "@type": ["File", "SoftwareSourceCode"],
                "name": "Input notebook snapshot",
                "sha256": run.get("input_sha256"),
            },
            {
                "@id": names["output"],
                "@type": ["File", "SoftwareSourceCode"],
                "name": "Executed notebook",
                "sha256": run.get("output_sha256"),
            },
            {
                "@id": names["metrics"],
                "@type": "File",
                "name": "Experiment metrics",
                "encodingFormat": "text/csv",
            },
        ]
        crate = {
            "@context": "https://w3id.org/ro/crate/1.1/context",
            "@graph": graph,
        }
        crate_path = folder / crate_name
        temporary = crate_path.with_suffix(".json.tmp")
        temporary.write_text(json.dumps(crate, indent=2, ensure_ascii=False) + "\n")
        temporary.replace(crate_path)
        previous_generation = (state.get("crate") or {}).get("generation", 0)
        state["crate"] = {
            "name": crate_name,
            "path": str(crate_path.relative_to(self.root)),
            "generated_at": generated,
            "configuration_revision": state["configuration_revision"],
            "generation": previous_generation + 1,
        }
        if state.get("publication"):
            state["publication"]["stale"] = True
        self._write_state(folder, state)
        return self.get(relative)
