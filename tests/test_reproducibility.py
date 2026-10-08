import csv
import json
import tempfile
import unittest
from pathlib import Path

from jupyter_vre_workflow.reproducibility import (
    CimDemoClient,
    FdmiDemoClient,
    ReproducibilityManager,
)


class CimDemoTests(unittest.TestCase):
    def test_embedded_demo_has_truthful_identity_and_default(self):
        response = CimDemoClient(endpoint="").connect()
        self.assertTrue(response["connected"])
        self.assertEqual(response["identity"], "gd-super-user")
        self.assertIn("Simulated", response["identity_note"])
        self.assertEqual(response["default_standard"], "greendigit-commons")
        self.assertEqual(response["default_metadata_profile"], "default")
        self.assertEqual(len(response["standards"]), 5)
        self.assertEqual(len(response["metadata_profiles"]), 2)
        self.assertIn("not an authoritative", response["standards"][0]["compliance"])

    def test_invalid_or_failed_service_is_not_connected(self):
        with self.assertRaisesRegex(RuntimeError, "invalid response"):
            CimDemoClient("http://invalid.test", fetch_json=lambda _: {}).connect()
        with self.assertRaisesRegex(RuntimeError, "not accepted"):
            CimDemoClient(
                "http://invalid.test",
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
        self.folder = self.root / "juvre" / "experiments" / "demo" / "run-1"
        self.folder.mkdir(parents=True)
        (self.folder / "run.json").write_text(json.dumps({
            "id": "run-1", "workflow_id": "demo", "status": "succeeded",
            "start_time": "2026-10-06T10:00:00Z", "end_time": "2026-10-06T10:01:00Z",
            "input_sha256": "input-hash", "output_sha256": "output-hash",
            "artifacts": {"input": "notebook.ipynb", "output": "executed.ipynb", "metrics": "metrics.csv"}
        }))
        (self.folder / "notebook.ipynb").write_text("{}")
        (self.folder / "executed.ipynb").write_text("{}")
        with (self.folder / "metrics.csv").open("w", newline="") as stream:
            writer = csv.writer(stream)
            writer.writerow(["timestamp_utc", "timestamp_unix", "metric", "labels", "value", "unit"])
            writer.writerow(["now", "1", "energy_j", "{}", "4.2", "joules"])
        self.relative = "juvre/experiments/demo/run-1"
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

    def test_crate_requires_connection_and_contains_run_provenance(self):
        self.manager.configure(self.relative, "greendigit-commons", {})
        with self.assertRaisesRegex(ValueError, "Connect successfully"):
            self.manager.generate_crate(self.relative)
        self.manager.mark_cim_connected(self.relative, {
            "endpoint": "embedded://demo-cim", "identity": "gd-super-user"
        })
        state = self.manager.generate_crate(self.relative)
        self.assertTrue(state["crate_current"])
        self.assertEqual(state["crate"]["generation"], 1)
        crate = json.loads((self.folder / "ro-crate-metadata.json").read_text())
        self.assertEqual(crate["@context"], "https://w3id.org/ro/crate/1.1/context")
        graph = {item["@id"]: item for item in crate["@graph"]}
        self.assertIn("notebook.ipynb", graph)
        self.assertIn("executed.ipynb", graph)
        self.assertEqual(graph["#run-run-1"]["actionStatus"], "succeeded")
        self.assertEqual(graph["#standard-greendigit-commons"]["name"], "GreenDIGIT Commons")
        self.assertEqual(
            graph["#metadata-profile-default"]["name"],
            "Default experiment metadata",
        )
        self.assertEqual(
            graph["metrics.csv"]["additionalType"], "sosa:Observation"
        )

    def test_cim_metadata_profiles_produce_different_ro_crates(self):
        self.manager.configure(self.relative, "greendigit-commons", {})
        self.manager.mark_cim_connected(
            self.relative,
            {"endpoint": "embedded://demo-cim", "identity": "gd-super-user"},
        )
        default_state = self.manager.generate_crate(self.relative)
        default_crate = json.loads(
            (self.folder / "ro-crate-metadata.json").read_text()
        )

        configured = self.manager.configure(
            self.relative,
            "greendigit-commons",
            {},
            "compact-energy",
        )
        self.assertFalse(configured["crate_current"])
        self.assertEqual(
            configured["mapping"]["metric_term"], "schema:PropertyValue"
        )
        compact_state = self.manager.generate_crate(self.relative)
        compact_crate = json.loads(
            (self.folder / "ro-crate-metadata.json").read_text()
        )

        self.assertNotEqual(default_crate, compact_crate)
        self.assertEqual(
            compact_state["crate"]["metadata_profile_key"], "compact-energy"
        )
        self.assertNotEqual(
            default_state["configuration_revision"],
            compact_state["configuration_revision"],
        )
        graph = {item["@id"]: item for item in compact_crate["@graph"]}
        self.assertEqual(
            graph["metrics.csv"]["additionalType"], "schema:PropertyValue"
        )
        summary = next(
            item
            for item in graph["./"]["additionalProperty"]
            if item["name"] == "JuVRE energy metric inventory"
        )
        self.assertNotIn("minimum", summary["value"][0])

    def test_mapping_change_invalidates_generated_crate(self):
        self.manager.configure(self.relative, "greendigit-commons", {})
        self.manager.mark_cim_connected(self.relative, {
            "endpoint": "embedded://demo-cim", "identity": "gd-super-user"
        })
        self.manager.generate_crate(self.relative)
        changed = self.manager.configure(
            self.relative, "iec-cim", {"metric_term": "cim:Measurement"}
        )
        self.assertFalse(changed["crate_current"])

    def test_publish_requires_current_crate_and_is_idempotent(self):
        calls = []

        class RecordingFdmi(FdmiDemoClient):
            def submit(self, payload):
                calls.append(payload)
                return {"accepted": True, "receipt": "FDMI-DEMO-RECEIPT"}

        self.manager = ReproducibilityManager(self.root, RecordingFdmi(endpoint=""))
        self.manager.configure(self.relative, "greendigit-commons", {})
        with self.assertRaisesRegex(ValueError, "up-to-date"):
            self.manager.publish(self.relative)
        self.manager.mark_cim_connected(self.relative, {
            "endpoint": "embedded://demo-cim", "identity": "gd-super-user"
        })
        self.manager.generate_crate(self.relative)
        first = self.manager.publish(self.relative)
        second = self.manager.publish(self.relative)
        self.assertEqual(first["publication"]["receipt"], "FDMI-DEMO-RECEIPT")
        self.assertEqual(second["publication"]["receipt"], "FDMI-DEMO-RECEIPT")
        self.assertEqual(len(calls), 1)
        self.assertEqual(calls[0]["experiment_id"], "run-1")
        self.assertEqual(calls[0]["standard_key"], "greendigit-commons")

    def test_regeneration_makes_previous_publication_stale(self):
        self.manager.configure(self.relative, "greendigit-commons", {})
        self.manager.mark_cim_connected(self.relative, {
            "endpoint": "embedded://demo-cim", "identity": "gd-super-user"
        })
        self.manager.generate_crate(self.relative)
        self.manager.publish(self.relative)
        regenerated = self.manager.generate_crate(self.relative)
        self.assertTrue(regenerated["publication"]["stale"])


if __name__ == "__main__":
    unittest.main()
