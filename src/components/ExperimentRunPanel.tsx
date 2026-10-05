import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Link,
  Paper,
  Stack,
  Typography
} from '@mui/material';
import { ServerConnection } from '@jupyterlab/services';
import { IExperiment } from '../api/experiments';

interface IProps {
  notebookName: string | null;
  run: IExperiment | null;
  error: string;
  starting: boolean;
  onStart: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

export default function ExperimentRunPanel({
  notebookName,
  run,
  error,
  starting,
  onStart,
  onCancel,
  onDelete
}: IProps) {
  const running = run?.status === 'running';
  const baseUrl = ServerConnection.makeSettings().baseUrl.replace(/\/?$/, '/');
  return (
    <Paper variant="outlined" sx={{ p: 2, flexShrink: 0 }}>
      <Stack direction="row" gap={2} alignItems="center" flexWrap="wrap">
        <Button
          onClick={onStart}
          disabled={!notebookName || starting || running}
        >
          {starting
            ? 'Starting…'
            : run
              ? 'Restart experiment'
              : notebookName
                ? `Run ${notebookName} as an experiment`
                : 'Run notebook as an experiment'}
        </Button>
        {running && (
          <Button onClick={onCancel} color="warning">
            Cancel run
          </Button>
        )}
        {run && !running && (
          <Button onClick={onDelete} color="error" disabled={starting}>
            Delete experiment
          </Button>
        )}
        {run && (
          <Chip
            label={`${run.status} · ${run.completed_code_cells}/${run.total_code_cells} code cells`}
          />
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Runs all cells in a fresh kernel using the notebook’s environment and
        working directory. Saves the input notebook, executed outputs, raw
        metrics and run status.
      </Typography>
      {run && (
        <Box sx={{ mt: 1 }}>
          <Typography
            variant="caption"
            sx={{ display: 'block', overflowWrap: 'anywhere' }}
          >
            {run.path}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            Started {run.start_time}
            {run.end_time ? ` · Finished ${run.end_time}` : ''}
          </Typography>
          <Stack direction="row" gap={2} flexWrap="wrap">
            {[
              'notebook.ipynb',
              'executed.ipynb',
              'metrics.csv',
              'run.json'
            ].map(name => (
              <Link
                key={name}
                href={`${baseUrl}files/${`${run.path}/${name}`.split('/').map(encodeURIComponent).join('/')}`}
                target="_blank"
                rel="noreferrer"
              >
                {name}
              </Link>
            ))}
          </Stack>
        </Box>
      )}
      {(error || run?.error) && (
        <Alert
          severity="error"
          sx={{
            mt: 1,
            height: 220,
            boxSizing: 'border-box',
            alignItems: 'flex-start',
            '& .MuiAlert-message': {
              width: '100%',
              height: '100%',
              overflow: 'auto',
              whiteSpace: 'pre-wrap'
            }
          }}
        >
          {error || run?.error}
        </Alert>
      )}
    </Paper>
  );
}

export function ExperimentTelemetry({ run }: { run: IExperiment | null }) {
  const telemetry = run?.telemetry;
  const sample = telemetry?.summary;
  const available = telemetry?.status === 'available';
  const format = (value: number | null | undefined) =>
    value === null || value === undefined
      ? '—'
      : value.toLocaleString(undefined, { maximumFractionDigits: 3 });
  return (
    <Stack gap={2}>
      {!available && (
        <Alert severity="info">
          {telemetry?.error ||
            (run
              ? 'Waiting for RAPL measurements.'
              : 'Start or select an experiment to see measured telemetry.')}{' '}
          No synthetic readings are used.
        </Alert>
      )}
      <Typography variant="body2" color="text.secondary">
        {telemetry?.scope || 'RAPL energy'} · Measures the selected hardware
        domains, including other workloads on them.
        {sample && ` Last sample: ${sample.timestamp_utc}.`}
      </Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
        {[
          ['Energy used so far', sample?.energy_j, 'J'],
          [
            run?.status === 'running' ? 'Current power' : 'Final sampled power',
            sample?.current_power_w,
            'W'
          ],
          ['Average power over run', sample?.average_power_w, 'W']
        ].map(([title, value, unit]) => (
          <Paper key={String(title)} variant="outlined" sx={{ p: 2, flex: 1 }}>
            <Typography variant="subtitle2">{title}</Typography>
            <Typography variant="h5">
              {format(available ? (value as number | null) : null)} {unit}
            </Typography>
          </Paper>
        ))}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Current power is the counter difference over the latest sampling
        interval. Average power is measured energy divided by sampled elapsed
        time.
      </Typography>
    </Stack>
  );
}
