"""Services and durable state for the Autumn School reproducibility demo."""

import json
import os
import csv
import hashlib
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

    def __init__(self, root):
        self.root = Path(root).resolve()

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
        (folder / self.STATE_FILE).write_text(
            json.dumps(previous, indent=2, ensure_ascii=False) + "\n"
        )
        return self.get(relative)
