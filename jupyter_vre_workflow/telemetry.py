"""Read experiment telemetry from RAPL and Scaphandre/Prometheus."""

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="microseconds").replace("+00:00", "Z")


def metric_unit(name):
    """Infer the unit encoded in a Scaphandre metric name."""
    for suffix, unit in (
        ("_microjoules", "microjoules"),
        ("_microwatts", "microwatts"),
        ("_seconds", "seconds"),
        ("_bytes", "bytes"),
    ):
        if name.endswith(suffix):
            return unit
    return ""


class PrometheusReader:
    """Read all Scaphandre series from Prometheus over a time range."""

    def __init__(self, url=None, timeout=3, fetch_json=None):
        self.url = (url or os.environ.get(
            "JUPYTER_VRE_PROMETHEUS_URL", "http://127.0.0.1:9090"
        )).rstrip("/")
        self.timeout = timeout
        self.fetch_json = fetch_json or self._fetch_json

    def _fetch_json(self, url):
        with urlopen(url, timeout=self.timeout) as response:
            return json.load(response)

    def samples(self, start, end):
        query = urlencode({
            "query": '{__name__=~"scaph_.+"}',
            "start": start,
            "end": end,
            "step": 5,
        })
        payload = self.fetch_json(f"{self.url}/api/v1/query_range?{query}")
        if payload.get("status") != "success":
            raise RuntimeError(f"Prometheus query failed: {payload.get('error', 'unknown error')}")

        rows = []
        for series in payload.get("data", {}).get("result", []):
            labels = dict(series.get("metric", {}))
            name = labels.pop("__name__", "")
            if not name.startswith("scaph_"):
                continue
            for timestamp, value in series.get("values", []):
                timestamp = float(timestamp)
                rows.append({
                    "timestamp_utc": datetime.fromtimestamp(
                        timestamp, timezone.utc
                    ).isoformat(timespec="microseconds").replace("+00:00", "Z"),
                    "timestamp": timestamp,
                    "metric": name,
                    "labels": labels,
                    "value": value,
                    "unit": metric_unit(name),
                })
        return rows


class RaplReader:
    def __init__(self, root="/sys/class/powercap"):
        root = Path(root)
        # powercap class entries are often symlinks; glob each zone explicitly.
        counters = set(root.glob("*/energy_uj")) | set(root.glob("*/*/energy_uj"))
        counters |= set(root.glob("*/*/*/energy_uj"))
        zones = {}
        for counter in sorted(counters):
            counter = counter.resolve()
            if counter in zones:
                continue
            try:
                name = (counter.parent / "name").read_text().strip()
                maximum = int((counter.parent / "max_energy_range_uj").read_text())
                if name == "psys" or name.startswith("package-"):
                    zones[counter] = (name, maximum)
            except (OSError, ValueError):
                continue
        # psys includes package energy: never sum psys and packages together.
        platform = {p: z for p, z in zones.items() if z[0] == "psys"}
        self.zones = platform or zones
        if not self.zones:
            raise RuntimeError(
                f"No readable RAPL package/platform counters under {root}. "
                "Expose the host's powercap counters to this Jupyter server."
            )
        self.scope = "Platform (RAPL psys)" if platform else "CPU packages (RAPL)"
        self.previous = None
        self.started = None
        self.energy_uj = 0

    def sample(self):
        now = time.time()
        monotonic = time.monotonic()
        values = {p: int(p.read_text()) for p in self.zones}
        for path, value in values.items():
            maximum = self.zones[path][1]
            if maximum <= 0 or not 0 <= value <= maximum:
                raise RuntimeError(f"Invalid RAPL counter: {path}")
        power_w = None
        if self.previous is not None:
            previous_time, previous_values = self.previous
            delta = 0
            for path, value in values.items():
                maximum = self.zones[path][1]
                difference = value - previous_values[path]
                delta += difference if difference >= 0 else difference + maximum
            self.energy_uj += delta
            elapsed = monotonic - previous_time
            if elapsed > 0:
                power_w = delta / 1e6 / elapsed
        else:
            self.started = monotonic
        self.previous = (monotonic, values)
        duration = monotonic - self.started
        return {
            "timestamp": now,
            "timestamp_utc": datetime.fromtimestamp(now, timezone.utc).isoformat(timespec="microseconds").replace("+00:00", "Z"),
            "energy_j": self.energy_uj / 1e6,
            "current_power_w": power_w,
            "average_power_w": self.energy_uj / 1e6 / duration if duration > 0 else None,
            "sampled_duration_s": duration,
            "counters": [
                {"zone": p.parent.name, "name": self.zones[p][0],
                 "energy_uj": value, "max_energy_range_uj": self.zones[p][1]}
                for p, value in values.items()
            ],
        }
