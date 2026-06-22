---
id: ecojupyter
title: 2. Install Jupyter VRE Workflow
sidebar_position: 2
---

# Install Jupyter VRE Workflow

Install the Python package inside the same environment where JupyterLab runs.

## From PyPI (recommended)

```bash
pip install --upgrade ecojupyter
```

## Restart and verify

1. Restart JupyterLab (`Ctrl+C`, then `jupyter lab --ip 0.0.0.0 --port 8888`)
2. Refresh the browser if the panel does not appear immediately
3. The **Jupyter VRE Workflow** tab should appear in the left sidebar

> **Screenshot placeholder** — Jupyter VRE Workflow sidebar panel open in JupyterLab

## Development install (contributors only)

For live-reload development, use the repository scripts instead of the PyPI package:

```bash
git clone https://github.com/g-uva/EcoJupyter.git jupyter-vre-workflow
cd jupyter-vre-workflow
source .venv/bin/activate
pip install -ve .
jupyter labextension develop --overwrite .

# In a second terminal, watch TypeScript sources
yarn install && yarn watch
```

See the [README](https://github.com/g-uva/EcoJupyter#development--extension-framework) for the full development workflow.

## Next step

With the extension installed, proceed to [Install the modules](./modules).
