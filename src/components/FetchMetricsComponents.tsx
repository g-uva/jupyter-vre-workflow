import React from 'react';
import { Grid2, Tooltip, TextField, Button } from '@mui/material';
import { styles } from '../pages/WelcomePage';
import FetchAutomatic from './FetchAutomatic';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

interface IFetchMetricsComponent {
  fetchMetrics: () => void;
  username: string;
  setUsername: (name: string) => void;
  fetchInterval: number;
  setFetchInterval: (value: number) => void;
  setIsFetchMetrics: (value: boolean) => void;
}

export default function FetchMetricsComponent({
  fetchMetrics,
  username,
  setUsername,
  fetchInterval,
  setFetchInterval,
  setIsFetchMetrics
}: IFetchMetricsComponent) {
  return (
    <Grid2 sx={{ ...styles.buttonGrid, mb: 0 }}>
      <Tooltip title="Enter your username in lowercase letters. The same used to log in to the GreenDIGIT platform.">
        <TextField
          variant="outlined"
          value={username}
          onChange={e => setUsername(e.target.value.toLowerCase())}
          placeholder="Enter your username"
          sx={{ width: '200px' }}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
              fetchMetrics();
            }
          }}
          size="small"
        />
      </Tooltip>
      <Button
        disabled={username.length === 0}
        variant="outlined"
        onClick={fetchMetrics}
        sx={{ maxHeight: '40px' }}
        startIcon={<RefreshRoundedIcon />}
      >
        Refresh Metrics
      </Button>
      <FetchAutomatic
        fetchInterval={fetchInterval}
        setFetchInterval={setFetchInterval}
        setIsFetchMetrics={setIsFetchMetrics}
      />
    </Grid2>
  );
}
