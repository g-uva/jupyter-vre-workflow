---
id: reproducibility
title: Module 2 — Reproducibility & Storage
sidebar_position: 2
---

# Module 2: Reproducibility & Storage

This module captures notebook and session metadata, packages it as an [RO-Crate](https://www.researchobject.org/ro-crate/), and optionally exports it to a Federated Data Management Infrastructure (FDMI) catalogue or Zenodo.

## What it captures

- Workflow ID, experiment ID, timestamps
- Environment context (OS, platform, dependencies)
- Energy metrics from Module 1 (if active)
- Custom metadata fields agreed with the FDMI schema

## Experiment boundaries

The module tracks a defined experiment scope:

- **Start:** when you begin a notebook session or explicitly click "Start experiment"
- **End:** when the session ends or you click "Export metadata"

> **Screenshot placeholder** — Jupyter VRE Workflow metadata export dialog / catalogue entry form

## Configuring the FDMI endpoint

1. Open the **Reproducibility** tab in Jupyter VRE Workflow
2. Enter your FDMI catalogue endpoint URL (a mock endpoint is provided for the tutorial)
3. Confirm the schema agreement fields match your catalogue
4. Save — the connection is validated on save

:::info Mock endpoint
For the tutorial, use the provided mock FDMI endpoint. The UI and export flow are identical to a production endpoint.
:::

## Exporting metadata

1. Run your notebook cells
2. Click **"Export"** in the Reproducibility tab
3. Jupyter VRE Workflow packages the session metadata as an RO-Crate bundle
4. The bundle is saved locally and, if an endpoint is configured, pushed to the FDMI catalogue

### Optional: publish to Zenodo

The RO-Crate bundle can be uploaded to Zenodo for open-science archival. Provide a Zenodo API token in the Jupyter VRE Workflow settings.

## Optional: MetricsDB

If you want to persist energy metrics across sessions for long-term analysis:

1. Set up a time-series database (e.g., InfluxDB, TimescaleDB)
2. Enter the connection string in Jupyter VRE Workflow settings
3. Metrics from each session are written automatically

> **Screenshot placeholder** — config panel or DB query result showing stored metrics

## Keep credentials secure

- Never hardcode endpoint URLs or tokens inside notebook cells
- Use the Jupyter VRE Workflow settings UI or environment variables
- Keep your `.env` file out of version control (it is in `.gitignore`)

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Catalogue export fails | Verify endpoint URL, credentials, and that schema fields match the agreed format |
| RO-Crate bundle is empty | Confirm Module 1 (Telemetry) is active and the experiment boundaries were set |
| Zenodo upload rejected | Check the API token scope — it needs `deposit:write` |
