import React from 'react';
import { Grid2 } from '@mui/material';
import { Dayjs } from 'dayjs';

interface IDashboardChartView {
  startDate: Dayjs;
  setStartDate: (date: Dayjs) => void;
  setEndDate: (date: Dayjs) => void;
  endDate: Dayjs;
  children: React.ReactNode;
}

export default function DashboardChartView({
  children
}: IDashboardChartView) {
  return (
    <Grid2
      sx={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '16px',
        padding: '8px 0'
      }}
    >
      {children}
    </Grid2>
  );
}
