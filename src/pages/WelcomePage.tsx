import React from 'react';
import {
  Button, //Divider,
  Grid2,
  SxProps,
  Typography
} from '@mui/material';
import GeneralDashboard from './GeneralDashboard';
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

// function activateServer() {
// }

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
  return (
    <Grid2 sx={styles.main}>
      <Typography variant="h4" sx={styles.title}>
        GreenDIGIT Dashboard
      </Typography>

      {/* <ScaphInstaller /> */}

      {/* <Grid2 sx={styles.buttonGrid}>
        <Button variant="outlined">Download Scaphandre + Prometheus</Button>
        <Button variant="outlined" disabled>
          Start Scaphandre
        </Button>
        <Button variant="outlined" disabled>
          Export Metrics
        </Button>
        <Button variant="outlined" disabled>
          ZIP metrics
        </Button>
      </Grid2> */}
      <Grid2 sx={styles.buttonGrid}>
        <Button variant="outlined" disabled onClick={handleRealTimeClick}>
          Real-time Tracking Monitor
        </Button>
        <Button variant="outlined" onClick={handlePredictionClick}>
          Resource Usage Prediction
        </Button>
        <Button variant="outlined" disabled onClick={handleGrafanaClick}>
          Grafana Dashboard
        </Button>
      </Grid2>

      <GeneralDashboard />
    </Grid2>
  );
}
