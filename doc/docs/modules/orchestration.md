---
id: orchestration
title: Module 3 — Orchestration & Replay
sidebar_position: 3
---

# Module 3: Orchestration & Replay

This module connects Jupyter VRE Workflow to a T6.3 Orchestrator and the T6.2 module, enabling cross-site workflow replay and energy-aware placement.

:::note Mock endpoints
The T6.3 Orchestrator and T6.2 module endpoints are currently mock services. The configuration and UI flow are identical to what a production deployment will use.
:::

## The flow

```
Notebook
  └── Jupyter VRE Workflow (Jupyter VRE Workflow)
        └── Context + metadata ──► T6.3 Orchestrator
                                        └── Placement + execution ──► Site Runtime
```

1. Jupyter VRE Workflow captures the workflow context from the active notebook session
2. It sends the context and metadata to the T6.3 Orchestrator
3. The Orchestrator returns a placement decision (intra-site or inter-site)
4. The workflow is replayed or scheduled on the target site

## Configuring the connection

1. Open the **Orchestration** tab in Jupyter VRE Workflow
2. Click **"Install module"**
3. Enter the T6.3 Orchestrator endpoint URL
4. Enter the T6.2 module endpoint URL
5. Save — both connections are validated on save

> **Screenshot placeholder** — Jupyter VRE Workflow Orchestration tab with endpoint fields and status indicators

## Getting a placement prediction

1. With the module active, open a notebook that has been run at least once (so context exists)
2. Click **"Get placement prediction"** in the Orchestration tab
3. Jupyter VRE Workflow sends the workflow trace to the Orchestrator
4. The predicted placement (node, site, energy estimate) is displayed in the panel

> **Screenshot placeholder** — node map or placement result panel showing inter/intra-site assignment

## Replay a workflow

1. Select a previous experiment from the history list in the Orchestration tab
2. Click **"Replay"**
3. Jupyter VRE Workflow packages the workflow trace and submits it to the Orchestrator
4. Monitor execution status in the panel

## Connecting to an EGI Virtual Organisation (VO)

For inter-site federation:

1. Register your node with the VO endpoint (provided by your infrastructure operator)
2. Supply node ID, site metadata, and resource capacity
3. Set the placement policy in Jupyter VRE Workflow settings: `energy-aware` (default) or `latency-aware`

> **Screenshot placeholder** — VO registration screen or config file with fields highlighted

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Orchestration status stays pending | Verify endpoint URL and network access to the T6.3 host |
| Placement prediction fails | Ensure a completed notebook session with metadata exists before requesting a prediction |
| VO registration rejected | Check node ID format and that credentials match the VO's expected schema |
