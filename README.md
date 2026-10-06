# 🌱🌍♻️ Jupyter VRE Workflow (a [GreenDIGIT](https://greendigit-project.eu/) project)

Jupyter VRE Workflow is a platform-agnostic sustainability assessment tool for AI infrastructures. The current version is focused on Jupyter Notebook.

This tool was developed for the GreenDIGIT EU Project, with the main goal of providing a platform agnostic and easily-pluggable sustainability and reproducibility tool.

This code is open-source, so feel free to copy/paste it into your machine. Please, keep in mind that this is still WIP: it works best with [L1EcoVRE](https://github.com/g-uva/L1EcoVRE) infrastructure configuration and scripts. _For more info please contact the main contributor._

## Main features

- Run an entire notebook as a tracked experiment in a fresh kernel.
- Read real RAPL energy, current power and average power, with explicit unavailable status when hardware counters cannot be read.
- Save input/output notebooks, labelled raw metrics and precise run metadata in one experiment directory.
- Experimental FDMI publishing UI; external delivery is not yet verified.

Use **Run notebook as experiment** in the extension or command palette. Ordinary JupyterLab **Run All** does not create a tracked run. See the [experiment workflow and artifact layout](doc/docs/modules/reproducibility.md) and [hardware telemetry requirements](doc/docs/modules/telemetry.md).

It works best with [L1EcoVRE](https://github.com/g-uva/L1EcoVRE) infrastructure configuration and scripts. _For more info please contact the main contributor._

![Jupyter VRE Workflow main app](assets/jupyter-vre-workflow-screenshot.png)

## Installation

In order to install the tool as an extension in Jupyter Notebook or Lab (not in development), simply install the tool in your Python environment where Jupyter is running.

```sh
pip install --upgrade jupyter-vre-workflow
```

JuVRE is a prebuilt JupyterLab extension, so it does not require a JupyterLab
build. Refresh the browser after installing it into an environment before the
Jupyter server starts.

### Kubernetes installation without a post-install restart

Install JuVRE while building the notebook image instead of running `pip` in an
already-started pod:

```dockerfile
FROM quay.io/jupyter/base-notebook:latest

RUN python -m pip install --no-cache-dir --upgrade jupyter-vre-workflow
```

The resulting pod starts Jupyter once, with both the frontend and authenticated
server API already available. Pin the package version in production so that an
image rollout is reproducible.

Installing JuVRE into an already-running pod still requires that pod's Jupyter
server process to restart once. The package contains Python server handlers,
and Jupyter Server only discovers and imports newly installed handlers during
startup. For a service with multiple replicas, use a rolling Deployment update
with the derived image to avoid user-facing downtime rather than mutating live
pods.

## Development & Extension Framework

This repository was initially scaffolded using the official [JupyterLab Extension Tutorial](https://jupyterlab.readthedocs.io/en/stable/extension/extension_tutorial.html).  
As a result, the extension supports a development mode with **live reloading**, allowing for real-time updates to the UI as you modify TypeScript/React components.

To launch the development environment (as per the tutorial), run:

```bash
./scripts/start-jupyterlab-dev.sh
```

This uses the local `.venv` (creating it if needed), installs dependencies, builds and links this checkout, and starts JupyterLab with frontend watchers. Node.js 20+ and npm must be installed; Conda is not required. Refresh the browser after frontend changes; restart the script after Python backend changes. Press Ctrl+C to stop the server and watchers.

Python Package & Deployment
The Python package is published on PyPI and can be built locally via:

```bash
./scripts/build-rel-package.sh -m "Your release message"
```

This script automatically bumps the version, commits, tags, builds, and uploads to PyPI.

Before running it, create a `.env` file in the repo root with your PyPI token:

```
PYPI_TOKEN="pypi-your-token-here"
```

You can generate a token at [pypi.org/manage/account/token](https://pypi.org/manage/account/token/).

#### Future Improvements

- Version-based deployment: easily extendable via GitHub releases or semantic versioning.
- CI/CD integration: GitHub Actions workflows are already present and can be extended for linting, testing, and publishing.
- Custom builds: additional scripts like `install-conda.sh` and `uninstall-conda.sh` support environment setup and teardown, aiding reproducibility.

## Project structure

### API definitions

Tracked runs use the authenticated Jupyter server REST endpoint `api/jupyter-vre-workflow/experiments` to create, inspect and cancel experiments. `jupyter_vre_workflow/experiments.py` owns execution and persistence; `jupyter_vre_workflow/telemetry.py` reads the counters. The frontend client is `src/api/experiments.ts`. Tracking no longer injects bookkeeping code into the interactive notebook kernel.

Run the backend tests with `python -m unittest discover -s tests -v` in an environment with the project dependencies and `ipykernel` installed.

### Folder Structure

```txt
Jupyter VRE Workflow/
├── .copier-answers.yml
├── .gitignore
├── .prettierignore
├── .yarnrc.yml
├── CHANGELOG.md
├── LICENSE
├── README.md
├── RELEASE.md
├── Untitled.ipynb
├── install.json
├── package.json
├── pyproject.toml
├── setup.py
├── tsconfig.json
├── yarn.lock
├── .github
│   └── workflows
│       ├── binder-on-pr.yml
│       ├── build.yml
│       ├── check-release.yml
│       ├── enforce-label.yml
│       ├── prep-release.yml
│       ├── publish-release.yml
│       └── update-integration-tests.yml
├── assets
│   └── jupyter-vre-workflow-screenshot.png
├── jupyter_vre_workflow
│   └── __init__.py
└── scripts
│   ├── add-catalogue-entry.sh
│   ├── build-rel-package.sh
│   ├── install-conda.sh
│   ├── start-jupyterlab-dev.sh
│   └── uninstall-conda.sh
└── src
    ├── api
    │   ├── ApiTemp.ts
    │   ├── api-temp-openapi.yml
    │   ├── apiScripts.ts
    │   ├── getCarbonIntensityData.ts
    │   ├── getScaphData.ts
    │   ├── handleNotebookContents.ts
    │   └── monitorCellExecutions.ts
    ├── components
    │   ├── FetchMetricsComponents.tsx
    │   ├── KPIComponent.tsx
    │   ├── KpiValue.tsx
    │   ├── MetricSelector.tsx
    │   └── ...
    ├── dialog
    │   └── CreateChartDialog.tsx
    ├── helpers
    │   ├── constants.ts
    │   ├── types.ts
    │   └── utils.ts
    ├── index.ts
    └── widget.tsx
```

## Development setup

With Python 3 (including `venv` support), Node.js 20+ and npm installed, run:

```bash
./scripts/start-jupyterlab-dev.sh
```

The script uses this repository's `.venv`; no manual activation or Conda is needed. It builds the existing extension rather than creating a new project.

To prepare the environment without starting the server or watchers:

```bash
./scripts/start-jupyterlab-dev.sh --setup-only
```

Additional arguments are passed to JupyterLab, for example:

```bash
./scripts/start-jupyterlab-dev.sh --no-browser --port=8889
```
