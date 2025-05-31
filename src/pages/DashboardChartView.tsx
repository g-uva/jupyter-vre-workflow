import React from 'react';
import { Grid2 } from '@mui/material';
import DateTimeRange from '../components/DateTimeRange';
import { styles } from './GeneralDashboard';
import { Dayjs } from 'dayjs';

interface IDashboardChartView {
  startDate: Dayjs;
  setStartDate: (date: Dayjs) => void;
  setEndDate: (date: Dayjs) => void;
  endDate: Dayjs;
  children: React.ReactNode;
}

export default function DashboardChartView({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  children
}: IDashboardChartView) {
  return (
    <>
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
      </Grid2>
      <Grid2 sx={{ ...styles.chartsWrapper }}>{children}</Grid2>
    </>
  );
}
