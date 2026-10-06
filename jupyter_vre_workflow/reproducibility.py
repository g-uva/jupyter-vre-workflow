"""Services and durable state for the Autumn School reproducibility demo."""

import json
import os
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
