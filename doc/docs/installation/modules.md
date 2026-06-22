---
id: modules
title: 3. Install the Modules
sidebar_position: 3
---

# Installing the Extension Modules

Each of the three modules is installed directly from within the Jupyter VRE Workflow UI — no separate `pip install` steps needed.

## How to install a module

1. Open the **Jupyter VRE Workflow** panel in JupyterLab
2. Navigate to the tab for the module you want (Telemetry, Reproducibility, or Orchestration)
3. Click the **"Install module"** button
4. Follow any on-screen prompts to supply endpoint URLs or credentials

> **Screenshot placeholder** — "Install module" button highlighted in the Orchestration tab

## What gets configured automatically

- **Telemetry:** connects to your local Scaphandre and Prometheus endpoints; default ports are pre-filled (8080, 9090)
- **Reproducibility:** prompts for your FDMI catalogue endpoint and schema agreement; EIMPS/CIM and EIMPS/KPI URLs are also configurable
- **Orchestration:** prompts for the T6.3 Orchestrator endpoint and T6.2 module URL

:::info Mock endpoints available
If you do not yet have live FDMI or Orchestration endpoints, mock endpoints are provided for the tutorial. Enter them when prompted.
:::

## Keep credentials out of notebooks

Configure endpoint URLs and tokens through the Jupyter VRE Workflow settings UI or as environment variables — never hardcode them in a notebook cell.

## Next step

With at least one module installed, explore each module in detail:

- [Module 1 — Telemetry & Observability](../modules/telemetry)
- [Module 2 — Reproducibility & Storage](../modules/reproducibility)
- [Module 3 — Orchestration & Replay](../modules/orchestration)
