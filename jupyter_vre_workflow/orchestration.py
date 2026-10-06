"""Persistent services for the Autumn School orchestration demonstration."""

import hashlib
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


class OrchestrationManager:
    def __init__(self, root, federation_client=None):
        self.root = Path(root).resolve()
        self.federation_client = federation_client or FederationDemoClient()

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

    @staticmethod
    def _write_json(path, value):
        temporary = path.with_suffix(path.suffix + ".tmp")
        temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")
        temporary.replace(path)
