import React from 'react';
import {
  IKPIValues,
  ISCIProps,
  METRIC_KEY_MAP,
  RawMetrics,
  IPrometheusMetrics
} from '../helpers/types';
import { microjoulesToKWh } from '../helpers/utils';
import { Grid2, Stack, Typography } from '@mui/material';

import SolarPowerOutlinedIcon from '@mui/icons-material/SolarPowerOutlined';
// import PowerOutlinedIcon from '@mui/icons-material/PowerOutlined';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import EnergySavingsLeafOutlinedIcon from '@mui/icons-material/EnergySavingsLeafOutlined';
// import RecyclingOutlinedIcon from '@mui/icons-material/RecyclingOutlined';
// import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined';
// import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

import KpiValue from './KpiValue';
import getDynamicCarbonIntensity from '../api/getCarbonIntensityData';
import { mainColour01, mainColour02, mainColour03 } from '../helpers/constants';
import dayjs from 'dayjs';

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
const defaultCarbonIntensity = 400;
const embodiedEmissions = 50000;
// const hepScore23 = 42.3;

async function prometheusMetricsProxy(
  type: MetricProfile,
  raw: RawMetrics
): Promise<IPrometheusMetrics> {
  const carbonIntensity =
    (await getDynamicCarbonIntensity()) ?? defaultCarbonIntensity;
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
    functionalUnit
    // hepScore23
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
    // hepScore23,
    sciPerUnit,
    energyPerUnit
  };
}

export async function calculateKPIs(
  rawMetrics: RawMetrics
): Promise<IKPIValues> {
  const {
    energyConsumed: E,
    carbonIntensity: I,
    embodiedEmissions: M,
    functionalUnit: R
    // hepScore23
  } = await prometheusMetricsProxy('Avg', rawMetrics);

  const { sci, sciPerUnit, energyPerUnit } = calculateSCI({ E, I, M, R });

  return {
    sci,
    // hepScore23,
    sciPerUnit,
    energyPerUnit
  };
}

interface IKPIComponentProps {
  rawMetrics: RawMetrics;
}

const START = 1748610920;
const END = 1748618120;

const kpiCardsData: Array<{
  key: keyof IKPIValues;
  unit: string;
  color: React.CSSProperties['color'];
  icon: React.ReactNode;
}> = [
  {
    key: 'sci',
    unit: 'gCO₂/unit',
    color: mainColour01,
    icon: (
      <EnergySavingsLeafOutlinedIcon
        sx={{ fontSize: '56px', '& path': { fill: mainColour01 } }}
      />
    )
  },
  {
    key: 'sciPerUnit',
    unit: 'gCO₂',
    color: mainColour02,
    icon: (
      <BoltOutlinedIcon
        sx={{ fontSize: '56px', '& path': { fill: mainColour02 } }}
      />
    )
  },
  {
    key: 'energyPerUnit',
    unit: 'kWh/unit',
    color: mainColour03,
    icon: (
      <SolarPowerOutlinedIcon
        sx={{ fontSize: '56px', '& path': { fill: mainColour03 } }}
      />
    )
  }
];

const experimentId = '778e776b_1748618120';

export const KPIComponent = ({ rawMetrics }: IKPIComponentProps) => {
  const [kpi, setKpi] = React.useState<IKPIValues | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    calculateKPIs(rawMetrics).then(result => {
      if (isMounted) {
        setKpi(result);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [rawMetrics]);

  return (
    <Grid2 sx={{ width: '100%' }}>
      <Stack
        direction="row"
        sx={{ gap: 2, display: 'flex', justifyContent: 'flex-end' }}
      >
        <Typography variant="h6">
          <span style={{ fontWeight: 'bold' }}>Experiment ID</span> <br />
          <span style={{ fontStyle: 'italic' }}>{experimentId}</span> <br />
        </Typography>
        <Typography>
          <span style={{ fontWeight: 'bold' }}>Start: </span>{' '}
          {dayjs(START).toString()} <br />
          <span style={{ fontWeight: 'bold' }}>End: </span>{' '}
          {dayjs(END).toString()}
        </Typography>

        {/* <Select defaultValue={0}>
          <MenuItem value={0}>Select value</MenuItem>
          <MenuItem value={1}>Item 1</MenuItem>
          <MenuItem value={2}>Item 2</MenuItem>
          <MenuItem value={3}>Item 3</MenuItem>
        </Select> */}
      </Stack>
      <Stack direction="row" gap={2}>
        {kpiCardsData.map(props => {
          return (
            <KpiValue
              value={kpi?.[props.key] ?? 0}
              unit={props.unit}
              color={props.color}
              Icon={props.icon}
            />
          );
        })}
      </Stack>
    </Grid2>
  );
};
