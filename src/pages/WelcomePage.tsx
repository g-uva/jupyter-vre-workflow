import React from 'react';
import { Grid2, SxProps, Typography } from '@mui/material';
import GeneralDashboard from './GeneralDashboard';
import { Dayjs } from 'dayjs';
import getScaphData from '../api/getScaphData';
import {
  startDateJs,
  endDateJs,
  NR_CHARTS,
  mainColour01,
  CONTAINER_ID
} from '../helpers/constants';
import { RawMetrics } from '../helpers/types';
import FetchMetricsComponent from '../components/FetchMetricsComponents';
import { KPIComponent } from '../components/KPIComponent';
import { getDateNow } from '../helpers/utils';
// import ScaphInstaller from '../components/ScaphInstaller';

export const styles: Record<string, SxProps> = {
  main: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  },
  title: {
    fontWeight: 'bold',
    color: mainColour01,
    my: 2
  },
  topRibbon: {
    display: 'flex',
    width: '100%',
    gap: 3
  },
  buttonGrid: {
    display: 'flex',
    width: '100%',
    gap: 3,
    justifyContent: 'center',
    alignContent: 'center',
    '& .MuiButtonBase-root': {
      textTransform: 'none'
    },
    mb: 2
  }
};

interface IWelcomePage {
  handleRealTimeClick: () => void;
  handlePredictionClick: () => void;
  handleGrafanaClick: () => void;
}

export default function WelcomePage({
  handleRealTimeClick,
  handlePredictionClick,
  handleGrafanaClick
}: IWelcomePage) {
  const [username, setUsername] = React.useState<string>('');
  const [startDate, setStartDate] = React.useState<Dayjs>(startDateJs);
  const [endDate, setEndDate] = React.useState<Dayjs>(endDateJs);

  const [metrics, setMetrics] = React.useState<string[]>([]);
  const [dataMap, setDataMap] = React.useState<RawMetrics>(new Map());
  const [selectedMetric, setSelectedMetric] = React.useState<string[]>(
    new Array(NR_CHARTS).fill('')
  );
  const [loading, setLoading] = React.useState<boolean>(false);

  const [isFetchMetrics, setIsFetchMetrics] = React.useState<boolean>(false);

  const [fetchIntervalS, setFetchIntervalS] = React.useState<number>(30);

  function handleUpdateSelectedMetric(index: number, newMetric: string) {
    setSelectedMetric(prev => {
      const updated = [...prev];
      updated[index] = newMetric;
      return updated;
    });
  }

  React.useEffect(() => {
    for (let i = 0; i < NR_CHARTS; i++) {
      if (selectedMetric[i] === '') {
        handleUpdateSelectedMetric(i, metrics[i] || '');
      }
    }
  }, [metrics]);

  async function fetchMetrics() {
    const container = document.getElementById(CONTAINER_ID);
    const scrollPosition = container?.scrollTop;

    setLoading(true);

    const now = getDateNow();
    setEndDate(now);

    getScaphData({
      url: `https://mc-a4.lab.uvalight.net/prometheus-${username}/`,
      startTime: startDate.unix(),
      endTime: now.unix()
    }).then(results => {
      if (container !== null && scrollPosition !== undefined) {
        container.scrollTop = scrollPosition;
      }

      if (results.size === 0) {
        console.error('No metrics found');
        setLoading(false);
        return;
      }

      setDataMap(results);
      const keys: string[] = Array.from(results.keys());
      setMetrics(keys);
      setLoading(false);
    });
  }

  function handleSetMetrics() {
    setIsFetchMetrics(true);
    fetchMetrics();
  }

  React.useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isFetchMetrics === true) {
      intervalId = setInterval(() => {
        fetchMetrics();
      }, fetchIntervalS * 1000);
    }

    return () => {
      if (intervalId) {
        return clearInterval(intervalId);
      }
    }; // Clear the interval Id when umounting ;)
  }, [isFetchMetrics]);

  return (
    <Grid2 sx={styles.main}>
      <Typography variant="h4" sx={styles.title}>
        🌱🌍♻️ EcoJupyter Dashboard
      </Typography>
      <Grid2 sx={styles.topRibbon}>
        <Grid2
          sx={{
            width: '100%',
            p: 2,
            m: 2,
            border: '1px solid #ccc',
            borderRadius: '15px'
          }}
        >
          <KPIComponent rawMetrics={dataMap} />
        </Grid2>
      </Grid2>
      {/* <ScaphInstaller /> */}

      {/* <Grid2 sx={styles.buttonGrid}>
        <Button variant="outlined">
          Install and run Scaphandre + Prometheus
        </Button>
        <Button variant="outlined" disabled>
          Export Metrics
        </Button>
        <Button variant="outlined" disabled>
          ZIP metrics
        </Button>
      </Grid2> */}
      <Grid2 sx={styles.buttonGrid}>
        {/* <Button variant="outlined" disabled onClick={handleRealTimeClick}>
          Real-time Tracking Monitor
        </Button> */}
        {/* <Button variant="outlined" disabled onClick={handlePredictionClick}>
          Resource Usage Prediction
        </Button> */}
        {/* <Button variant="outlined" disabled onClick={handleGrafanaClick}>
          Grafana Dashboard
        </Button> */}
      </Grid2>

      {metrics && (
        <>
          <Grid2 sx={styles.topRibbon}>
            <FetchMetricsComponent
              fetchMetrics={handleSetMetrics}
              username={username}
              setUsername={setUsername}
              fetchInterval={fetchIntervalS}
              setFetchInterval={setFetchIntervalS}
              setIsFetchMetrics={setIsFetchMetrics}
            />
          </Grid2>

          <GeneralDashboard
            startDate={startDate}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            endDate={endDate}
            metrics={metrics}
            dataMap={dataMap}
            selectedMetric={selectedMetric}
            setSelectedMetric={handleUpdateSelectedMetric}
            loading={loading}
          />
        </>
      )}
    </Grid2>
  );
}
