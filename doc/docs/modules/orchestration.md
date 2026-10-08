---
id: orchestration
title: Module 3 — Orchestration demonstration
sidebar_position: 3
---

# Module 3: Orchestration demonstration

This Autumn School module is a local, repeatable simulation. It does not use a
live EGI federation, T6.2/T6.3 service, grid-carbon feed, VM, remote notebook
runner or remote output store.

## Workshop flow

1. Activate the bundled module. Activation is persisted by the Jupyter server;
   it is not an installation or a claim that an external service is reachable.
2. The initial map is centred on Greece and exposes only the local GRNET demo
   node. Register the pre-filled, per-user `GD-DEMO-…` node with demonstration VO
   `GD-AS-DEMO` to reveal the other stable demo sites.
3. Select an existing successful experiment using the page controls. JuVRE
   reads local `run.json`, `metrics.csv` and `ro-crate-metadata.json` when
   available. RO-Crate and FDMI publication are not required.
4. Optionally synchronise metadata to the demonstration `GD-AS-DEMO` catalogue. “Online”
   refers only to that catalogue; failed synchronisation preserves the
   local record.
5. Choose one or more sites. Predictions retain the model version, measured
   inputs, assumptions, PUE and stable demo carbon factor separately. Sites are processed through metadata,
   training, inference and result stages. Workshop defaults take about 75
   seconds per site; tests can set `JUVRE_PREDICTION_SITE_SECONDS=0`.
6. Choose up to three predicted sites and start the simulations. Each site has
   a separate attempt ID, state, provenance, log, comparison and result. A site
   failure does not discard successful attempts. The timeline shows
   package preparation, metadata sending, resource request, virtual environment preparation,
   training, inference, output collection and local saving. No VM is created.
7. Open or download per-site or combined results. These are explicitly labelled
   mock bundles and never claim that a remote notebook or VM exists.
8. Sharing is opt-in per experiment. The lab catalogue shows the owner, run,
   date, site, files and crate availability. Downloads contain allow-listed
   evidence only. Imports are hash-verified below `juvre/imports`, and replay
   starts a new tracked fresh-kernel experiment linked to the source run.

## Calculation boundaries

The model starts with the experiment runtime and measured average IT power. If
average power is absent but energy is present, it derives power as joules ÷
seconds. If neither is usable, it explicitly assumes 120 W IT power. Training
duration is runtime divided by a stable site performance factor. Inference is
15% of training duration (minimum five seconds) at 65% of training power.

For training and inference independently:

```text
IT energy (kWh)       = IT power (W) × duration (s) / 3,600,000
facility energy (kWh) = IT energy × site PUE
emissions (gCO2e)     = facility energy × demo carbon intensity (gCO2e/kWh)
```

PUE is applied exactly once. Source telemetry is treated as IT/component
energy, not facility energy. Carbon intensity and performance factors are
stable demo values, not live readings. Results are operational estimates, not
a full SCI assessment.

## Local artefacts

Files are scoped by a sanitised username and experiment ID:

```text
m3l2/<user>/
  registration.json
  experiments/<experiment-id>/
    metadata.json
    catalogue.json
    predictions.json
    orchestration.json
    orchestration-log.json
    comparison.json
    <site>-simulation-log.json
    <site>-simulation-result.json
    <site>-comparison.json
```

The comparison records the original local experiment, selected-site
prediction and deterministic simulated target run. Missing original facility
energy, emissions or inference boundaries remain explicitly unavailable.

Shared bundles live below `juvre/lab-catalogue/<catalogue-id>` and imports below
`juvre/imports/<user>/<catalogue-id>`. Credentials, tokens, private source paths,
reproducibility state and unrelated files are excluded.
