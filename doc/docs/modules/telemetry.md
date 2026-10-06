---
id: telemetry
title: Module 1 — Telemetry & Observability
sidebar_position: 1
---

# Module 1: Telemetry & Observability

Tracked notebook experiments read Linux RAPL counters directly on the Jupyter server. The dashboard never substitutes generated data when readings are missing.

## Measurements

- **Energy used so far (J):** accumulated counter differences since the initial sample.
- **Current power (W):** energy difference divided by elapsed time over the latest sampling interval.
- **Average power over run (W):** total measured energy divided by sampled elapsed time.

Sampling defaults to one second, with a baseline before kernel startup and a final sample after execution and kernel shutdown. Wall-clock timestamps use UTC with microsecond precision; power calculations use a monotonic clock. The average includes kernel startup and shutdown. The first sample cannot provide power yet, so the UI shows a dash.

The reader prefers the `psys` platform domain when available. Otherwise it sums CPU package domains. It does not add package subdomains again. These are hardware-domain totals, including other workloads using those domains; they are not exclusive notebook-process measurements or GPU readings. Counter wraparound uses each domain's `max_energy_range_uj`; the sampling interval must be shorter than a full counter wrap.

## Hardware access

The Jupyter server user must be able to read each selected domain's `name`, `energy_uj` and `max_energy_range_uj` beneath `/sys/class/powercap`. In containers, expose the real host counters and their symlink targets read-only. An administrator can set `ECOJUPYTER_RAPL_ROOT` before starting Jupyter to use a different mounted powercap path.

If counters are absent, unreadable or fail during a run, the notebook still executes and saves its artifacts. Telemetry is explicitly marked unavailable, with the reason recorded in `run.json`. A header-only `metrics.csv` means there were no measurements; it does not mean zero energy.

The earlier Scaphandre/Prometheus installer remains available for separate exporter use. Tracked runs no longer depend on that exporter or the hardcoded remote Prometheus URL.

## Viewing and saving

Open a notebook and choose **Run notebook as experiment**. Select its run to view live totals and power. Starting an experiment enables automatic refresh with a five-second default interval. The chart shows up to the latest 300 samples; `metrics.csv` preserves the complete series, including raw counters and domain labels.

See [Reproducibility & Storage](./reproducibility.md) for artifact paths and run status.
