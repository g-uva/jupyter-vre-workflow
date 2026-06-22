---
id: telemetry
title: Module 1 — Telemetry & Observability
sidebar_position: 1
---

# Module 1: Telemetry & Observability

This module collects real-time energy metrics from Scaphandre and Prometheus, and computes sustainability KPIs for your notebook sessions.

## What you get

- Live energy consumption charts per notebook session
- KPIs: **SCI** (Software Carbon Intensity), **SCI/Unit**, **Energy/Unit**
- Prometheus-backed time-series storage for cross-session comparisons

> **Screenshot placeholder** — Jupyter VRE Workflow metrics + KPI panel during a running notebook (split view)

## Step 1: Install Scaphandre

Scaphandre measures energy at the process level using the Linux `powercap` interface. It requires root access.

```bash
# Via cargo (Rust)
cargo install scaphandre

# Or via Docker
docker run -d \
  --privileged \
  -v /sys/class/powercap:/sys/class/powercap:ro \
  -p 8080:8080 \
  hubblo/scaphandre prometheus
```

Verify it is running:

```bash
curl http://localhost:8080/metrics | head -20
```

> **Screenshot placeholder** — terminal showing Scaphandre output with power readings

## Step 2: Install and configure Prometheus

Prometheus scrapes Scaphandre metrics on a configurable interval.

### Install

```bash
# Download and extract (adjust version as needed)
wget https://github.com/prometheus/prometheus/releases/download/v2.52.0/prometheus-2.52.0.linux-amd64.tar.gz
tar xvf prometheus-*.tar.gz
cd prometheus-*/
```

### Configure `prometheus.yml`

```yaml
scrape_configs:
  - job_name: 'scaphandre'
    static_configs:
      - targets: ['localhost:8080']
```

### Start Prometheus

```bash
./prometheus --config.file=prometheus.yml --web.listen-address=":9090"
```

Open `http://localhost:9090` → **Status → Targets** and confirm Scaphandre is **UP**.

> **Screenshot placeholder** — Prometheus UI targets page showing Scaphandre as UP

## Step 3: Connect via Jupyter VRE Workflow

1. Open the **Telemetry** tab in the Jupyter VRE Workflow panel
2. Verify the Prometheus endpoint (`http://localhost:9090`) is pre-filled
3. Click **"Install module"** to activate the connection
4. Open a notebook and run cells — the charts should update in real time

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Metrics are all zero | Check Scaphandre has `/sys/class/powercap` access; verify Prometheus targets are UP |
| Port conflict on 9090 | Change `--web.listen-address` and update the Jupyter VRE Workflow endpoint config |
| ARM / no powercap | Scaphandre is not supported on ARM or most VMs — use a bare-metal x86_64 host |
