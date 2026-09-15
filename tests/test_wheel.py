import os
import unittest
import zipfile


class WheelContentsTests(unittest.TestCase):
    def test_built_wheel_contains_runtime_files(self):
        wheel = os.environ.get("JUPYTER_VRE_WORKFLOW_WHEEL")
        if not wheel:
            self.skipTest("set JUPYTER_VRE_WORKFLOW_WHEEL to validate a built wheel")
        with zipfile.ZipFile(wheel) as archive:
            names = set(archive.namelist())
        required = {
            "jupyter_vre_workflow/__init__.py",
            "jupyter_vre_workflow/experiments.py",
            "jupyter_vre_workflow/handlers.py",
            "jupyter_vre_workflow/telemetry.py",
        }
        self.assertTrue(required.issubset(names), required - names)
        data_files = {
            name.split(".data/data/", 1)[1]
            for name in names
            if ".data/data/" in name
        }
        self.assertIn(
            "etc/jupyter/jupyter_server_config.d/jupyter_vre_workflow.json",
            data_files,
        )
        extension = "share/jupyter/labextensions/jupyter-vre-workflow/"
        self.assertIn(extension + "package.json", data_files)
        self.assertIn(extension + "install.json", data_files)
        self.assertIn(extension + "static/style.js", data_files)
        self.assertTrue(
            any(
                name.startswith(extension + "static/remoteEntry.")
                and name.endswith(".js")
                for name in data_files
            )
        )


if __name__ == "__main__":
    unittest.main()
