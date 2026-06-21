import React from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Menu,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { styles } from '../pages/WelcomePage';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import SystemUpdateAltOutlinedIcon from '@mui/icons-material/SystemUpdateAltOutlined';

interface IFetchMetricsComponent {
  fetchMetrics: () => void;
  automaticRefresh: boolean;
  refreshIntervalS: number;
  setAutomaticRefresh: (value: boolean) => void;
  setRefreshIntervalS: (value: number) => void;
  handleInstallMetrics: () => void;
  installingMetrics: boolean;
  installProgress: number;
  installLabel: string;
  installLogs: string[];
  metricsInstalled: boolean;
  showControls?: boolean;
  showProgress?: boolean;
}

export default function FetchMetricsComponent({
  fetchMetrics,
  automaticRefresh,
  refreshIntervalS,
  setAutomaticRefresh,
  setRefreshIntervalS,
  handleInstallMetrics,
  installingMetrics,
  installProgress,
  installLabel,
  installLogs,
  metricsInstalled,
  showControls = true,
  showProgress = true
}: IFetchMetricsComponent) {
  const [settingsAnchor, setSettingsAnchor] =
    React.useState<HTMLElement | null>(null);

  function handleRefreshIntervalChange(value: string) {
    const parsedValue = Number(value);
    if (Number.isNaN(parsedValue)) {
      return;
    }
    setRefreshIntervalS(Math.min(600, Math.max(1, parsedValue)));
  }

  return (
    <Stack
      gap={1.5}
      sx={{ width: showControls && !showProgress ? 'auto' : '100%' }}
    >
      {showControls && (
        <Stack
          direction="row"
          gap={1}
          alignItems="center"
          justifyContent="flex-end"
          sx={{ ...styles.buttonGrid, mb: 0 }}
        >
          {metricsInstalled && (
            <Typography
              variant="caption"
              color="success.main"
              sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}
            >
              Telemetry module installed
            </Typography>
          )}
          <Tooltip title="Refresh metrics">
            <IconButton
              onClick={fetchMetrics}
              size="small"
              aria-label="Refresh metrics"
              sx={{ width: 32, height: 32 }}
            >
              <RefreshRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Metrics settings">
            <IconButton
              onClick={event => setSettingsAnchor(event.currentTarget)}
              size="small"
              aria-label="Metrics settings"
              sx={{ width: 32, height: 32 }}
            >
              <SettingsOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={settingsAnchor}
            open={Boolean(settingsAnchor)}
            onClose={() => setSettingsAnchor(null)}
          >
            <Box sx={{ px: 2, py: 1.5, width: 280 }}>
              <Button
                variant="outlined"
                onClick={handleInstallMetrics}
                size="small"
                fullWidth
                sx={{ mb: 1.5, justifyContent: 'flex-start' }}
                startIcon={
                  metricsInstalled ? (
                    <SystemUpdateAltOutlinedIcon />
                  ) : (
                    <DownloadOutlinedIcon />
                  )
                }
                disabled={installingMetrics}
              >
                {metricsInstalled
                  ? 'Update telemetry module'
                  : 'Install telemetry module'}
              </Button>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={automaticRefresh}
                    onChange={event =>
                      setAutomaticRefresh(event.target.checked)
                    }
                    size="small"
                  />
                }
                label="Automatic metrics refresh"
              />
              <TextField
                label="Seconds"
                type="number"
                size="small"
                value={refreshIntervalS}
                onChange={event =>
                  handleRefreshIntervalChange(event.target.value)
                }
                disabled={!automaticRefresh}
                slotProps={{
                  htmlInput: {
                    min: 1,
                    max: 600
                  }
                }}
                sx={{ mt: 1, width: '100%' }}
              />
            </Box>
          </Menu>
        </Stack>
      )}

      {showProgress &&
        (installingMetrics ||
          installProgress > 0 ||
          installLogs.length > 0) && (
          <Box>
            <Stack direction="row" justifyContent="space-between" gap={2}>
              <Typography variant="caption" color="text.secondary">
                {installLabel || 'Installing metrics agent'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {installProgress}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={installProgress}
              sx={{ mt: 0.5 }}
            />
            {installLogs.length > 0 && (
              <Box
                sx={{
                  mt: 1,
                  maxHeight: 96,
                  overflow: 'auto',
                  border: '1px solid #e5eaf0',
                  borderRadius: '8px',
                  p: 1,
                  background: '#fbfcfe'
                }}
              >
                {installLogs.slice(-6).map((log, index) => (
                  <Typography
                    key={`${index}-${log}`}
                    variant="caption"
                    component="div"
                    sx={{ whiteSpace: 'pre-wrap' }}
                  >
                    {log}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        )}
    </Stack>
  );
}
