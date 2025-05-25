import React from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

interface IMetricSelectorProps {
  selectedMetric: string;
  setSelectedMetric: (metric: string) => void;
  metrics: string[];
}

export default function MetricSelector({
  selectedMetric,
  setSelectedMetric,
  metrics
}: IMetricSelectorProps) {
  return (
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
        size="small"
      >
        {metrics.map(metric => (
          <MenuItem key={metric} value={metric}>
            {metric}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
