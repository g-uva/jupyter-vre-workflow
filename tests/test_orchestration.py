import json
import tempfile
import unittest
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
        folder = self.root / "experiments" / "demo" / experiment_id
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
        return f"experiments/demo/{experiment_id}"

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

    def test_failed_mock_registration_is_not_persisted(self):
        client = FederationDemoClient(
            "http://mock", post_json=lambda _url, _payload: {"accepted": False}
        )
        manager = OrchestrationManager(self.root, client)
        with self.assertRaisesRegex(RuntimeError, "rejected"):
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
            "http://mock", post_json=lambda _url, _payload: {"accepted": False}
        )
        with self.assertRaisesRegex(RuntimeError, "rejected"):
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


if __name__ == "__main__":
    unittest.main()
