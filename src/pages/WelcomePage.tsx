import React from 'react';
import {
  Button, //Divider,
  Grid2,
  SxProps,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import GeneralDashboard from './GeneralDashboard';
import { Dayjs } from 'dayjs';
import getScaphData from '../api/getScaphData';
import { startDateJs, endDateJs, NR_CHARTS } from '../helpers/constants';
// import ScaphInstaller from '../components/ScaphInstaller';

const styles: Record<string, SxProps> = {
  main: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  },
  title: {
    my: 2
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
  const [dataMap, setDataMap] = React.useState<Map<string, [number, string][]>>(
    new Map()
  );
  const [selectedMetric, setSelectedMetric] = React.useState<string[]>(
    new Array(NR_CHARTS).fill('')
  );
  const [loading, setLoading] = React.useState<boolean>(false);

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
    setLoading(true);
    getScaphData({
      url: `https://mc-a4.lab.uvalight.net/prometheus-${username}/`,
      startTime: startDate.unix(),
      endTime: endDate.unix()
    }).then(results => {
      if (results.size === 0) {
        console.error('No metrics found');
        setLoading(false);
        return;
      }
      setDataMap(results);
      const keys = Array.from(results.keys());
      setMetrics(keys);
      setLoading(false);
    });
  }

  return (
    <Grid2 sx={styles.main}>
      <Typography variant="h4" sx={styles.title}>
        GreenDIGIT Dashboard
      </Typography>

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
        <Tooltip title="Enter your username in lowercase letters. The same used to log in to the GreenDIGIT platform.">
          <TextField
            variant="outlined"
            value={username}
            onChange={e => setUsername(e.target.value.toLowerCase())}
            placeholder="Enter your username"
            sx={{ width: '300px' }}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                fetchMetrics();
              }
            }}
          />
        </Tooltip>
        <Button
          disabled={username.length === 0}
          variant="outlined"
          onClick={fetchMetrics}
        >
          Fetch Metrics
        </Button>
      </Grid2>
      <Grid2 sx={styles.buttonGrid}>
        <Button variant="outlined" disabled onClick={handleRealTimeClick}>
          Real-time Tracking Monitor
        </Button>
        <Button variant="outlined" disabled onClick={handlePredictionClick}>
          Resource Usage Prediction
        </Button>
        <Button variant="outlined" disabled onClick={handleGrafanaClick}>
          Grafana Dashboard
        </Button>
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
    </Grid2>
  );
}
