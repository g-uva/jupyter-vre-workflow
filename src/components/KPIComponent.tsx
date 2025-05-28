import React from 'react';
import {
  IKPIValues,
  ISCIProps,
  METRIC_KEY_MAP,
  RawMetrics,
  IPrometheusMetrics
} from '../helpers/types';
import { microjoulesToKWh } from '../helpers/utils';

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
    <div>
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
      <div>
        <span style={{ fontWeight: 'bold' }}>HEPScore23</span>: {kpi.hepScore23}
      </div>
    </div>
  );
};
