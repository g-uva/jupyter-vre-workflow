import { METRIC_KEY_MAP } from './types';

const now = Math.floor(Date.now() / 1000);
const HOUR = 3600;

function generateSeries(
  startValue: number,
  endValue: number,
  points = 60,
  noiseRatio = 0.05
): [number, string][] {
  const step = HOUR / points;
  // Use a seeded-ish pattern so it looks realistic and consistent
  return Array.from({ length: points }, (_, i) => {
    const t = now - HOUR + Math.round(i * step);
    const progress = i / Math.max(points - 1, 1);
    const trend = startValue + (endValue - startValue) * progress;
    // Deterministic noise using sine waves so it looks natural without randomness on re-render
    const jitter =
      trend * noiseRatio * Math.sin(i * 0.7) * Math.cos(i * 0.31);
    return [t, String(Math.max(0, trend + jitter).toFixed(4))];
  });
}

export const MOCK_DATA_MAP: Map<string, [number, string][]> = new Map([
  [METRIC_KEY_MAP.energyConsumed, generateSeries(1.2e12, 1.92e12, 60, 0.004)],
  [METRIC_KEY_MAP.functionalUnit, generateSeries(1.1, 1.85, 60, 0.1)],
  ['scaph_host_power_microwatts', generateSeries(150e6, 210e6, 60, 0.07)],
  ['scaph_process_power_microwatts', generateSeries(42e6, 78e6, 60, 0.1)]
]);

export const MOCK_METRICS: string[] = Array.from(MOCK_DATA_MAP.keys());

// Prediction series: continuation of energy beyond now, 30 min ahead
const PRED_POINTS = 30;
export const MOCK_PREDICTION_ENERGY: [number, string][] = Array.from(
  { length: PRED_POINTS },
  (_, i) => {
    const t = now + Math.round(i * (1800 / PRED_POINTS));
    const trend = 1.92e12 + (i / (PRED_POINTS - 1)) * 0.45e12;
    const jitter = trend * 0.003 * Math.sin(i * 0.5);
    return [t, String(Math.max(0, trend + jitter).toFixed(4))];
  }
);

export const MOCK_PREDICTION_POWER: [number, string][] = Array.from(
  { length: PRED_POINTS },
  (_, i) => {
    const t = now + Math.round(i * (1800 / PRED_POINTS));
    const trend = 210e6 + (i / (PRED_POINTS - 1)) * 30e6;
    const jitter = trend * 0.04 * Math.sin(i * 0.6 + 1);
    return [t, String(Math.max(0, trend + jitter).toFixed(4))];
  }
);

// Mock historical experiment sessions (last 7 days)
export interface IMockHistoryEntry {
  id: string;
  date: string;
  workflow: string;
  experiment: string;
  energyKWh: number;
  co2g: number;
  durationMin: number;
  sciScore: number;
}

export const MOCK_HISTORY: IMockHistoryEntry[] = [
  {
    id: 'exp-001',
    date: '2026-06-25',
    workflow: 'ml-pipeline',
    experiment: '2026-06-25 09:14',
    energyKWh: 0.0182,
    co2g: 7.28,
    durationMin: 14,
    sciScore: 12.4
  },
  {
    id: 'exp-002',
    date: '2026-06-24',
    workflow: 'ml-pipeline',
    experiment: '2026-06-24 14:32',
    energyKWh: 0.0241,
    co2g: 9.64,
    durationMin: 19,
    sciScore: 16.8
  },
  {
    id: 'exp-003',
    date: '2026-06-23',
    workflow: 'data-processing',
    experiment: '2026-06-23 11:05',
    energyKWh: 0.0097,
    co2g: 3.88,
    durationMin: 8,
    sciScore: 6.2
  },
  {
    id: 'exp-004',
    date: '2026-06-22',
    workflow: 'ml-pipeline',
    experiment: '2026-06-22 16:48',
    energyKWh: 0.0315,
    co2g: 12.6,
    durationMin: 25,
    sciScore: 22.1
  },
  {
    id: 'exp-005',
    date: '2026-06-21',
    workflow: 'data-processing',
    experiment: '2026-06-21 09:33',
    energyKWh: 0.0134,
    co2g: 5.36,
    durationMin: 11,
    sciScore: 8.9
  },
  {
    id: 'exp-006',
    date: '2026-06-20',
    workflow: 'ml-pipeline',
    experiment: '2026-06-20 13:21',
    energyKWh: 0.0278,
    co2g: 11.12,
    durationMin: 22,
    sciScore: 18.5
  },
  {
    id: 'exp-007',
    date: '2026-06-19',
    workflow: 'data-processing',
    experiment: '2026-06-19 10:44',
    energyKWh: 0.0116,
    co2g: 4.64,
    durationMin: 9,
    sciScore: 7.7
  }
];
