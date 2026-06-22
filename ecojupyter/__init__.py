try:
    from ._version import __version__
except ImportError:
    # Fallback when using the package in dev mode without installing
    # in editable mode with pip. It is highly recommended to install
    # the package from a stable release or in editable mode: https://pip.pypa.io/en/stable/topics/local-project-installs/#editable-installs
    import warnings
    warnings.warn("Importing 'ecojupyter' outside a proper installation.")
    __version__ = "dev"


def _jupyter_labextension_paths():
    return [{
        "src": "labextension",
        "dest": "ecojupyter"
    }]


def _jupyter_server_extension_points():
    return [{"module": "ecojupyter"}]


def _load_jupyter_server_extension(server_app):
    from jupyter_server.utils import url_path_join

    from .handlers import MetricsInstallHandler

    host_pattern = ".*$"
    base_url = server_app.web_app.settings["base_url"]
    route = url_path_join(base_url, "api/run-install")
    server_app.web_app.add_handlers(host_pattern, [(route, MetricsInstallHandler)])
    server_app.log.info("Registered Jupyter VRE Workflow installer endpoint at %s", route)
