import React from 'react';

export interface IPrometheusMetrics {
  energyConsumed: number; // E
  carbonIntensity: number; // I
  embodiedEmissions: number; // M
  functionalUnit: number; // R
  hepScore23: number; // HEPScore23 benchmark
}

export interface IKPIValues {
  sci: number;
  hepScore23: number;

  sciPerUnit: number;
  energyPerUnit: number;
}

export function calculateKPIs(metrics: IPrometheusMetrics): IKPIValues {
  const {
    energyConsumed: E,
    carbonIntensity: I,
    embodiedEmissions: M,
    functionalUnit: R,
    hepScore23
  } = metrics;

  // SCI calculation
  // SCI = ((E * I) + M) / R
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

export const KPIComponent = ({ metrics }: { metrics: IPrometheusMetrics }) => {
  const kpi = React.useMemo(() => calculateKPIs(metrics), [metrics]);

  return (
    <div>
      <div>SCI: {kpi.sci}</div>
      <div>HEPScore23: {kpi.hepScore23}</div>
      <div>SCI per Unit: {kpi.sciPerUnit}</div>
      <div>Energy per Unit: {kpi.energyPerUnit}</div>
    </div>
  );
};
