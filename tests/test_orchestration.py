import asyncio
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from jupyter_vre_workflow.orchestration import (
    FederationDemoClient,
    OrchestrationManager,
)


class RegistrationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.manager = OrchestrationManager(self.root)

    def make_experiment(self, experiment_id="run-1", status="succeeded"):
        folder = self.root / "juvre" / "experiments" / "demo" / experiment_id
        folder.mkdir(parents=True)
        (folder / "notebook.ipynb").write_text("{}")
        (folder / "executed.ipynb").write_text("{}")
        (folder / "metrics.csv").write_text(
            "timestamp_utc,timestamp_unix,metric,labels,value,unit\n"
            "now,1,energy_j,{},720,joules\n"
            "now,1,average_power_w,{},120,watts\n"
        )
        (folder / "run.json").write_text(json.dumps({
            "id": experiment_id, "workflow_id": "demo", "status": status,
            "start_time": "2026-10-06T10:00:00Z", "end_time": "2026-10-06T10:00:06Z",
            "artifacts": {"input": "notebook.ipynb", "output": "executed.ipynb", "metrics": "metrics.csv"}
        }))
        return f"juvre/experiments/demo/{experiment_id}"

    def register_alice(self):
        return self.manager.register("alice", {
            "node_name": "GD-DEMO-001", "site": "Athens",
            "operator": "Alice", "contact": "alice@example.org"
        })

    def tearDown(self):
        self.temporary.cleanup()

    def test_unregistered_user_only_sees_greek_site(self):
        state = self.manager.get_registration("alice@example.org")
        self.assertFalse(state["registered"])
        self.assertEqual([site["id"] for site in state["sites"]], ["GRNET"])
        self.assertEqual(state["selected_site_id"], "GRNET")

    def test_registration_is_persisted_and_isolated_by_user(self):
        alice = self.manager.register("alice@example.org", {
            "node_name": self.manager.default_node_name("alice@example.org"),
            "site": "Athens, Greece", "operator": "Alice", "contact": "alice@example.org"
        })
        self.assertTrue(alice["registered"])
        self.assertEqual(alice["registration"]["vo"], "GD-AS-DEMO")
        self.assertGreater(len(alice["sites"]), 1)
        self.assertFalse(self.manager.get_registration("bob@example.org")["registered"])
        path = self.manager.user_folder("alice@example.org") / "registration.json"
        self.assertEqual(json.loads(path.read_text())["node_name"], alice["registration"]["node_name"])

    def test_default_node_names_are_stable_and_user_specific(self):
        self.assertEqual(
            self.manager.default_node_name("alice"),
            self.manager.default_node_name("alice"),
        )
        self.assertNotEqual(
            self.manager.default_node_name("alice"),
            self.manager.default_node_name("bob"),
        )

    def test_failed_demo_registration_is_not_persisted(self):
        client = FederationDemoClient(
            "http://invalid.test", post_json=lambda _url, _payload: {"accepted": False}
        )
        manager = OrchestrationManager(self.root, client)
        with self.assertRaisesRegex(RuntimeError, "not accepted"):
            manager.register("alice", {
                "node_name": "GD-DEMO-001", "site": "Athens",
                "operator": "Alice", "contact": "alice@example.org"
            })
        self.assertFalse(manager.get_registration("alice")["registered"])

    def test_local_metadata_uses_ro_crate_when_present_and_sync_is_not_fdmi(self):
        self.register_alice()
        relative = self.make_experiment()
        folder = self.root / relative
        (folder / "ro-crate-metadata.json").write_text('{"@graph": []}')
        local = self.manager.select_metadata("alice", relative)
        self.assertEqual(local["metadata_status"], "Local")
        self.assertTrue(local["minimum_ready"])
        self.assertIn("RO-Crate", local["source"])
        online = self.manager.sync_metadata("alice", relative)
        self.assertEqual(online["metadata_status"], "Local and online")
        self.assertIn("not FDMI", online["online_definition"])

    def test_failed_sync_preserves_local_metadata(self):
        self.register_alice()
        relative = self.make_experiment()
        from jupyter_vre_workflow.orchestration import CatalogueDemoClient
        self.manager.catalogue_client = CatalogueDemoClient(
            "http://invalid.test", post_json=lambda _url, _payload: {"accepted": False}
        )
        with self.assertRaisesRegex(RuntimeError, "did not accept"):
            self.manager.sync_metadata("alice", relative)
        metadata = self.manager.experiment_folder("alice", "run-1") / "metadata.json"
        self.assertTrue(metadata.is_file())
        self.assertIsNone(json.loads(metadata.read_text())["sync"])

    def test_incomplete_experiment_explains_missing_inputs(self):
        self.register_alice()
        relative = self.make_experiment(status="failed")
        local = self.manager.select_metadata("alice", relative)
        self.assertFalse(local["minimum_ready"])
        self.assertIn("a successful run status", local["missing"])

    def test_two_users_share_download_and_hash_verify_safe_bundles(self):
        self.register_alice()
        self.manager.register("bob", {
            "node_name": "GD-DEMO-002", "site": "Amsterdam",
            "operator": "Bob", "contact": "bob@example.org"
        })
        relative = self.make_experiment()
        shared = self.manager.share_experiment("alice", relative)
        self.assertEqual(self.manager.catalogue()[0]["owner_display_name"], "Alice")
        bundle = self.manager.bundle_path(shared["catalogue_id"])
        with zipfile.ZipFile(bundle) as archive:
            self.assertIn("manifest.json", archive.namelist())
            self.assertNotIn("reproducibility.json", archive.namelist())
        imported = self.manager.import_shared("bob", shared["catalogue_id"])
        self.assertTrue(imported["verified"])
        self.assertEqual(imported["source_run_id"], "run-1")
        source = self.manager.catalogue_folder() / shared["catalogue_id"] / "metrics.csv"
        source.write_text("tampered")
        with self.assertRaisesRegex(ValueError, "Hash verification failed"):
            self.manager.import_shared("bob", shared["catalogue_id"])


class PredictionTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.manager = OrchestrationManager(self.root, prediction_site_seconds=0)
        self.manager.register("alice", {
            "node_name": "GD-DEMO-001", "site": "Athens",
            "operator": "Alice", "contact": "alice@example.org"
        })
        helper = RegistrationTests()
        helper.root = self.root
        self.relative = helper.make_experiment()

    async def asyncTearDown(self):
        if self.manager.prediction_tasks:
            await asyncio.gather(*self.manager.prediction_tasks.values(), return_exceptions=True)
        self.temporary.cleanup()

    async def test_two_sites_are_sequential_stable_and_unit_correct(self):
        self.manager.start_prediction("alice", self.relative, ["GRNET", "NIKHEF"])
        await asyncio.gather(*list(self.manager.prediction_tasks.values()))
        first = self.manager.get_prediction("alice", self.relative)
        self.assertEqual(first["status"], "completed")
        self.assertEqual([q["status"] for q in first["queue"]], ["completed", "completed"])
        result = first["results"][0]
        expected_it = 120 * 6 / 3_600_000
        self.assertAlmostEqual(result["training"]["it_energy_kwh"], expected_it)
        self.assertAlmostEqual(result["training"]["facility_energy_kwh"], expected_it * 1.48)
        self.assertAlmostEqual(
            result["training"]["operational_emissions_gco2e"], expected_it * 1.48 * 380
        )
        self.manager.start_prediction("alice", self.relative, ["GRNET"])
        await asyncio.gather(*list(self.manager.prediction_tasks.values()))
        repeated = self.manager.get_prediction("alice", self.relative)
        self.assertEqual(repeated["results"][0]["training"], result["training"])

    async def test_cancelled_queue_is_persisted(self):
        self.manager.prediction_site_seconds = 0.2
        self.manager.start_prediction("alice", self.relative, ["GRNET", "NIKHEF"])
        await asyncio.sleep(0.01)
        self.manager.cancel_prediction("alice", self.relative)
        await asyncio.gather(*list(self.manager.prediction_tasks.values()))
        self.assertEqual(self.manager.get_prediction("alice", self.relative)["status"], "cancelled")


class SimulatedOrchestrationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.manager = OrchestrationManager(
            self.root, prediction_site_seconds=0, orchestration_stage_seconds=0
        )
        self.manager.register("alice", {
            "node_name": "GD-DEMO-001", "site": "Athens",
            "operator": "Alice", "contact": "alice@example.org"
        })
        helper = RegistrationTests()
        helper.root = self.root
        self.relative = helper.make_experiment()
        self.manager.start_prediction("alice", self.relative, ["GRNET", "NIKHEF"])
        await asyncio.gather(*list(self.manager.prediction_tasks.values()))

    async def asyncTearDown(self):
        if self.manager.orchestration_tasks:
            await asyncio.gather(*self.manager.orchestration_tasks.values(), return_exceptions=True)
        self.temporary.cleanup()

    async def test_simulated_run_saves_timeline_result_and_comparison(self):
        self.manager.start_orchestration("alice", self.relative, "NIKHEF")
        await asyncio.gather(*list(self.manager.orchestration_tasks.values()))
        state = self.manager.get_orchestration("alice", self.relative)
        self.assertEqual(state["status"], "completed")
        self.assertEqual(len(state["log"]), 8)
        self.assertGreater(state["log"][1]["relative_duration_weight"], state["log"][0]["relative_duration_weight"])
        self.assertEqual(state["result"]["site"]["id"], "NIKHEF")
        self.assertNotEqual(state["actual_demo_elapsed_s"], state["result"]["modelled_workload_duration_s"])
        folder = self.manager.experiment_folder("alice", "run-1")
        self.assertTrue((folder / "orchestration-log.json").is_file())
        self.assertTrue((folder / "comparison.json").is_file())
        comparison = json.loads((folder / "comparison.json").read_text())
        self.assertIsNone(comparison["original"]["facility_energy_kwh"])
        self.assertIn("no remote execution", comparison["notice"])

    async def test_target_result_is_deterministic_and_requires_prediction(self):
        prediction = self.manager.get_prediction("alice", self.relative)["results"][0]
        local = self.manager.select_metadata("alice", self.relative)
        first = self.manager._simulated_target_result(local, prediction)
        second = self.manager._simulated_target_result(local, prediction)
        self.assertEqual(first, second)
        with self.assertRaisesRegex(ValueError, "completed prediction"):
            self.manager.start_orchestration("alice", self.relative, "KIT")

    async def test_multi_site_attempts_have_separate_mock_results(self):
        self.manager.start_orchestration(
            "alice", self.relative, ["GRNET", "NIKHEF"]
        )
        await asyncio.gather(*list(self.manager.orchestration_tasks.values()))
        state = self.manager.get_orchestration("alice", self.relative)
        self.assertEqual(state["status"], "completed")
        self.assertEqual(len(state["attempts"]), 2)
        self.assertEqual(
            {item["status"] for item in state["attempts"]}, {"completed"}
        )
        self.assertTrue(all(item["simulated"] for item in state["attempts"]))
        self.assertNotEqual(
            state["attempts"][0]["attempt_id"],
            state["attempts"][1]["attempt_id"],
        )

    async def test_multi_site_partial_failure_preserves_success(self):
        original = self.manager._simulated_target_result

        def one_failure(local, prediction):
            if prediction["site"]["id"] == "NIKHEF":
                raise RuntimeError("demo site unavailable")
            return original(local, prediction)

        self.manager._simulated_target_result = one_failure
        self.manager.start_orchestration(
            "alice", self.relative, ["GRNET", "NIKHEF"]
        )
        await asyncio.gather(*list(self.manager.orchestration_tasks.values()))
        state = self.manager.get_orchestration("alice", self.relative)
        self.assertEqual(state["status"], "partial")
        self.assertEqual(
            [item["status"] for item in state["attempts"]],
            ["completed", "failed"],
        )

    async def test_two_site_bundles_and_fdmi_records_are_independent_persistent_and_idempotent(self):
        source = self.root / self.relative
        (source / "cim-record.json").write_text('{"kind":"cim"}')
        (source / "eimps-cloud.json").write_text('{"kind":"eimps"}')
        self.manager.start_orchestration(
            "alice", self.relative, ["GRNET", "NIKHEF"]
        )
        await asyncio.gather(*list(self.manager.orchestration_tasks.values()))
        state = self.manager.get_orchestration("alice", self.relative)
        attempt_ids = [item["attempt_id"] for item in state["attempts"]]

        bundles = [
            self.manager.result_bundle_path("alice", self.relative, attempt_id)
            for attempt_id in attempt_ids
        ]
        self.assertNotEqual(bundles[0], bundles[1])
        for attempt_id, bundle in zip(attempt_ids, bundles):
            with zipfile.ZipFile(bundle) as archive:
                names = set(archive.namelist())
                self.assertIn("ro-crate-metadata.json", names)
                self.assertIn("prediction.json", names)
                self.assertIn("cim-record.json", names)
                self.assertIn("eimps-cloud.json", names)
                self.assertNotIn("executed.ipynb", names)
                provenance = json.loads(archive.read("provenance.json"))
                self.assertEqual(provenance["attempt_id"], attempt_id)
                self.assertEqual(provenance["original_experiment_id"], "run-1")
                self.assertEqual(provenance["mode"], "simulated")

        receipts = [
            self.manager.submit_result_fdmi("alice", self.relative, attempt_id)
            for attempt_id in attempt_ids
        ]
        self.assertNotEqual(receipts[0]["receipt"], receipts[1]["receipt"])
        self.assertEqual(receipts[0]["version"], 1)
        self.assertEqual(receipts[0]["original_experiment_id"], "run-1")
        self.assertEqual(receipts[0]["cim_record"], f"{self.relative}/cim-record.json")
        self.assertIn("prediction.json", receipts[0]["prediction_record"])
        self.assertEqual(
            self.manager.submit_result_fdmi("alice", self.relative, attempt_ids[0]),
            receipts[0],
        )

        restarted = OrchestrationManager(
            self.root, prediction_site_seconds=0, orchestration_stage_seconds=0
        )
        self.assertEqual(
            restarted.submit_result_fdmi("alice", self.relative, attempt_ids[0]),
            receipts[0],
        )
        shared = restarted.share_experiment("alice", self.relative)
        catalogue = restarted.catalogue()
        entry = next(item for item in catalogue if item["catalogue_id"] == shared["catalogue_id"])
        self.assertEqual(len(entry["site_results"]), 2)
        self.assertTrue(restarted.shared_result_bundle(attempt_ids[0]).is_file())

        orchestration_path = restarted.orchestration_path("alice", "run-1")
        changed = json.loads(orchestration_path.read_text())
        changed["attempts"][0]["result"]["training"]["duration_s"] += 1
        restarted._write_json(orchestration_path, changed)
        version_two = restarted.submit_result_fdmi(
            "alice", self.relative, attempt_ids[0]
        )
        self.assertEqual(version_two["version"], 2)
        self.assertNotEqual(version_two["receipt"], receipts[0]["receipt"])


if __name__ == "__main__":
    unittest.main()
