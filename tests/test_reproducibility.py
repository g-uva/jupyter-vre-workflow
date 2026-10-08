import ast
import csv
import json
import tempfile
import textwrap
import unittest
from pathlib import Path

from jupyter_vre_workflow.reproducibility import (
    CIM_METADATA_PROFILES,
    CLOUD_FIELD_REGISTRY,
    CLOUD_FIELD_REGISTRY_VERSION,
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
        self.assertEqual(
            response["cloud_profile"]["registry_version"],
            CLOUD_FIELD_REGISTRY_VERSION,
        )

    def test_embedded_and_kubernetes_mock_registries_match(self):
        manifest = Path("deploy/kubernetes/demo-cim.yaml").read_text()
        script = manifest.split("  server.py: |\n", 1)[1].split("\n---", 1)[0]
        module = ast.parse(textwrap.dedent(script))
        values = {}
        for node in module.body:
            if isinstance(node, ast.Assign) and len(node.targets) == 1:
                target = node.targets[0]
                if isinstance(target, ast.Name) and target.id in {
                    "METADATA_PROFILES",
                    "FIELD_REGISTRY",
                }:
                    values[target.id] = ast.literal_eval(node.value)
        self.assertEqual(values["METADATA_PROFILES"], CIM_METADATA_PROFILES)
        self.assertEqual(values["FIELD_REGISTRY"], CLOUD_FIELD_REGISTRY)

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
        self.assertEqual(
            graph["#run-run-1"]["actionStatus"],
            {"@id": "https://schema.org/CompletedActionStatus"},
        )
        self.assertEqual(graph["#standard-greendigit-commons"]["name"], "GreenDIGIT Commons")
        self.assertEqual(
            graph["#metadata-profile-default"]["name"],
            "GreenDIGIT Cloud detailed",
        )
        self.assertEqual(graph["metrics.csv"]["encodingFormat"], "text/csv")
        self.assertIn("eimps-cloud.json", graph)
        self.assertIn("cim-record.json", graph)

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
        self.assertTrue(configured["crate_current"])
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
            graph["#metadata-profile-compact-energy"]["version"],
            "2026.1-compact",
        )
        compact_cim = json.loads((self.folder / "cim-record.json").read_text())
        self.assertEqual(
            compact_cim["measurement_collection"],
            "JuVRE energy metric inventory",
        )
        self.assertNotIn("observed_value_range", compact_cim["measurements"][0])

    def test_mapping_change_invalidates_generated_crate(self):
        self.manager.configure(self.relative, "greendigit-commons", {})
        self.manager.mark_cim_connected(self.relative, {
            "endpoint": "embedded://demo-cim", "identity": "gd-super-user"
        })
        self.manager.generate_crate(self.relative)
        changed = self.manager.configure(
            self.relative, "iec-cim", {"metric_term": "cim:Measurement"}
        )
        self.assertTrue(changed["crate_current"])

    def test_cloud_export_types_conversion_provenance_and_crate_links(self):
        with (self.folder / "metrics.csv").open("w", newline="") as stream:
            writer = csv.writer(stream)
            writer.writerow(
                ["timestamp_utc", "timestamp_unix", "metric", "labels", "value", "unit"]
            )
            writer.writerow(
                [
                    "2026-10-06T10:00:00Z",
                    "1",
                    "energy_j",
                    json.dumps({"attribution": "run"}),
                    "0",
                    "joules",
                ]
            )
            writer.writerow(
                [
                    "2026-10-06T10:01:00Z",
                    "61",
                    "energy_j",
                    json.dumps({"attribution": "run"}),
                    "3600",
                    "joules",
                ]
            )
        cloud = {
            "group": "greendigit",
            "site_name": "TEST-SITE",
            "cloud_type": "openstack",
            "cloud_compute_service": "test-compute",
            "owner": "vo.greendigit.egi.eu",
        }
        self.manager.configure(
            self.relative, "greendigit-commons", {}, "default", cloud
        )
        self.manager.mark_cim_connected(
            self.relative,
            {"endpoint": "embedded://demo-cim", "identity": "gd-super-user"},
        )
        state = self.manager.generate_crate(self.relative)
        payload = json.loads((self.folder / "eimps-cloud.json").read_text())
        cim = json.loads((self.folder / "cim-record.json").read_text())
        crate = json.loads((self.folder / "ro-crate-metadata.json").read_text())

        self.assertTrue(state["crate"]["eimps_ready"])
        self.assertEqual(payload["EnergyWh"], 1.0)
        self.assertIsInstance(payload["WallClockTime_s"], int)
        self.assertIsInstance(payload["ExecUnitFinished"], int)
        self.assertNotIn("ri_type", payload)
        self.assertNotIn("publisher_email", payload)
        for unsupported in (
            "Work",
            "Efficiency",
            "CpuDuration_s",
            "SuspendDuration_s",
            "CPUNormalizationFactor",
        ):
            self.assertNotIn(unsupported, payload)
        self.assertEqual(cim["eimps_cloud"], payload)
        self.assertIn("environment", cim)
        energy = next(
            item for item in cim["measurements"] if item.get("canonical_unit") == "Wh"
        )
        self.assertEqual(energy["converted_value"], payload["EnergyWh"])
        graph = {item["@id"]: item for item in crate["@graph"]}
        for name in (
            "notebook.ipynb",
            "executed.ipynb",
            "metrics.csv",
            "run.json",
            "eimps-cloud.json",
            "cim-record.json",
        ):
            self.assertIn(name, graph)
            self.assertTrue(graph[name]["sha256"])
        self.assertEqual(
            graph["eimps-cloud.json"]["isBasedOn"],
            [{"@id": "run.json"}, {"@id": "metrics.csv"}],
        )
        self.assertEqual(graph["#run-run-1"]["actionStatus"], {
            "@id": "https://schema.org/CompletedActionStatus"
        })
        self.assertEqual(
            graph["eimps-cloud.json"]["additionalProperty"]["value"],
            "EIMPS-ready",
        )

    def test_unattributed_host_energy_exports_draft_without_fabricated_values(self):
        self.manager.configure(self.relative, "greendigit-commons", {})
        self.manager.mark_cim_connected(
            self.relative,
            {"endpoint": "embedded://demo-cim", "identity": "gd-super-user"},
        )
        state = self.manager.generate_crate(self.relative)
        payload = json.loads((self.folder / "eimps-cloud.json").read_text())
        cim = json.loads((self.folder / "cim-record.json").read_text())
        self.assertFalse(state["crate"]["eimps_ready"])
        self.assertNotIn("EnergyWh", payload)
        self.assertIn("EnergyWh", cim["validation"]["missing_required_fields"])
        self.assertIn(
            "energy_not_attributable_to_run", cim["validation"]["quality_flags"]
        )

    def test_run_labelled_scaphandre_power_is_integrated_to_wh(self):
        with (self.folder / "metrics.csv").open("w", newline="") as stream:
            writer = csv.writer(stream)
            writer.writerow(
                ["timestamp_utc", "timestamp_unix", "metric", "labels", "value", "unit"]
            )
            labels = json.dumps({"experiment_id": "run-1", "pid": "123"})
            writer.writerow(
                ["start", "0", "scaph_process_power_consumption_microwatts", labels, "1000000", "microwatts"]
            )
            writer.writerow(
                ["end", "3600", "scaph_process_power_consumption_microwatts", labels, "1000000", "microwatts"]
            )
        cloud = {
            "group": "greendigit",
            "site_name": "TEST-SITE",
            "cloud_type": "openstack",
            "cloud_compute_service": "test-compute",
            "owner": "vo.greendigit.egi.eu",
        }
        self.manager.configure(
            self.relative, "greendigit-commons", {}, "default", cloud
        )
        self.manager.mark_cim_connected(
            self.relative,
            {"endpoint": "embedded://demo-cim", "identity": "gd-super-user"},
        )
        self.manager.generate_crate(self.relative)
        payload = json.loads((self.folder / "eimps-cloud.json").read_text())
        self.assertEqual(payload["EnergyWh"], 1.0)

    def test_source_data_change_invalidates_and_regenerates_exports(self):
        self.manager.configure(self.relative, "greendigit-commons", {})
        self.manager.mark_cim_connected(
            self.relative,
            {"endpoint": "embedded://demo-cim", "identity": "gd-super-user"},
        )
        first = self.manager.generate_crate(self.relative)
        with (self.folder / "metrics.csv").open("a") as stream:
            stream.write('later,2,energy_j,"{}",5,joules\n')
        stale = self.manager.get(self.relative)
        self.assertFalse(stale["crate_current"])
        regenerated = self.manager.generate_crate(self.relative)
        self.assertTrue(regenerated["crate_current"])
        self.assertNotEqual(
            first["crate"]["source_revision"], regenerated["crate"]["source_revision"]
        )

    def test_descriptive_editor_maps_to_exact_ro_crate_locations(self):
        self.manager.configure(
            self.relative,
            "greendigit-commons",
            {},
            "default",
            None,
            {
                "title": "Workshop result",
                "description": "A participant-controlled description.",
                "creator": "Example Researcher",
                "organization": "Example Lab",
                "license": "https://spdx.org/licenses/CC-BY-4.0.html",
                "environment_information": "Python training kernel",
            },
        )
        self.manager.mark_cim_connected(
            self.relative,
            {"endpoint": "embedded://demo-cim", "identity": "gd-super-user"},
        )
        state = self.manager.generate_crate(self.relative)
        crate = json.loads((self.folder / "ro-crate-metadata.json").read_text())
        graph = {item["@id"]: item for item in crate["@graph"]}
        self.assertEqual(graph["./"]["name"], "Workshop result")
        self.assertEqual(graph["./"]["creator"], {"@id": "#creator"})
        self.assertEqual(graph["#creator"]["affiliation"], {
            "@id": "#creator-organization"
        })
        self.assertEqual(
            graph["notebook.ipynb"]["additionalType"],
            "https://schema.org/SoftwareSourceCode",
        )
        self.assertTrue(state["export_comparison"]["current_revision"])

    def test_invalid_publication_identifier_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "absolute HTTP"):
            self.manager.configure(
                self.relative,
                "greendigit-commons",
                {},
                "default",
                None,
                {"publication_reference": "not-a-uri"},
            )

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
        self.manager.connect_fdmi(self.relative)
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
        self.manager.connect_fdmi(self.relative)
        self.manager.publish(self.relative)
        regenerated = self.manager.configure(
            self.relative,
            "greendigit-commons",
            {},
            "default",
            None,
            {"title": "Changed title"},
        )
        self.assertTrue(regenerated["publication"]["stale"])

    def test_fdmi_catalogue_persists_idempotent_versions(self):
        self.manager.configure(self.relative, "greendigit-commons", {})
        self.manager.mark_cim_connected(
            self.relative,
            {"endpoint": "embedded://demo-cim", "identity": "gd-super-user"},
        )
        self.manager.generate_crate(self.relative)
        self.manager.connect_fdmi(self.relative)
        first = self.manager.publish(self.relative)
        second = ReproducibilityManager(self.root).fdmi_catalogue()
        self.assertEqual(first["publication"]["version"], 1)
        self.assertEqual(len(second), 1)
        self.assertEqual(second[0]["version"], 1)


if __name__ == "__main__":
    unittest.main()
