import React from 'react';
// import dayjs from 'dayjs';

import {
  IKPIValues,
  ISCIProps,
  METRIC_KEY_MAP,
  IPrometheusMetrics,
  RawMetrics
} from '../helpers/types';

import {
  getAvgValue,
  getDeltaAverage,
  getLatestValue,
  microjoulesToKWh
} from '../helpers/utils';

import { Grid2, Stack } from '@mui/material';

import SolarPowerOutlinedIcon from '@mui/icons-material/SolarPowerOutlined';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import EnergySavingsLeafOutlinedIcon from '@mui/icons-material/EnergySavingsLeafOutlined';

import KpiValue from './KpiValue';
// import getDynamicCarbonIntensity from '../api/getCarbonIntensityData';
import { mainColour01, mainColour02, mainColour03 } from '../helpers/constants';

type MetricProfile = 'Last' | 'Avg';

// Default static values
const defaultCarbonIntensity = 400;
const embodiedEmissions = 50000;
// const hepScore23 = 42.3;

async function prometheusMetricsProxy(
  type: MetricProfile,
  raw: RawMetrics
): Promise<IPrometheusMetrics> {
  // const carbonIntensity =
  //   (await getDynamicCarbonIntensity()) ?? defaultCarbonIntensity;
  const carbonIntensity = defaultCarbonIntensity;
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
  // const sciPerUnit = R > 0 ? sci / R : 0;
  const energyPerUnit = (R > 0 ? E / R : 0) * 1000; // Convert kWh to Wh
  const operationalEmissions = E * I;

  return {
    sci,
    // hepScore23,
    // sciPerUnit,
    energyPerUnit,
    operationalEmissions
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

  // eslint-disable-next-line prettier/prettier
  const { sci, energyPerUnit, operationalEmissions } = calculateSCI({
    E,
    I,
    M,
    R
  });

  return {
    sci,
    // hepScore23,
    // sciPerUnit,
    energyPerUnit,
    operationalEmissions
  };
}

interface IKPIComponentProps {
  rawMetrics: RawMetrics;
}

// const START = 1748855616000;
// const END = 1748858436000;

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
        sx={{ fontSize: '34px', '& path': { fill: mainColour01 } }}
      />
    )
  },
  {
    key: 'operationalEmissions',
    title: 'Ops Emissions',
    unit: 'gCO₂',
    color: mainColour02,
    icon: (
      <BoltOutlinedIcon
        sx={{ fontSize: '34px', '& path': { fill: mainColour02 } }}
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
        sx={{ fontSize: '34px', '& path': { fill: mainColour03 } }}
      />
    )
  }
];

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
        direction={{ xs: 'column', md: 'row' }}
        gap={2}
        sx={{ alignItems: 'stretch' }}
      >
        {kpiCardsData.map(props => {
          return (
            <KpiValue
              key={props.key}
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
