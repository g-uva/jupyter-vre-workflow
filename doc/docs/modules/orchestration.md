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

1. The initial map is centred on Greece and exposes only the local GRNET demo
   node. Register the pre-filled, per-user `GD-DEMO-…` node with demonstration VO
   `GD-AS-DEMO` to reveal the other stable demo sites.
2. Select an existing successful experiment using the page controls. JuVRE
   reads local `run.json`, `metrics.csv` and `ro-crate-metadata.json` when
   available. RO-Crate and FDMI publication are not required.
3. Optionally synchronise metadata to the demonstration `GD-AS-DEMO` catalogue. “Online”
   refers only to that catalogue; failed synchronisation preserves the
   local record.
4. Choose one or more sites. They are processed sequentially through metadata,
   training, inference and result stages. Workshop defaults take about 75
   seconds per site; tests can set `JUVRE_PREDICTION_SITE_SECONDS=0`.
5. Choose one predicted site and start the simulated rerun. The timeline shows
   package preparation, metadata sending, resource request, virtual environment preparation,
   training, inference, output collection and local saving. No VM is created.
6. Open or download the saved log and comparison JSON.

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
```

The comparison records the original local experiment, selected-site
prediction and deterministic simulated target run. Missing original facility
energy, emissions or inference boundaries remain explicitly unavailable.
