import React from 'react';
import {
  IKPIValues,
  ISCIProps,
  METRIC_KEY_MAP,
  RawMetrics,
  IPrometheusMetrics
} from '../helpers/types';
import { microjoulesToKWh } from '../helpers/utils';
import { Grid2, IconButton, MenuItem, Select, Stack, Typography } from '@mui/material';

import PowerOutlinedIcon from '@mui/icons-material/PowerOutlined';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import SolarPowerOutlinedIcon from '@mui/icons-material/SolarPowerOutlined';
import EnergySavingsLeafOutlinedIcon from '@mui/icons-material/EnergySavingsLeafOutlined';
// import CompostRoundedIcon from '@mui/icons-material/CompostRounded';
import RecyclingOutlinedIcon from '@mui/icons-material/RecyclingOutlined';
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

function getLatestValue(
  metricData: [number, string][] | undefined
): number | null {
  if (!metricData || metricData.length === 0) {
    return null;
  }
  // Sort by timestamp descending and pick the first
  const latest = metricData.reduce(
    (max, curr) => (curr[0] > max[0] ? curr : max),
    metricData[0]
  );
  return parseFloat(latest[1]);
}

function getAvgValue(
  metricData: [number, string][] | undefined
): number | undefined {
  if (!metricData || metricData.length === 0) {
    return undefined;
  }
  const sum = metricData.reduce((acc, [, value]) => acc + parseFloat(value), 0);
  return sum / metricData.length;
}

type MetricProfile = 'Last' | 'Avg';

// Default static values
const carbonIntensity = 400;
const embodiedEmissions = 50000;
const hepScore23 = 42.3;

function prometheusMetricsProxy(
  type: MetricProfile,
  raw: RawMetrics
): IPrometheusMetrics {
  const rawEnergyConsumed = raw.get(METRIC_KEY_MAP.energyConsumed);
  const rawFunctionalUnit = raw.get(METRIC_KEY_MAP.functionalUnit);

  const energyConsumed = microjoulesToKWh(
    (type === 'Avg'
      ? getAvgValue(rawEnergyConsumed)
      : getLatestValue(rawEnergyConsumed)) ?? 0
  );
  const functionalUnit =
    (type === 'Avg'
      ? getAvgValue(rawFunctionalUnit)
      : getLatestValue(rawFunctionalUnit)) ?? 0;

  return {
    energyConsumed,
    carbonIntensity,
    embodiedEmissions,
    functionalUnit,
    hepScore23
  };
}

function calculateSCI(sciValues: ISCIProps): IKPIValues {
  const { E, I, M, R } = sciValues;

  const sci = R > 0 ? (E * I + M) / R : 0;

  // Example extra KPIs:
  const sciPerUnit = R > 0 ? sci / R : 0;
  const energyPerUnit = R > 0 ? E / R : 0;

  // HEPScore23 could be just the metric, or some normalisation.

  return {
    sci,
    hepScore23,
    sciPerUnit,
    energyPerUnit
  };
}

export function calculateKPIs(rawMetrics: RawMetrics): IKPIValues {
  const {
    energyConsumed: E,
    carbonIntensity: I,
    embodiedEmissions: M,
    functionalUnit: R,
    hepScore23
  } = prometheusMetricsProxy('Avg', rawMetrics);

  const { sci, sciPerUnit, energyPerUnit } = calculateSCI({ E, I, M, R });

  return {
    sci,
    hepScore23,
    sciPerUnit,
    energyPerUnit
  };
}

interface IKPIComponentProps {
  rawMetrics: RawMetrics;
}

export const KPIComponent = ({ rawMetrics }: IKPIComponentProps) => {
  const kpi = React.useMemo(() => calculateKPIs(rawMetrics), [rawMetrics]);

  return (
    <Grid2 sx={{ width: '100%' }}>
      <Typography variant="h6">Current session Green Stats</Typography>
      <Stack direction="row" gap={2}>
        <Typography variant="h6">
          SessionID + Timestamp + other characteristics
        </Typography>
        <Select defaultValue={0}>
          <MenuItem value={0}>Select value</MenuItem>
          <MenuItem value={1}>Item 1</MenuItem>
          <MenuItem value={2}>Item 2</MenuItem>
          <MenuItem value={3}>Item 3</MenuItem>
        </Select>
      </Stack>
      <Grid2>
        Performance of this workflow compared to others. Suggestions for
        predictions of how much to this workflow is going to spend. Export
        metrics button.
      </Grid2>
      <Stack
        direction="row"
        gap={2}
        sx={{
          '& .MuiIconButton-root:hover': {
            backgroundColor: 'transparent'
          }
        }}
      >
        <IconButton>
          <RefreshRoundedIcon />
        </IconButton>
        <IconButton>
          <PowerOutlinedIcon />
        </IconButton>
        <IconButton>
          <BoltOutlinedIcon />
        </IconButton>
        <IconButton>
          <SolarPowerOutlinedIcon />
        </IconButton>
        <IconButton>
          <EnergySavingsLeafOutlinedIcon />
        </IconButton>
        {/* <IconButton>
          <CompostRoundedIcon />
        </IconButton> */}
        <IconButton>
          <RecyclingOutlinedIcon />
        </IconButton>
        <IconButton>
          <SpeedOutlinedIcon />
        </IconButton>
      </Stack>
      <div>
        <span style={{ fontWeight: 'bold' }}>SCI</span> (gCO₂/unit){' '}
        {kpi.sci.toFixed(1)}
      </div>
      <div>
        <span style={{ fontWeight: 'bold' }}>SCI per Unit</span> (gCO₂){' '}
        {kpi.sciPerUnit.toFixed(1)}
      </div>
      <div>
        <span style={{ fontWeight: 'bold' }}>Energy per Unit</span> (kWh/unit){' '}
        {kpi.energyPerUnit.toFixed(4)}
      </div>
      {/* <div>
        <span style={{ fontWeight: 'bold' }}>HEPScore23</span>: {kpi.hepScore23}
      </div> */}
    </Grid2>
  );
};
