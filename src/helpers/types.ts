export const METRIC_KEY_MAP: Record<string, string> = {
  energyConsumed: 'scaph_host_energy_microjoules', // E
  carbonIntensity: 'scaph_carbon_intensity', // I (if available, or set manually)
  embodiedEmissions: 'scaph_embodied_emissions', // M (set manually or via other means)
  functionalUnit: 'scaph_host_load_avg_fifteen' // R (e.g., load avg as a proxy)
  //   hepScore23: 'scaph_hep_score_23' // HEPScore23 (if tracked)
} as const;

export type RawMetrics = Map<string, [number, string][]>;

export interface ISCIProps {
  E: number;
  I: number;
  M: number;
  R: number;
}

export interface IKPIValues {
  sci: number;
  // hepScore23: number;

  sciPerUnit: number;
  energyPerUnit: number;
}

export interface IPrometheusMetrics {
  energyConsumed: number; // E, in kWh
  carbonIntensity: number; // I, gCO2/kWh
  embodiedEmissions: number; // M, gCO2
  functionalUnit: number; // R
  // hepScore23: number; // HEPScore23
}
