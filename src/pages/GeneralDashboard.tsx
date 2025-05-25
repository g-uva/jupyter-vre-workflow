import React, { useEffect, useState } from 'react';
import {
  Paper,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress
} from '@mui/material';
import ScaphChart from '../components/ScaphChart';
import getScaphData from '../api/getScaphData';

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
  }
};

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

  return (
    <div style={styles.main}>
      <Paper
        key="grid-element-main"
        style={{ ...styles.grid, flexDirection: 'column', minWidth: 800 }}
        elevation={3}
      >
        {loading ? (
          <CircularProgress />
        ) : (
          <>
            <FormControl
              variant="outlined"
              size="small"
              style={{ margin: 16, minWidth: 200 }}
            >
              <InputLabel id="metric-label">Metric</InputLabel>
              <Select
                labelId="metric-label"
                value={selectedMetric}
                label="Metric"
                onChange={e => setSelectedMetric(e.target.value as string)}
              >
                {metrics.map(metric => (
                  <MenuItem key={metric} value={metric}>
                    {metric}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <ScaphChart
              key={selectedMetric}
              rawData={dataMap.get(selectedMetric) || []}
            />
          </>
        )}
      </Paper>
    </div>
  );
}
