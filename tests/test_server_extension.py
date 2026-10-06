import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import Mock, patch

import jupyter_vre_workflow
from jupyter_vre_workflow.handlers import (
    ExperimentsHandler,
    MetricsInstallHandler,
    ModuleStatusHandler,
    get_module_status,
    setup_handlers,
)


class ServerExtensionTests(unittest.TestCase):
    def test_extension_point_uses_canonical_module(self):
        self.assertEqual(
            jupyter_vre_workflow._jupyter_server_extension_points(),
            [{"module": "jupyter_vre_workflow"}],
        )

    def test_setup_handlers_honours_non_root_base_url(self):
        with TemporaryDirectory() as root_dir:
            web_app = SimpleNamespace(
                settings={
                    "base_url": "/services/notebooks/",
                    "contents_manager": SimpleNamespace(root_dir=root_dir),
                },
                add_handlers=Mock(),
            )
            setup_handlers(web_app)

        web_app.add_handlers.assert_called_once()
        host_pattern, handlers = web_app.add_handlers.call_args.args
        self.assertEqual(host_pattern, ".*$")
        self.assertEqual(
            [route for route, *_ in handlers],
            [
                "/services/notebooks/api/jupyter-vre-workflow/experiments",
                "/services/notebooks/api/jupyter-vre-workflow/module-status",
                "/services/notebooks/api/jupyter-vre-workflow/run-install",
            ],
        )
        self.assertIs(handlers[0][1], ExperimentsHandler)
        self.assertEqual(Path(handlers[0][2]["manager"].root), Path(root_dir))
        self.assertIs(handlers[1][1], ModuleStatusHandler)
        self.assertIs(handlers[2][1], MetricsInstallHandler)

    def test_loader_registers_all_handlers(self):
        with TemporaryDirectory() as root_dir:
            web_app = SimpleNamespace(
                settings={
                    "base_url": "/",
                    "contents_manager": SimpleNamespace(root_dir=root_dir),
                },
                add_handlers=Mock(),
            )
            server_app = SimpleNamespace(web_app=web_app, log=Mock())
            jupyter_vre_workflow._load_jupyter_server_extension(server_app)
        self.assertEqual(len(web_app.add_handlers.call_args.args[1]), 3)

    def test_module_status_requires_both_telemetry_executables(self):
        with patch(
            "jupyter_vre_workflow.handlers._installed_executable"
        ) as installed_executable:
            installed_executable.side_effect = [
                {"installed": True, "path": "/bin/scaphandre"},
                {"installed": False, "path": None},
            ]
            status = get_module_status()

        self.assertFalse(status["telemetry"]["installed"])
        self.assertTrue(
            status["telemetry"]["components"]["scaphandre"]["installed"]
        )
        self.assertFalse(
            status["telemetry"]["components"]["prometheus"]["installed"]
        )

    def test_frontend_uses_canonical_experiments_url(self):
        source = Path("src/api/experiments.ts").read_text()
        self.assertIn("api/jupyter-vre-workflow/experiments", source)
        self.assertIn("jupyter-vre-workflow:experiment-started", source)

    def test_frontend_defaults_to_five_second_experiment_polling(self):
        source = Path("src/pages/WelcomePage.tsx").read_text()
        self.assertIn("DEFAULT_EXPERIMENT_POLL_INTERVAL_SECONDS = 5", source)
        self.assertNotIn("refreshRunningExperiment, 1000", source)


if __name__ == "__main__":
    unittest.main()
