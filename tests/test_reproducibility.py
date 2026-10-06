import csv
import json
import tempfile
import unittest
from pathlib import Path

from jupyter_vre_workflow.reproducibility import CimDemoClient, ReproducibilityManager


class CimDemoTests(unittest.TestCase):
    def test_embedded_demo_has_truthful_identity_and_default(self):
        response = CimDemoClient(endpoint="").connect()
        self.assertTrue(response["connected"])
        self.assertEqual(response["identity"], "gd-super-user")
        self.assertIn("Simulated", response["identity_note"])
        self.assertEqual(response["default_standard"], "greendigit-commons")
        self.assertEqual(len(response["standards"]), 5)
        self.assertIn("not an authoritative", response["standards"][0]["compliance"])

    def test_invalid_or_failed_service_is_not_connected(self):
        with self.assertRaisesRegex(RuntimeError, "invalid response"):
            CimDemoClient("http://mock", fetch_json=lambda _: {}).connect()
        with self.assertRaisesRegex(RuntimeError, "not accepted"):
            CimDemoClient(
                "http://mock",
                fetch_json=lambda _: {
                    "authenticated": False,
                    "identity": "nobody",
                    "standards": [],
                    "default_standard": "none",
                },
            ).connect()


class ReproducibilityStateTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.folder = self.root / "experiments" / "demo" / "run-1"
        self.folder.mkdir(parents=True)
        (self.folder / "run.json").write_text(json.dumps({
            "id": "run-1", "workflow_id": "demo", "status": "succeeded",
            "artifacts": {"metrics": "metrics.csv"}
        }))
        with (self.folder / "metrics.csv").open("w", newline="") as stream:
            writer = csv.writer(stream)
            writer.writerow(["timestamp_utc", "timestamp_unix", "metric", "labels", "value", "unit"])
            writer.writerow(["now", "1", "energy_j", "{}", "4.2", "joules"])
        self.relative = "experiments/demo/run-1"
        self.manager = ReproducibilityManager(self.root)

    def tearDown(self):
        self.temporary.cleanup()

    def test_configuration_is_per_experiment_and_previews_metrics(self):
        state = self.manager.configure(
            self.relative, "greendigit-commons", {"metric_term": "gd:EnergyObservation"}
        )
        self.assertTrue(state["configured"])
        self.assertEqual(state["preview"]["metrics"][0]["source"], "energy_j")
        self.assertEqual(state["preview"]["metrics"][0]["mapped_type"], "gd:EnergyObservation")
        self.assertTrue((self.folder / "reproducibility.json").is_file())

    def test_only_safe_mapping_fields_are_accepted(self):
        with self.assertRaisesRegex(ValueError, "Only the preview"):
            self.manager.configure(self.relative, "iec-cim", {"endpoint": "evil"})


if __name__ == "__main__":
    unittest.main()
