import React from 'react';
import { Grid2, Tooltip, TextField, Button } from '@mui/material';
import { styles } from '../pages/WelcomePage';

interface IFetchMetricsComponent {
  fetchMetrics: () => void;
  username: string;
  setUsername: (name: string) => void;
}

export default function FetchMetricsComponent({
  fetchMetrics,
  username,
  setUsername
}: IFetchMetricsComponent) {
  return (
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
  );
}
