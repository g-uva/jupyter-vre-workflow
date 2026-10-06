---
id: reproducibility
title: Module 2 — Reproducibility & Storage
sidebar_position: 2
---

# Module 2: Reproducibility & Storage

## Run an experiment

1. Open the notebook in JupyterLab.
2. In Jupyter VRE Workflow, click **Run notebook as experiment**, or use the command with that name in the command palette.
3. The extension saves the current notebook, records a clean input snapshot, and executes all cells in order in a **fresh kernel** using its kernelspec and original working directory.
4. Watch the run status and telemetry, then open the saved input, output, CSV or metadata links.

Ordinary individual-cell execution and JupyterLab's ordinary **Run All** are not tracked by this action. Notebook code must work from a fresh kernel; it cannot depend on variables left by manual executions. No tracking cells need to be inserted into the notebook.

A run starts before kernel startup and finishes after completion, failure or cancellation and the final telemetry sample. The first notebook error stops later cells. Failure outputs are saved, and telemetry availability is recorded separately from notebook success. Runs continue if the browser tab closes; reopening the panel restores history. An uncompleted record after a server restart is marked interrupted when read.

## Artifact layout

Files are saved next to the source notebook:

```text
experiments/
  <notebook-stem>/
    <UTC-date>T<time-with-microseconds>Z-<random-id>/
      notebook.ipynb
      executed.ipynb
      metrics.csv
      run.json
      reproducibility.json
      ro-crate-metadata.json
```

- `notebook.ipynb`: code, markdown, attachments and metadata at start, with old outputs and execution counts cleared.
- `executed.ipynb`: executed cells, outputs, errors and cell timing metadata; checkpointed after each executed code cell and finalized when the run ends.
- `metrics.csv`: long-form rows with `timestamp_utc,timestamp_unix,metric,labels,value,unit`. Raw RAPL counter values retain domain identifiers, and available Scaphandre/Prometheus series retain their labels. Derived energy and power have explicit units. Rows are flushed throughout execution rather than waiting for the run to finish.
- `run.json`: schema version, source path, run ID, UTC timestamps, kernelspec, status, completed/total code-cell counts, input/output SHA-256 hashes, artifact names and telemetry status/summary.
- `reproducibility.json`: per-experiment CIM selection, the two editable demo
  mappings, configuration revision, generated artefact state and FDMI
  receipt.
- `ro-crate-metadata.json`: a replace-in-place RO-Crate 1.1 JSON-LD descriptor
  referencing the input notebook, executed notebook and raw metrics. It also
  records the run action, status, metric summary, chosen standard and mapping.

UUID suffixes prevent collisions between runs started at the same time. The notebook's parent directory distinguishes equally named notebooks in different folders. The source notebook's outputs are not replaced with the background run's outputs: open `executed.ipynb` to inspect them. External datasets and files written by notebook code remain in the original working directory; they are not automatically copied into the artifact bundle.

The old `.lib/experiments` files are left untouched. The new history selector reads the `experiments` layout; old files remain accessible through Jupyter's file browser.

## API and command line

The authenticated Jupyter server endpoint is `api/jupyter-vre-workflow/experiments` under the server's base URL:

- `POST` with `notebook_path` and optional notebook JSON: save and start; returns HTTP 202 and a run record.
- `GET ?path=<run-folder>`: read run status and the latest chart samples.
- `DELETE ?path=<run-folder>`: request cancellation.

Filesystem paths are constrained to the Jupyter ContentsManager's root. A filesystem-backed ContentsManager is required. Only one run per source notebook is allowed at a time.

The same execution and saving code can be used without a browser:

```bash
python -m jupyter_vre_workflow.experiments /path/to/notebook.ipynb
```

Use an environment where the notebook's kernelspec and dependencies are available. Exit status is nonzero if notebook execution fails; inspect `telemetry.status` independently before using its measurements.

## Publishing

The Autumn School workflow uses internal CIM and FDMI demonstration services. Connect to
CIM, configure a standard and mapping, generate the RO-Crate, then submit it to
the FDMI target. Submission is unavailable while the crate is absent or
stale. A standard or mapping change invalidates it; regeneration also marks an
earlier receipt stale. Identical submissions are idempotent.

GreenDIGIT Commons is demonstration guidance rather than an authoritative
specification, and the other listed standards are mapping references rather
than verified compliance claims. The displayed `gd-super-user` is a simulated
EGI Check-in identity. No real account is verified, no external FDMI or Zenodo
service is contacted, and no DOI is minted.
