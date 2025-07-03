import React from 'react';
import { Grid2, Button } from '@mui/material';
import { styles } from '../pages/WelcomePage';
// import FetchAutomatic from './FetchAutomatic';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

interface IFetchMetricsComponent {
  fetchMetrics: () => void;
  // fetchInterval: number;
  // setFetchInterval: (value: number) => void;
  // setIsFetchMetrics: (value: boolean) => void;
  handleInstallMetrics: () => void;
}

export default function FetchMetricsComponent({
  fetchMetrics,
  // fetchInterval,
  // setFetchInterval,
  // setIsFetchMetrics,
  handleInstallMetrics
}: IFetchMetricsComponent) {
  return (
    <Grid2 sx={{ ...styles.buttonGrid, mb: 0 }}>
      <Button
        variant="outlined"
        onClick={handleInstallMetrics}
        sx={{ maxHeight: '40px' }}
        startIcon={<RefreshRoundedIcon />}
      >
        Install metrics' agent
      </Button>
      <Button
        // disabled={username.length === 0}
        variant="outlined"
        onClick={fetchMetrics}
        sx={{ maxHeight: '40px' }}
        startIcon={<RefreshRoundedIcon />}
      >
        Refresh Metrics
      </Button>
      {/* <FetchAutomatic
        fetchInterval={fetchInterval}
        setFetchInterval={setFetchInterval}
        setIsFetchMetrics={setIsFetchMetrics}
      /> */}
    </Grid2>
  );
}
