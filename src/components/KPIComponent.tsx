import React from 'react';
// import dayjs from 'dayjs';

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
  Button,
  FormControl,
  Grid2,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack
  // Typography
} from '@mui/material';

import SolarPowerOutlinedIcon from '@mui/icons-material/SolarPowerOutlined';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import EnergySavingsLeafOutlinedIcon from '@mui/icons-material/EnergySavingsLeafOutlined';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

import KpiValue from './KpiValue';
// import getDynamicCarbonIntensity from '../api/getCarbonIntensityData';
import { mainColour01, mainColour02, mainColour03 } from '../helpers/constants';
import { styles } from '../pages/WelcomePage';

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
  experimentList: string[];
  workflowList: string[];
  handleSubmitExport: () => void;
  handleRefreshExperimentList: () => void;
  selectedExperiment: string | null;
  setSelectedExperiment: (newValue: string) => void;
  selectedWorkflow: string | null;
  setSelectedWorkflow: (newValue: string) => void;
}

// const START = 1748855616000;
// const END = 1748858436000;

const kpiCardsData: Array<{
  key: keyof IKPIValues;
  title: string;
  unit: string;
  color: React.CSSProperties['color'];
  icon: React.ReactNode;
  tempValue: number;
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
    ),
    tempValue: 1.23
  },
  {
    key: 'operationalEmissions',
    title: 'Op. Emissions',
    unit: 'gCO₂',
    color: mainColour02,
    icon: (
      <BoltOutlinedIcon
        sx={{ fontSize: '56px', '& path': { fill: mainColour02 } }}
      />
    ),
    tempValue: 3.33
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
    ),
    tempValue: 12.54
  }
];

export const KPIComponent = ({
  rawMetrics,
  experimentList,
  workflowList,
  handleRefreshExperimentList,
  selectedExperiment,
  setSelectedExperiment,
  selectedWorkflow,
  setSelectedWorkflow,
  handleSubmitExport
}: IKPIComponentProps) => {
  const [kpi, setKpi] = React.useState<IKPIValues | null>(null);
  console.log(kpi);

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
        <Box gap={2} sx={styles.buttonGrid}>
          <IconButton onClick={handleRefreshExperimentList}>
            <RefreshRoundedIcon />
          </IconButton>

          <FormControl>
            <InputLabel sx={{ background: 'white' }}>
              Selected Workflow ID
            </InputLabel>
            <Select
              key={selectedWorkflow || 'workflow-select'}
              size="small"
              value={selectedWorkflow || ''}
              onChange={e => {
                e !== null && setSelectedWorkflow(e.target.value ?? '');
              }}
              sx={{ minWidth: '150px' }}
            >
              <MenuItem disabled value="">
                <em>Select Workflow</em>
              </MenuItem>
              {workflowList &&
                workflowList.map((workflowId: string, index: number) => {
                  return (
                    <MenuItem key={index} value={workflowId}>
                      {workflowId}
                    </MenuItem>
                  );
                })}
            </Select>
          </FormControl>
          <FormControl>
            <InputLabel sx={{ background: 'white' }}>
              Selected Experiment ID
            </InputLabel>
            <Select
              key={selectedExperiment || 'experiment-select'}
              size="small"
              value={selectedExperiment || ''}
              onChange={e => {
                e !== null && setSelectedExperiment(e.target.value ?? '');
              }}
              sx={{ minWidth: '150px' }}
            >
              <MenuItem disabled value="">
                <em>Select Experiment</em>
              </MenuItem>
              {experimentList &&
                experimentList.map((experimentId: string, index: number) => {
                  return (
                    <MenuItem key={index} value={experimentId}>
                      {experimentId.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/)?.[0]}
                    </MenuItem>
                  );
                })}
            </Select>
          </FormControl>
          {/* <Typography variant="body2">
            <span style={{ fontWeight: 'bold' }}>Start: </span>{' '}
            {dayjs(START).toString()} <br />
            <span style={{ fontWeight: 'bold' }}>End: </span>{' '}
            {dayjs(END).toString()}
          </Typography> */}
        </Box>
        <Box sx={styles.buttonGrid}>
          <Button variant="outlined" onClick={handleSubmitExport}>
            Submit to FDMI (SoBigData)
          </Button>
        </Box>
      </Stack>
      <Stack direction="row" gap={2}>
        {kpiCardsData.map(props => {
          return (
            <KpiValue
              title={props.title}
              // value={kpi?.[props.key] ?? 0}
              value={props.tempValue}
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
