---
id: prerequisites
title: Prerequisites
sidebar_position: 2
---

# Prerequisites

Before starting, make sure your machine meets the following requirements.

## System

- **OS:** Linux (Ubuntu 22.04+ recommended); x86_64 architecture
- **Root / sudo access** — required for Scaphandre (powercap interface) and service management
- **Python 3.9+** with `pip`; `conda` or `mamba` is recommended for environment management

:::note ARM / unsupported hardware
Scaphandre relies on the Linux `powercap` interface. ARM and some virtualised hosts may not expose it. Use a supported x86_64 host for the Telemetry module.
:::

## Network ports

| Port | Service |
|------|---------|
| 8888 | JupyterLab |
| 9090 | Prometheus |
| 8080 | Scaphandre exporter |

Make sure these ports are not already in use and are reachable if you need external access.

## Tools

- `curl` and `git` (auto-installed by `build-rel-package.sh` if missing via conda)
- `conda` — auto-installed by the release script if not present
- PyPI access — for `pip install ecojupyter`
- Access credentials for FDMI, EIMPS/CIM, EIMPS/KPI endpoints (Modules 2 & 3 only)

## What is already assumed

JupyterLab **does not** need to be pre-installed — the next section walks you through a clean installation.
