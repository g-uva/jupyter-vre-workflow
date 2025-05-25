import React, { useEffect, useState } from 'react';
import { Paper, CircularProgress, Grid2 } from '@mui/material';
import ScaphChart from '../components/ScaphChart';
import getScaphData from '../api/getScaphData';
import MetricSelector from '../components/MetricSelector';

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

export default function GeneralDashboard() {
  const [metrics, setMetrics] = useState<string[]>([]);
  const [dataMap, setDataMap] = useState<Map<string, [number, string][]>>(
    new Map()
  );
  const [selectedMetric, setSelectedMetric] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    getScaphData().then(results => {
      if (results.size === 0) {
        console.error('No metrics found');
        setLoading(false);
        return;
      }
      setDataMap(results);
      const keys = Array.from(results.keys());
      setMetrics(keys);
      setSelectedMetric(keys[0] || '');
      setLoading(false);
    });
  }, []);

  const Charts: React.ReactElement[] = [];
  for (let i = 0; i < NR_CHARTS; i++) {
    Charts.push(
      <Grid2 size={{ xs: 12, sm: 6 }}>
        <Paper elevation={3} sx={{ p: 2, width: '100%', m: 2 }}>
          <MetricSelector
            selectedMetric={selectedMetric}
            setSelectedMetric={setSelectedMetric}
            metrics={metrics}
          />
          <ScaphChart
            key={`${selectedMetric}-${i}`}
            rawData={dataMap.get(selectedMetric) || []}
          />
        </Paper>
      </Grid2>
    );
  }

  return (
    <div style={styles.main}>
      <Paper
        key="grid-element-main"
        style={{ ...styles.grid, flexDirection: 'column', minWidth: '100%' }}
        elevation={3}
      >
        {loading ? (
          <CircularProgress />
        ) : (
          <Grid2 sx={{ width: '100%', height: '100%' }}>
            <Grid2 sx={styles.chartsWrapper}>{Charts}</Grid2>
          </Grid2>
        )}
      </Paper>
    </div>
  );
}
