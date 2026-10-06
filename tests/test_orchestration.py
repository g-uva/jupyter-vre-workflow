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


if __name__ == "__main__":
    unittest.main()
