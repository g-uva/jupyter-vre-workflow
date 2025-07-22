# 🌱🌍♻️ EcoJupyter (a [GreenDIGIT](https://greendigit-project.eu/) project)

`EcoJupyter` is an platform-agnostic sustainability assessment tool for AI infrastructures. The current version is focused on Jupyter Notebook.

This tool was developed for the GreenDIGIT EU Project, with the main goal of providing a platform agnostic and easily-pluggable sustainability and reproducibility tool.

## Main features
- Read energy metrics through Prometheus and Scaphandre in real-time charts.
- Energy computed KPIs such as SCI, SCI/Unit and Energy/Unit.
- Metadata manager and exporter for Federated Data Management Infrastructures (FDMI).

It works best with [JupyterK8sMonitor](https://github.com/g-uva/JupyterK8sMonitor) infrastructure configuration and scripts. _For more info please contact the main contributor._

![EcoJupyter_main_app](assets/EcoJupyter_screenshot.png)

## Installation
In order to install the tool as an extension in Jupyter Notebook or Lab (not in development), simply install the tool in your Python environment where Jupyter is running.
```sh
pip install --upgrade ecojupyter
```

## Development & Extension Framework

This repository was initially scaffolded using the official [JupyterLab Extension Tutorial](https://jupyterlab.readthedocs.io/en/stable/extension/extension_tutorial.html).  
As a result, the extension supports a development mode with **live reloading**, allowing for real-time updates to the UI as you modify TypeScript/React components.

To launch the development environment (as per the tutorial), run:

```bash
./scripts/start-jupyterlab-dev.sh
```

This will start JupyterLab in development mode, ideal for iterating on the UI and debugging extension logic interactively.

Python Package & Deployment
The Python package is published on PyPI and can be built locally via:

```bash
./scripts/build-rel-package.sh
```
This script automatically packages the extension and prepares it for upload, enabling a simple and consistent release workflow.

#### Future Improvements
- Version-based deployment: easily extendable via GitHub releases or semantic versioning.
- CI/CD integration: GitHub Actions workflows are already present and can be extended for linting, testing, and publishing.
- Custom builds: additional scripts like `install-conda.sh` and `uninstall-conda.sh` support environment setup and teardown, aiding reproducibility.

## Project structure

### API definitions
EcoJupyter's front-end connects with the server's back-end using the IPython kernel through the `IKernelConnection.executeRequest()` channel—used to execute Kernel request on demand, written in Python or as a shell script. In the future a full-fledge RESTful API should be implemented to properly enforce types, definitions and methods. For the POC timeline this was the most reasonable trade-off between flexibility and effectiveness.

The methods can be found in `apiScripts.ts` module file, with all the API-like methods used defined and self-described.

### Folder Structure
```txt
EcoJupyter/
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
│   └── EcoJupyter_screenshot.png
├── ecojupyter
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

