import React from 'react';
import {
  IKPIValues,
  ISCIProps,
  METRIC_KEY_MAP,
  RawMetrics,
  IPrometheusMetrics
} from '../helpers/types';
import {
  getAvgValue,
  getDeltaAverage,
  getLatestValue,
  microjoulesToKWh
} from '../helpers/utils';
import {
  Box,
  FormControl,
  Grid2,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography
} from '@mui/material';

import SolarPowerOutlinedIcon from '@mui/icons-material/SolarPowerOutlined';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import EnergySavingsLeafOutlinedIcon from '@mui/icons-material/EnergySavingsLeafOutlined';

import KpiValue from './KpiValue';
import getDynamicCarbonIntensity from '../api/getCarbonIntensityData';
import { mainColour01, mainColour02, mainColour03 } from '../helpers/constants';
import dayjs from 'dayjs';

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
      ? getDeltaAverage(rawEnergyConsumed)
      : getLatestValue(rawEnergyConsumed)) ?? 0
  );
  const functionalUnit =
    (type === 'Avg'
      ? getAvgValue(rawFunctionalUnit)
      : getLatestValue(rawFunctionalUnit)) ?? 0;

  return {
    energyConsumed: Math.abs(energyConsumed),
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
  const energyPerUnit = (R > 0 ? E / R : 0) * 1000; // Convert kWh to Wh

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

const START = 1748855616000;
const END = 1748858436000;

const kpiCardsData: Array<{
  key: keyof IKPIValues;
  title: string;
  unit: string;
  color: React.CSSProperties['color'];
  icon: React.ReactNode;
}> = [
  {
    key: 'sci',
    title: 'SCI',
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
    title: 'SCI per Unit',
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
    title: 'Energy/U',
    unit: 'Wh/unit',
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
        sx={{
          px: 2,
          pb: 2,
          gap: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end'
        }}
      >
        <Typography variant="h6">
          <span style={{ fontWeight: 'bold' }}>Experiment ID</span> <br />
          <span style={{ fontStyle: 'italic' }}>{experimentId}</span> <br />
        </Typography>
        <Box gap={2} sx={{ display: 'flex', alignItems: 'center' }}>
          <FormControl>
            <InputLabel sx={{ background: 'white' }}>
              Selected Experiment ID
            </InputLabel>
            <Select size="small" defaultValue={1}>
              <MenuItem disabled value="">
                <em>Select Experiment</em>
              </MenuItem>
              <MenuItem value={1}>778e776b_1748618120</MenuItem>
              <MenuItem value={2}>c84f2b61_1748629325</MenuItem>
              <MenuItem value={3}>9ba4e93d_1748619740</MenuItem>
              <MenuItem value={4}>e59b0a7c_1748620421</MenuItem>
              <MenuItem value={5}>4dc8a3b2_1748621093</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="body2">
            <span style={{ fontWeight: 'bold' }}>Start: </span>{' '}
            {dayjs(START).toString()} <br />
            <span style={{ fontWeight: 'bold' }}>End: </span>{' '}
            {dayjs(END).toString()}
          </Typography>
        </Box>
      </Stack>
      <Stack direction="row" gap={2}>
        {kpiCardsData.map(props => {
          return (
            <KpiValue
              title={props.title}
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
