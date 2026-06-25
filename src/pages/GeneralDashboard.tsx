import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { RawMetrics } from '../helpers/types';
import ChartGrid from '../components/ChartGrid';

// styles kept for any external references
export const styles = {};

interface IGeneralDashboardProps {
  metrics: string[];
  dataMap: RawMetrics;
  loading: boolean;
}

export default function GeneralDashboard({
  metrics,
  dataMap,
  loading
}: IGeneralDashboardProps) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return <ChartGrid metrics={metrics} dataMap={dataMap} />;
}
