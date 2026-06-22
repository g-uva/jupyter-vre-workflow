---
id: validation
title: Validation & Troubleshooting
sidebar_position: 6
---

# Validation & Troubleshooting

## Deployment checklist

Run through this list after completing the installation to confirm all modules are active and communicating.

- [ ] JupyterLab opens and a code cell executes successfully
- [ ] Jupyter VRE Workflow tab appears in the left sidebar after installation and browser refresh
- [ ] Telemetry module shows **connected** status in its tab
- [ ] Prometheus target for Scaphandre is **UP** (`http://localhost:9090/targets`)
- [ ] Running a notebook cell changes at least one KPI value or updates a time-series chart
- [ ] Reproducibility export creates metadata artefacts in the expected output folder
- [ ] *(Optional)* Catalogue entry appears in the FDMI catalogue after export
- [ ] *(Optional)* MetricsDB record is created after a session completes
- [ ] *(Optional)* Orchestration status shows a successful placement prediction

> **Screenshot placeholder** — full Jupyter VRE Workflow session: metrics live + catalogue entry confirmed

## Common issues

### Jupyter VRE Workflow tab is missing

Confirm the package was installed in the **same Python environment** as JupyterLab:

```bash
source .venv/bin/activate
pip show ecojupyter
jupyter labextension list
```

If not listed, reinstall and restart JupyterLab.

### Metrics are all zero

- Check Scaphandre has access to `/sys/class/powercap` (requires root / correct permissions)
- Verify the Prometheus target is UP: `http://localhost:9090/targets`
- Confirm the correct notebook context is selected in the Telemetry tab

### Port conflict

Change the affected service's port and update the matching endpoint in Jupyter VRE Workflow settings:

```bash
# Example: run Prometheus on port 9091
./prometheus --config.file=prometheus.yml --web.listen-address=":9091"
```

### ARM or unsupported hardware

Scaphandre relies on the `powercap` Linux interface, which is not available on ARM or most virtualised hosts. Use a bare-metal x86_64 machine for the Telemetry module.

### Catalogue / orchestration endpoint fails

- Double-check the endpoint URL (trailing slash, `http` vs `https`)
- Verify credentials / API token are valid and have the required scope
- Check that schema fields match the agreed catalogue format
- Confirm network access from the JupyterLab host to the endpoint

## References

- [Jupyter VRE Workflow GitHub repository](https://github.com/g-uva/EcoJupyter)
- [JupyterLab Extension Tutorial](https://jupyterlab.readthedocs.io/en/stable/extension/extension_tutorial.html)
- [Scaphandre documentation](https://hubblo-org.github.io/scaphandre-documentation/)
- [Prometheus documentation](https://prometheus.io/docs/)
- [RO-Crate specification](https://www.researchobject.org/ro-crate/)
- [GreenDIGIT project](https://greendigit-project.eu/)
