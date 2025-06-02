import React from 'react';
import { Dayjs } from 'dayjs';

import {
  Paper,
  CircularProgress,
  Grid2,
  SxProps,
  Typography
} from '@mui/material';
import ScaphChart from '../components/ScaphChart';
import MetricSelector from '../components/MetricSelector';
import { NR_CHARTS } from '../helpers/constants';
import { RawMetrics } from '../helpers/types';
import TabPaperDashboard from '../components/TabPaper';
import DashboardChartView from './DashboardChartView';
import createExperimentMarker from '../api/CreateExperimentMarker';

export const styles: Record<string, SxProps> = {
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
  },
  paper: {
    p: 2,
    width: '100%',
    borderRadius: 3,
    border: '1px solid #ccc',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center !important'
  }
};

interface IGeneralDashboardProps {
  startDate: Dayjs;
  setStartDate: (date: Dayjs) => void;
  setEndDate: (date: Dayjs) => void;
  endDate: Dayjs;
  metrics: string[];
  dataMap: RawMetrics;
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
  createExperimentMarker();

  const Charts: React.ReactElement[] = [];
  for (let i = 0; i < NR_CHARTS; i++) {
    Charts.push(
      <Grid2 sx={{ mx: 5, my: 2 }}>
        <Paper elevation={0} sx={styles.paper}>
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
    <div style={styles.main as React.CSSProperties}>
      <Paper
        key="grid-element-main"
        style={{
          ...(styles.grid as React.CSSProperties),
          flexDirection: 'column',
          minWidth: '100%',
          minHeight: '300px',
          borderRadius: '15px',
          border: '1px solid #ccc'
        }}
        elevation={0}
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
              alignItems: 'center',
              padding: '30px'
            }}
          >
            <Typography variant="body2" sx={{ textWrap: 'wrap' }}>
              No metrics available/loaded. Write your username on the textfield
              above and click "Refresh Metrics" to see the metrics.
            </Typography>
          </Grid2>
        ) : (
          <Grid2 sx={{ width: '100%', height: '100%' }}>
            <TabPaperDashboard>
              <DashboardChartView
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
              >
                {Charts}
              </DashboardChartView>
              <div>Prediction page</div>
              <div>History</div>
            </TabPaperDashboard>
          </Grid2>
        )}
      </Paper>
    </div>
  );
}
