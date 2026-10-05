import asyncio
import csv
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import nbformat
from jupyter_client.kernelspec import KernelSpecManager

from jupyter_vre_workflow.experiments import ExperimentManager
from jupyter_vre_workflow.telemetry import RaplReader


def zone(root, path, name, energy, maximum=100000000):
    folder = root / path
    folder.mkdir(parents=True)
    (folder / "name").write_text(name)
    (folder / "energy_uj").write_text(str(energy))
    (folder / "max_energy_range_uj").write_text(str(maximum))
    return folder / "energy_uj"


class RaplTests(unittest.TestCase):
    def test_packages_sum_wrap_and_no_child_double_count(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            first = zone(root, 'intel-rapl:0', 'package-0', 90000000)
            second = zone(root, 'intel-rapl:1', 'package-1', 10000000)
            zone(root, 'intel-rapl:0/intel-rapl:0:0', 'core', 500)
            reader = RaplReader(root)
            with patch('jupyter_vre_workflow.telemetry.time.monotonic', side_effect=[1, 3]):
                baseline = reader.sample()
                first.write_text('10000000')
                second.write_text('30000000')
                sample = reader.sample()
            self.assertIsNone(baseline['current_power_w'])
            self.assertEqual(len(sample['counters']), 2)
            self.assertEqual(sample['energy_j'], 40)
            self.assertEqual(sample['current_power_w'], 20)
            self.assertEqual(sample['average_power_w'], 20)

    def test_psys_excludes_packages_and_symlink_duplicates(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            zone(root, 'intel-rapl:0', 'package-0', 900)
            zone(root, 'intel-rapl:1', 'psys', 1000)
            (root / 'alias').symlink_to(root / 'intel-rapl:1', target_is_directory=True)
            reader = RaplReader(root)
            self.assertEqual(len(reader.zones), 1)
            self.assertEqual(reader.scope, 'Platform (RAPL psys)')

    def test_missing_hardware_is_unavailable(self):
        with tempfile.TemporaryDirectory() as temporary:
            with self.assertRaisesRegex(RuntimeError, 'No readable RAPL'):
                RaplReader(temporary)


class ExperimentTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        # A real kernel, isolated from user kernelspecs and stale executable paths.
        kernel = self.root / 'kernels' / 'jupyter-vre-workflow-test'
        kernel.mkdir(parents=True)
        (kernel / 'kernel.json').write_text(json.dumps({
            'argv': [sys.executable, '-m', 'ipykernel_launcher', '-f', '{connection_file}'],
            'display_name': 'Test Python', 'language': 'python'
        }))
        self.kernel_patch = patch.object(KernelSpecManager, 'kernel_dirs', [str(kernel.parent)])
        self.kernel_patch.start()
        self.manager = ExperimentManager(self.root, reader_factory=lambda: RaplReader(self.root / 'absent'))

    async def asyncTearDown(self):
        for path in list(self.manager.tasks):
            self.manager.cancel(path)
        if self.manager.tasks:
            await asyncio.gather(*list(self.manager.tasks.values()), return_exceptions=True)
        self.kernel_patch.stop()
        self.temporary.cleanup()

    def notebook(self, code, name='nested folder/Ice test.ipynb'):
        notebook = nbformat.v4.new_notebook(cells=[nbformat.v4.new_markdown_cell('Start')]
            + [nbformat.v4.new_code_cell(source) for source in code]
            + [nbformat.v4.new_markdown_cell('End'), nbformat.v4.new_code_cell('')],
            metadata={'kernelspec': {'name': 'jupyter-vre-workflow-test', 'display_name': 'Test Python', 'language': 'python'}})
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        nbformat.write(notebook, path)
        return name, notebook

    async def finish(self, record):
        await self.manager.tasks[record['path']]
        return self.manager.get(record['path'])

    async def test_real_kernel_snapshots_timestamps_and_restart(self):
        name, notebook = self.notebook(['from pathlib import Path\nassert Path.cwd().name == "nested folder"\nanswer = 42', 'print(answer)'])
        notebook.cells[1].execution_count = 99
        notebook.cells[1].outputs = [nbformat.v4.new_output('stream', name='stdout', text='stale')]
        original = (self.root / name).read_bytes()
        record = self.manager.start(name, notebook)
        result = await self.finish(record)
        self.assertEqual(result['status'], 'succeeded', result['error'])
        self.assertEqual(result['completed_code_cells'], 2)
        self.assertEqual(result['telemetry']['status'], 'unavailable')
        self.assertIsNone(result['telemetry']['summary'])
        self.assertRegex(result['start_time'], r'\.\d{6}Z$')
        self.assertLess(result['start_time'], result['end_time'])
        self.assertNotIn(':', result['id'])
        folder = self.root / result['path']
        self.assertEqual(folder.parent.name, 'Ice test')
        self.assertEqual(set(p.name for p in folder.iterdir()), {'notebook.ipynb', 'executed.ipynb', 'metrics.csv', 'run.json'})
        saved_input = nbformat.read(folder / 'notebook.ipynb', as_version=4)
        executed = nbformat.read(folder / 'executed.ipynb', as_version=4)
        self.assertEqual(saved_input.cells[1].outputs, [])
        self.assertEqual(executed.cells[2].outputs[0].text, '42\n')
        self.assertEqual(original, (self.root / name).read_bytes())
        self.assertEqual(result['input_sha256'], hashlib.sha256((folder / 'notebook.ipynb').read_bytes()).hexdigest())
        reloaded = ExperimentManager(self.root).get(result['path'])
        self.assertEqual(reloaded['status'], 'succeeded')
        self.assertEqual(reloaded['samples'], [])

    async def test_failure_saves_output_and_does_not_execute_later_cell(self):
        name, _ = self.notebook(['raise ValueError("expected failure")', 'raise RuntimeError("must not run")'])
        result = await self.finish(self.manager.start(name))
        self.assertEqual(result['status'], 'failed')
        self.assertIn('expected failure', result['error'])
        executed = nbformat.read(self.root / result['path'] / 'executed.ipynb', as_version=4)
        self.assertEqual(executed.cells[1].outputs[0].ename, 'ValueError')
        self.assertIsNone(executed.cells[2].execution_count)
        self.assertEqual(result['completed_code_cells'], 0)

    async def test_delete_completed_experiment_and_empty_parents(self):
        name, _ = self.notebook(['print("done")'])
        result = await self.finish(self.manager.start(name))
        folder = self.root / result['path']
        workflow_folder = folder.parent
        experiments_folder = workflow_folder.parent

        self.manager.delete(result['path'])

        self.assertFalse(folder.exists())
        self.assertFalse(workflow_folder.exists())
        self.assertFalse(experiments_folder.exists())
        with self.assertRaisesRegex(ValueError, 'does not exist'):
            self.manager.delete(result['path'])

    async def test_running_experiment_must_be_cancelled_before_delete(self):
        name, _ = self.notebook(['import time\ntime.sleep(60)'])
        record = self.manager.start(name)
        with self.assertRaisesRegex(ValueError, 'Cancel the running'):
            self.manager.delete(record['path'])
        self.assertTrue((self.root / record['path']).is_dir())

    async def test_unique_ids_same_timestamp_and_immediate_cancel(self):
        name, _ = self.notebook(['print(1)'])
        with patch('jupyter_vre_workflow.experiments.utc_now', return_value='2026-09-14T12:00:00.123456Z'):
            first = self.manager.start(name)
            with self.assertRaisesRegex(ValueError, 'already has'):
                self.manager.start(name)
            self.manager.cancel(first['path'])
            result = await self.finish(first)
            self.assertEqual(result['status'], 'cancelled')
            second = self.manager.start(name)
            self.manager.cancel(second['path'])
            await self.finish(second)
        self.assertNotEqual(first['id'], second['id'])

    async def test_cancel_executing_kernel_preserves_run(self):
        name, _ = self.notebook(['import time\ntime.sleep(60)'])
        record = self.manager.start(name)
        await asyncio.sleep(2)
        self.manager.cancel(record['path'])
        result = await asyncio.wait_for(self.finish(record), 15)
        self.assertEqual(result['status'], 'cancelled')
        self.assertIsNotNone(result['end_time'])

    async def test_raw_counter_labels_flush_and_reload(self):
        counter = zone(self.root / 'powercap', 'intel-rapl:0', 'package-0', 1000)
        self.manager.reader_factory = lambda: RaplReader(self.root / 'powercap')
        self.manager.sample_interval = 0.05
        name, _ = self.notebook(['import time\ntime.sleep(0.2)\nprint("done")'])
        record = self.manager.start(name)
        await asyncio.sleep(0.1)
        counter.write_text('2001000')
        result = await self.finish(record)
        self.assertEqual(result['status'], 'succeeded', result['error'])
        self.assertEqual(result['telemetry']['summary']['energy_j'], 2)
        self.assertGreater(result['telemetry']['sample_count'], 2)
        with (self.root / result['path'] / 'metrics.csv').open() as stream:
            rows = list(csv.DictReader(stream))
        raw = [r for r in rows if r['metric'] == 'rapl_energy_uj']
        self.assertEqual(json.loads(raw[0]['labels'])['name'], 'package-0')
        self.assertEqual(raw[-1]['value'], '2001000')
        reloaded = ExperimentManager(self.root).get(result['path'])
        self.assertEqual(reloaded['samples'][-1]['energy_j'], 2)

    async def test_path_escape_is_rejected(self):
        for path in ['../outside.ipynb', '/tmp/outside.ipynb']:
            with self.assertRaises(ValueError):
                self.manager.start(path)

    async def test_sensor_failure_is_not_a_zero_energy_success(self):
        zone(self.root / 'powercap', 'intel-rapl:0', 'package-0', 1000)
        reader = RaplReader(self.root / 'powercap')
        original_sample = reader.sample
        calls = 0

        def failing_sample():
            nonlocal calls
            calls += 1
            if calls > 1:
                raise PermissionError('counter became unreadable')
            return original_sample()

        reader.sample = failing_sample
        self.manager.reader_factory = lambda: reader
        self.manager.sample_interval = 0.01
        name, _ = self.notebook(['print("still runs")'])
        result = await self.finish(self.manager.start(name))
        self.assertEqual(result['status'], 'succeeded', result['error'])
        self.assertEqual(result['telemetry']['status'], 'unavailable')
        self.assertIn('unreadable', result['telemetry']['error'])
        self.assertEqual(result['telemetry']['sample_count'], 1)
        self.assertTrue((self.root / result['path'] / 'executed.ipynb').is_file())


if __name__ == '__main__':
    unittest.main()
