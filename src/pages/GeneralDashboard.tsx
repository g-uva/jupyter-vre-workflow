import React from 'react';
import { Dayjs } from 'dayjs';

import { Paper, CircularProgress, Grid2 } from '@mui/material';
import ScaphChart from '../components/ScaphChart';
import MetricSelector from '../components/MetricSelector';
import DateTimeRange from '../components/DateTimeRange';
import { IPrometheusMetrics, KPIComponent } from '../components/KPIComponent';
import { NR_CHARTS } from '../helpers/constants';

const styles: Record<string, React.CSSProperties> = {
  main: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    flexWrap: 'wrap',
    boxSizing: 'border-box',
    padding: '10px',
    whiteSpace: 'nowrap'
  },
  grid: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  chartsWrapper: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center'
  }
};

const DEFAULT_METRICS: IPrometheusMetrics = {
  energyConsumed: 2.7, // E
  carbonIntensity: 400, // I
  embodiedEmissions: 50000, // M
  functionalUnit: 10, // R
  hepScore23: 42.3 // HEPScore23
};

interface IGeneralDashboardProps {
  startDate: Dayjs;
  setStartDate: (date: Dayjs) => void;
  setEndDate: (date: Dayjs) => void;
  endDate: Dayjs;
  metrics: string[];
  dataMap: Map<string, [number, string][]>;
  selectedMetric: string[];
  setSelectedMetric: (index: number, newMetric: string) => void;
  loading: boolean;
}

export default function GeneralDashboard({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  metrics,
  dataMap,
  selectedMetric,
  setSelectedMetric,
  loading
}: IGeneralDashboardProps) {
  const Charts: React.ReactElement[] = [];
  for (let i = 0; i < NR_CHARTS; i++) {
    Charts.push(
      <Grid2 sx={{ m: 5 }}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            width: '100%',
            borderRadius: 3,
            border: '1px solid #ccc'
          }}
        >
          <MetricSelector
            selectedMetric={selectedMetric[i]}
            setSelectedMetric={newMetric => setSelectedMetric(i, newMetric)}
            metrics={metrics}
          />
          <ScaphChart
            key={`${selectedMetric}-${i}`}
            rawData={dataMap.get(selectedMetric[i]) || []}
          />
        </Paper>
      </Grid2>
    );
  }

  return (
    <div style={styles.main}>
      <Paper
        key="grid-element-main"
        style={{
          ...styles.grid,
          flexDirection: 'column',
          minWidth: '100%',
          minHeight: '300px',
          borderRadius: '15px'
        }}
        elevation={3}
      >
        {loading ? (
          <CircularProgress />
        ) : loading === false && metrics.length === 0 ? (
          <Grid2
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <h3>
              No metrics available/loaded. Write your username on the textfield
              above and click "Fetch Metrics" to see the metrics.
            </h3>
          </Grid2>
        ) : (
          <Grid2 sx={{ width: '100%', height: '100%' }}>
            <Grid2
              sx={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between'
              }}
            >
              <Grid2>
                <DateTimeRange
                  startTime={startDate}
                  endTime={endDate}
                  onStartTimeChange={newValue => {
                    if (newValue) {
                      setStartDate(newValue);
                    }
                  }}
                  onEndTimeChange={newValue => {
                    if (newValue) {
                      setEndDate(newValue);
                    }
                  }}
                />
              </Grid2>
              <Grid2
                sx={{
                  ...styles.grid,
                  p: 2,
                  m: 2,
                  border: '1px solid #ccc',
                  borderRadius: '15px'
                }}
              >
                <KPIComponent metrics={DEFAULT_METRICS} />
              </Grid2>
            </Grid2>
            <Grid2 sx={{ ...styles.chartsWrapper }}>{Charts}</Grid2>
          </Grid2>
        )}
      </Paper>
    </div>
  );
}
