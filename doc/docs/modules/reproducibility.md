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

Files are saved below the Jupyter root in the JuVRE data directory:

```text
juvre/
  experiments/
    <notebook-stem>/
      <UTC-date>T<time-with-microseconds>Z-<random-id>/
        notebook.ipynb
        executed.ipynb
        metrics.csv
        run.json
        reproducibility.json
        eimps-cloud.json
        cim-record.json
        ro-crate-metadata.json
```

- `notebook.ipynb`: code, markdown, attachments and metadata at start, with old outputs and execution counts cleared.
- `executed.ipynb`: executed cells, outputs, errors and cell timing metadata; checkpointed after each executed code cell and finalized when the run ends.
- `metrics.csv`: long-form rows with `timestamp_utc,timestamp_unix,metric,labels,value,unit`. Raw RAPL counter values retain domain identifiers, and available Scaphandre/Prometheus series retain their labels. Derived energy and power have explicit units. Rows are flushed throughout execution rather than waiting for the run to finish.
- `run.json`: schema version, source path, run ID, UTC timestamps, kernelspec, status, completed/total code-cell counts, input/output SHA-256 hashes, artifact names and telemetry status/summary.
- `reproducibility.json`: per-experiment Cloud configuration, CIM profile,
  configuration and source revisions, generated-artifact state, and mock FDMI
  receipt.
- `eimps-cloud.json`: a local EIMPS Cloud-shaped object. It uses the WP6 field
  names and types, includes the configured publication `group`, and never
  invents `publisher_email` or unsupported optional values.
- `cim-record.json`: the versioned harmonized record used to derive the EIMPS
  object. It retains units, conversions, attribution boundary, source,
  coverage, confidence, mapping status, missing reasons, and quality flags.
- `ro-crate-metadata.json`: a replace-in-place RO-Crate 1.1 JSON-LD descriptor
  linking all six source and derived files to the notebook `CreateAction`, with
  hashes, stable run ID, profile, and contextual standards reference.

UUID suffixes prevent collisions between runs started at the same time. The source notebook's outputs are not replaced with the background run's outputs: open `executed.ipynb` to inspect them. External datasets and files written by notebook code remain in the original working directory; they are not automatically copied into the artifact bundle.

The history selector reads `juvre/experiments`. Older experiment directories are left untouched and remain accessible through Jupyter's file browser.

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

## Configure and export Cloud metadata

Run the approximately 20-second mock installer for the already bundled module,
then connect the mock CIM service. The installer simulates manifest resolution,
archive and dependency transfers, verification, unpacking, and activation. It
does not download or install real packages. Completion is stored server-side so
the workshop can demonstrate the future modular delivery flow. Select a Cloud
metadata profile and explicitly
configure the authorised publication group, registered site name, actual cloud
type, compute-service identifier, and VO/workload owner. Applying a changed
configuration regenerates all three JSON outputs when CIM is connected. A
change to `run.json` or `metrics.csv` makes the outputs stale until regenerated.

The embedded and Kubernetes CIM mocks expose the same versioned field registry.
The selected local profile has `ri_type=cloud`, but `ri_type` is deliberately
absent from `eimps-cloud.json`: downstream WP6 Cloud detection uses the actual
Cloud fields. `ExecUnitID` is the stable run ID, timestamps remain UTC ISO 8601,
`ExecUnitFinished` is integer 0 or 1, and wall time is the end-minus-start
duration rounded to the nearest integer second with halves rounded up.

`EnergyWh` is emitted only when `metrics.csv` provides evidence attributable to
the selected run. Supported conversions are run-labelled `energy_j / 3600`, a
run-labelled Scaphandre process counter delta from microjoules, or trapezoidal
integration of run-labelled process power in microwatts. Host totals are not
treated as notebook energy, and RAPL and Scaphandre values are never added
together. `Work`, `Efficiency`, CPU and suspend durations, and the CPU
normalization factor remain absent unless defined telemetry supplies them; wall
time is not substituted for CPU time.

Missing configuration, timestamps, or attributable energy still produces a
local draft. The UI and `cim-record.json` list missing requirements and quality
flags, while the output is marked not EIMPS-ready. Syntax validity, downstream
Cloud compatibility, and endpoint acceptance are separate statuses.

The RO-Crate editor permits title, description, creator/organisation, absolute
licence and publication identifiers, environment information, and the fixed
notebook/output roles. Each field shows its JSON-LD location and source. These
values feed the same harmonized record as the CIM and EIMPS exports. Generated
sets are also snapshotted below `export-revisions/<configuration>-<source>` so
the comparison can distinguish mapping changes from measurement changes.

## Mock publishing

The Autumn School workflow uses internal CIM and FDMI demonstration services.
Connect to mock FDMI explicitly and review the run, crate generation and profile
before synchronising. Embedded submissions persist under
`juvre/fdmi/submissions.json`; the Kubernetes mock uses a persistent volume.
The same run and artifact hash is idempotent, while a changed crate receives a
new version and makes its previous receipt stale.
The detailed and compact configurations are mock variants of the same Cloud
profile and shared harmonized record. Submission is unavailable while the
crate is absent or stale. Regeneration marks an earlier receipt stale, and
identical mock submissions are idempotent.

GreenDIGIT Commons is demonstration guidance rather than an authoritative
specification, and the other listed standards are mapping references rather
than verified compliance claims. The displayed `gd-super-user` is a simulated
EGI Check-in identity. No real account is verified, no external FDMI, production
EIMPS, or Zenodo service is contacted, and no DOI is minted.
