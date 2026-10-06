import unittest

from jupyter_vre_workflow.reproducibility import CimDemoClient


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


if __name__ == "__main__":
    unittest.main()
