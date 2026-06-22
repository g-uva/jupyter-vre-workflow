---
id: intro
title: What is Jupyter VRE Workflow?
sidebar_position: 1
---

# What is Jupyter VRE Workflow?

Jupyter VRE Workflow is a platform-agnostic sustainability assessment tool focused on Jupyter notebook-based workflows. It connects a user-side JupyterLab interface to telemetry, metadata export and orchestration hooks through a single extension.

The tool was developed for the [GreenDIGIT EU Project](https://greendigit-project.eu/) at the University of Amsterdam.

## The three modules

| Module | What it does |
|--------|-------------|
| **Telemetry & Observability** | Collects real-time energy metrics via Scaphandre + Prometheus and computes SCI/KPI indicators |
| **Reproducibility & Storage** | Captures notebook/session metadata, packages it as RO-Crate, and optionally exports to an FDMI catalogue |
| **Orchestration & Replay** | Connects to a T6.3 Orchestration endpoint for workflow replay and cross-site placement |

## Mental model

```
JupyterLab
  └── Jupyter VRE Workflow (Lab extension)
        ├── Mod. 1: Telemetry      → Scaphandre + Prometheus (EIMPS/CIM, EIMPS/KPI)
        ├── Mod. 2: Reproducibility → FDMI/RO-Crate catalogue
        └── Mod. 3: Orchestration  → T6.3 Orchestrator + T6.2 module
```

## What this guide covers

1. Setting up a Linux host and launching JupyterLab
2. Installing the Jupyter VRE Workflow extension from PyPI
3. Installing and configuring each module via the UI
4. Running a tutorial workflow with all three modules active
5. Validating the deployment with a step-by-step checklist

**Audience:** Linux sysadmins and researchers who want to self-host Jupyter VRE Workflow on their own machine (Ubuntu 22.04+ recommended).
