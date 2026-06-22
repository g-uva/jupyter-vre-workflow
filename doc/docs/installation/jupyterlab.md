---
id: jupyterlab
title: 1. Install JupyterLab
sidebar_position: 1
---

# Install JupyterLab

Create an isolated Python environment, install JupyterLab, and verify it runs before installing Jupyter VRE Workflow.

## Create the environment

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
```

## Install JupyterLab

```bash
python -m pip install "jupyterlab>=4,<5"
```

## Launch JupyterLab

```bash
jupyter lab --ip 0.0.0.0 --port 8888
```

Open `http://localhost:8888` in your browser (use the token printed in the terminal on first launch). Confirm you can open a new notebook and execute a code cell.

:::tip Keep this environment active
All subsequent installation steps assume the same `.venv` environment is active. Always run `source .venv/bin/activate` before installing or launching.
:::

## Next step

Once JupyterLab opens successfully, proceed to [Install Jupyter VRE Workflow](./ecojupyter).
