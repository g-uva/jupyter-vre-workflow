import React from 'react';
import dayjs, { Dayjs } from 'dayjs';

import { Paper, CircularProgress, Grid2 } from '@mui/material';
import ScaphChart from '../components/ScaphChart';
import getScaphData from '../api/getScaphData';
import MetricSelector from '../components/MetricSelector';
import DateTimeRange from '../components/DateTimeRange';
import { IPrometheusMetrics, KPIComponent } from '../components/KPIComponent';

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

const NR_CHARTS = 4;

const end = Math.floor(Date.now() / 1000);
const start = end - 3600; // last hour
const endDateJs = dayjs(end * 1000);
const startDateJs = dayjs(start * 1000);

const DEFAULT_METRICS: IPrometheusMetrics = {
  energyConsumed: 2.7, // E
  carbonIntensity: 400, // I
  embodiedEmissions: 50000, // M
  functionalUnit: 10, // R
  hepScore23: 42.3 // HEPScore23
};

export default function GeneralDashboard() {
  const [startDate, setStartDate] = React.useState<Dayjs>(startDateJs);
  const [endDate, setEndDate] = React.useState<Dayjs>(endDateJs);

  const [metrics, setMetrics] = React.useState<string[]>([]);
  const [dataMap, setDataMap] = React.useState<Map<string, [number, string][]>>(
    new Map()
  );
  const [selectedMetric, setSelectedMetric] = React.useState<string[]>(
    new Array(NR_CHARTS).fill('')
  );
  const [loading, setLoading] = React.useState<boolean>(true);

  function handleUpdateSelectedMetric(index: number, newMetric: string) {
    setSelectedMetric(prev => {
      const updated = [...prev];
      updated[index] = newMetric;
      return updated;
    });
  }

  React.useEffect(() => {
    setLoading(true);
    getScaphData({ startTime: startDate.unix(), endTime: endDate.unix() }).then(
      results => {
        if (results.size === 0) {
          console.error('No metrics found');
          setLoading(false);
          return;
        }
        setDataMap(results);
        const keys = Array.from(results.keys());
        setMetrics(keys);
        setLoading(false);
      }
    );
  }, [startDate, endDate]);

  React.useEffect(() => {
    for (let i = 0; i < NR_CHARTS; i++) {
      if (selectedMetric[i] === '') {
        handleUpdateSelectedMetric(i, metrics[i] || '');
      }
    }
  }, [metrics]);

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
            setSelectedMetric={newMetric =>
              handleUpdateSelectedMetric(i, newMetric)
            }
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
