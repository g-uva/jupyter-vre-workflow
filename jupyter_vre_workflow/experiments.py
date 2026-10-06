"""A notebook run and its artifacts share one durable, portable directory."""

import asyncio
import copy
import csv
import hashlib
import json
import os
import shutil
import time
import uuid
from pathlib import Path

import nbformat
from nbclient import NotebookClient

from .telemetry import PrometheusReader, RaplReader, utc_now


def write_json(path, value):
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")
    temporary.replace(path)


class ExperimentManager:
    def __init__(self, root, reader_factory=None, sample_interval=1.0,
                 prometheus_reader_factory=None, prometheus_interval=5.0):
        self.root = Path(root).resolve()
        self.reader_factory = reader_factory or (
            lambda: RaplReader(os.environ.get("ECOJUPYTER_RAPL_ROOT", "/sys/class/powercap"))
        )
        self.sample_interval = sample_interval
        self.prometheus_reader_factory = prometheus_reader_factory or PrometheusReader
        self.prometheus_interval = prometheus_interval
        self.tasks = {}
        self.active = {}
        self.records = {}
        self.samples = {}

    def resolve(self, relative):
        if not isinstance(relative, str) or not relative or Path(relative).is_absolute():
            raise ValueError("Expected a path relative to the Jupyter root")
        path = (self.root / relative).resolve()
        if self.root not in path.parents:
            raise ValueError("Path is outside the Jupyter root")
        return path

    def start(self, notebook_path, notebook=None):
        source = self.resolve(notebook_path)
        if source.suffix != ".ipynb" or not source.is_file():
            raise ValueError("Select an existing .ipynb notebook")
        source_key = str(source.relative_to(self.root))
        if source_key in self.active:
            raise ValueError("This notebook already has a running experiment")
        if notebook is None:
            notebook = nbformat.read(source, as_version=4)
        notebook = nbformat.from_dict(copy.deepcopy(notebook))
        nbformat.validate(notebook)
        # A clean input records code, markdown, attachments and metadata, without
        # carrying stale execution outputs into the new experiment.
        for cell in notebook.cells:
            if cell.cell_type == "code":
                cell.outputs = []
                cell.execution_count = None
                cell.metadata.pop("execution", None)
        slug = source.stem
        # The notebook's parent already distinguishes equally named notebooks.
        started = utc_now()
        run_id = started.replace(":", "") + "-" + uuid.uuid4().hex[:12]
        folder = source.parent / "experiments" / slug / run_id
        self.resolve(str(folder.relative_to(self.root)))
        folder.mkdir(parents=True, exist_ok=False)
        input_text = nbformat.writes(notebook)
        (folder / "notebook.ipynb").write_text(input_text)
        write_json(folder / "executed.ipynb", notebook)
        path = str(folder.relative_to(self.root))
        record = {
            "schema_version": 1, "id": run_id, "workflow_id": slug,
            "path": path, "notebook_path": source_key, "status": "running",
            "start_time": started, "end_time": None, "error": None,
            "kernel_name": notebook.metadata.get("kernelspec", {}).get("name", "python3"),
            "input_sha256": hashlib.sha256(input_text.encode()).hexdigest(),
            "completed_code_cells": 0,
            "total_code_cells": sum(c.cell_type == "code" and bool(c.source.strip()) for c in notebook.cells),
            "artifacts": {"input": "notebook.ipynb", "output": "executed.ipynb", "metrics": "metrics.csv"},
            "telemetry": {"status": "waiting", "source": None, "scope": None,
                          "error": None, "sample_count": 0, "summary": None},
        }
        write_json(folder / "run.json", record)
        self.records[path] = record
        self.samples[path] = []
        self.active[source_key] = path
        task = asyncio.create_task(self._run(record, notebook, source.parent, folder))
        self.tasks[path] = task
        task.add_done_callback(lambda _: self.tasks.pop(path, None))
        return copy.deepcopy(record)

    def get(self, path):
        folder = self.resolve(path)
        record = copy.deepcopy(self.records.get(path))
        if record is None:
            record = json.loads((folder / "run.json").read_text())
            if record["status"] == "running":
                record["status"] = "interrupted"
                record["error"] = "The Jupyter server stopped before this run completed."
                write_json(folder / "run.json", record)
        if path not in self.samples:
            # Restore chart data from durable raw metrics after a server restart.
            from collections import OrderedDict
            values = OrderedDict()
            with (folder / "metrics.csv").open(newline="") as stream:
                for row in csv.DictReader(stream):
                    if row["metric"] not in {"energy_j", "current_power_w", "average_power_w"}:
                        continue
                    key = row["timestamp_unix"]
                    sample = values.setdefault(key, {
                        "timestamp": float(key), "timestamp_utc": row["timestamp_utc"],
                        "energy_j": None, "current_power_w": None, "average_power_w": None,
                    })
                    sample[row["metric"]] = float(row["value"])
                    if len(values) > 300:
                        values.popitem(last=False)
            self.samples[path] = list(values.values())
        record["samples"] = self.samples.get(path, [])[-300:]
        return record

    def cancel(self, path):
        task = self.tasks.get(path)
        if task is None:
            raise ValueError("Experiment is not running")
        record = self.records[path]
        if record.get("cancel_requested") or record.get("finalizing"):
            return
        record["cancel_requested"] = True
        if record.get("execution_started"):
            task.cancel()

    def delete(self, path):
        folder = self.resolve(path)
        task = self.tasks.get(path)
        if task is not None and not task.done():
            raise ValueError("Cancel the running experiment before deleting it")
        record_file = folder / "run.json"
        if not record_file.is_file():
            raise ValueError("Experiment does not exist")
        record = json.loads(record_file.read_text())
        relative = str(folder.relative_to(self.root))
        if record.get("path") != relative:
            raise ValueError("Experiment record does not match its directory")

        shutil.rmtree(folder)
        self.tasks.pop(path, None)
        self.records.pop(path, None)
        self.samples.pop(path, None)

        # Do not leave empty workflow/experiments directories in the selectors.
        for parent in (folder.parent, folder.parent.parent):
            if parent == self.root:
                break
            try:
                parent.rmdir()
            except OSError:
                break

    async def _run(self, record, notebook, cwd, folder):
        stop = asyncio.Event()
        telemetry = record["telemetry"]
        sampler = None
        prometheus_sampler = None
        metrics_file = None
        final_status = "failed"
        available_sources = set()
        telemetry_errors = {}

        def update_telemetry(source=None, error=None):
            if source:
                available_sources.add(source)
                telemetry_errors.pop(source, None)
            if error:
                telemetry_errors[error[0]] = error[1]
            telemetry["status"] = (
                "available" if available_sources else
                "unavailable" if telemetry_errors else "waiting"
            )
            telemetry["source"] = ", ".join(sorted(available_sources)) or None
            telemetry["error"] = "; ".join(
                f"{name}: {message}" for name, message in sorted(telemetry_errors.items())
            ) or None

        def persist():
            write_json(folder / "run.json", record)

        try:
            record["execution_started"] = utc_now()
            metrics_file = (folder / "metrics.csv").open("w", newline="")
            writer = csv.writer(metrics_file)
            writer.writerow(["timestamp_utc", "timestamp_unix", "metric", "labels", "value", "unit"])
            metrics_file.flush()
            if record.get("cancel_requested"):
                raise asyncio.CancelledError()
            try:
                reader = self.reader_factory()
                telemetry["scope"] = reader.scope

                def sample():
                    value = reader.sample()
                    for counter in value["counters"]:
                        labels = json.dumps({"zone": counter["zone"], "name": counter["name"]}, sort_keys=True)
                        writer.writerow([value["timestamp_utc"], value["timestamp"], "rapl_energy_uj",
                                         labels, counter["energy_uj"], "microjoules"])
                    for metric, unit in [("energy_j", "joules"), ("current_power_w", "watts"), ("average_power_w", "watts")]:
                        if value[metric] is not None:
                            writer.writerow([value["timestamp_utc"], value["timestamp"], metric, "{}", value[metric], unit])
                    metrics_file.flush()
                    update_telemetry(source="Linux powercap RAPL")
                    telemetry["sample_count"] += 1
                    telemetry["summary"] = value
                    self.samples[record["path"]].append(value)
                    self.samples[record["path"]] = self.samples[record["path"]][-300:]
                    persist()

                sample()  # baseline before kernel startup or any notebook code

                async def collect():
                    while not stop.is_set():
                        try:
                            await asyncio.wait_for(stop.wait(), self.sample_interval)
                        except asyncio.TimeoutError:
                            pass
                        try:
                            sample()  # also take a final sample at completion
                        except Exception as error:
                            available_sources.discard("Linux powercap RAPL")
                            update_telemetry(error=("Linux powercap RAPL", str(error)))
                            persist()
                            return

                sampler = asyncio.create_task(collect())
            except Exception as error:
                update_telemetry(error=("Linux powercap RAPL", str(error)))
                persist()

            try:
                prometheus_reader = self.prometheus_reader_factory()
            except Exception as error:
                prometheus_reader = None
                update_telemetry(error=("Scaphandre via Prometheus", str(error)))

            if prometheus_reader is not None:
                seen_prometheus_samples = set()
                prometheus_start = time.time()

                async def collect_prometheus():
                    nonlocal prometheus_start
                    while True:
                        query_end = time.time()
                        try:
                            rows = await asyncio.to_thread(
                                prometheus_reader.samples,
                                prometheus_start,
                                query_end,
                            )
                            written = 0
                            latest = prometheus_start
                            for row in rows:
                                labels = json.dumps(row["labels"], sort_keys=True)
                                key = (row["metric"], labels, row["timestamp"])
                                if key in seen_prometheus_samples:
                                    continue
                                seen_prometheus_samples.add(key)
                                writer.writerow([
                                    row["timestamp_utc"], row["timestamp"],
                                    row["metric"], labels, row["value"], row["unit"],
                                ])
                                latest = max(latest, row["timestamp"])
                                written += 1
                            if written:
                                metrics_file.flush()
                                prometheus_start = latest
                                update_telemetry(source="Scaphandre via Prometheus")
                                telemetry["sample_count"] += 1
                                persist()
                        except Exception as error:
                            update_telemetry(error=("Scaphandre via Prometheus", str(error)))
                            persist()

                        if stop.is_set():
                            return
                        try:
                            await asyncio.wait_for(
                                stop.wait(), self.prometheus_interval
                            )
                        except asyncio.TimeoutError:
                            pass

                prometheus_sampler = asyncio.create_task(collect_prometheus())

            async def cell_complete(cell, execute_reply, **kwargs):
                if cell.cell_type == "code" and cell.source.strip() and execute_reply["content"]["status"] == "ok":
                    record["completed_code_cells"] += 1
                write_json(folder / "executed.ipynb", notebook)
                persist()

            client = NotebookClient(
                notebook, timeout=None, allow_errors=False, record_timing=True,
                kernel_name=record["kernel_name"], resources={"metadata": {"path": str(cwd)}},
                on_cell_executed=cell_complete,
            )
            await client.async_execute()
            final_status = "succeeded"
        except asyncio.CancelledError:
            final_status = "cancelled"
            record["error"] = "Experiment cancelled"
        except Exception as error:
            if record.get("cancel_requested"):
                final_status = "cancelled"
                record["error"] = "Experiment cancelled"
            else:
                record["error"] = str(error)
        finally:
            record["finalizing"] = True
            stop.set()
            if sampler:
                result = await asyncio.gather(sampler, return_exceptions=True)
                if isinstance(result[0], BaseException):
                    available_sources.discard("Linux powercap RAPL")
                    update_telemetry(error=("Linux powercap RAPL", str(result[0])))
            if prometheus_sampler:
                result = await asyncio.gather(
                    prometheus_sampler, return_exceptions=True
                )
                if isinstance(result[0], BaseException):
                    available_sources.discard("Scaphandre via Prometheus")
                    update_telemetry(
                        error=("Scaphandre via Prometheus", str(result[0]))
                    )
            if metrics_file:
                metrics_file.close()
            record["end_time"] = utc_now()
            try:
                write_json(folder / "executed.ipynb", notebook)
                output = (folder / "executed.ipynb").read_bytes()
                record["output_sha256"] = hashlib.sha256(output).hexdigest()
                record["status"] = final_status
                persist()
            finally:
                self.active.pop(record["notebook_path"], None)


async def run_file(notebook_path):
    source = Path(notebook_path).resolve()
    manager = ExperimentManager(source.parent)
    record = manager.start(source.name)
    await manager.tasks[record["path"]]
    return manager.get(record["path"])


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Execute and record a notebook experiment")
    parser.add_argument("notebook")
    result = asyncio.run(run_file(parser.parse_args().notebook))
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if result["status"] == "succeeded" else 1)
