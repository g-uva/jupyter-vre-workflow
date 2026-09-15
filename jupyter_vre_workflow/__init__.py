try:
    from ._version import __version__
except ImportError:
    # Fallback when using the package in dev mode without installing
    # in editable mode with pip. It is highly recommended to install
    # the package from a stable release or in editable mode: https://pip.pypa.io/en/stable/topics/local-project-installs/#editable-installs
    import warnings

    warnings.warn("Importing 'jupyter_vre_workflow' outside a proper installation.")
    __version__ = "dev"


def _jupyter_labextension_paths():
    return [{"src": "labextension", "dest": "jupyter-vre-workflow"}]


def _jupyter_server_extension_points():
    return [{"module": "jupyter_vre_workflow"}]


def _load_jupyter_server_extension(server_app):
    from .handlers import setup_handlers

    setup_handlers(server_app.web_app)
    server_app.log.info("Registered Jupyter VRE Workflow server extension")
