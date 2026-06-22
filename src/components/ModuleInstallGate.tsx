import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Paper,
  SxProps,
  Typography
} from '@mui/material';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';

interface IModuleInstallGateProps {
  moduleName: string;
  installed: boolean;
  installing?: boolean;
  installLabel?: string;
  installError?: string;
  installProgress?: number;
  onInstall: () => void;
  children: React.ReactNode;
}

const styles: Record<string, SxProps> = {
  root: {
    position: 'relative',
    minHeight: 260
  },
  content: {
    transition: 'filter 160ms ease, opacity 160ms ease'
  },
  lockedContent: {
    filter: 'blur(4px)',
    opacity: 0.38,
    pointerEvents: 'none',
    userSelect: 'none'
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 2,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    px: 2,
    pt: { xs: 4, md: 6 },
    background: 'rgba(248, 250, 252, 0.48)',
    backdropFilter: 'blur(2px)'
  },
  dialog: {
    width: 'min(420px, 100%)',
    p: 3,
    border: '1px solid #d7dde6',
    borderRadius: '8px',
    boxShadow: '0 18px 48px rgba(15, 23, 42, 0.18)',
    textAlign: 'center'
  }
};

export default function ModuleInstallGate({
  moduleName,
  installed,
  installing = false,
  installLabel,
  installError,
  installProgress = 0,
  onInstall,
  children
}: IModuleInstallGateProps) {
  const [showErrorDialog, setShowErrorDialog] = React.useState(true);

  React.useEffect(() => {
    setShowErrorDialog(true);
  }, [installError, installing]);

  const showOverlay = !installed && (!installError || showErrorDialog);
  const lockContent = !installed && showOverlay;
  const contentSx = (
    lockContent ? [styles.content, styles.lockedContent] : styles.content
  ) as SxProps;

  function handleInstallClick() {
    setShowErrorDialog(true);
    onInstall();
  }

  return (
    <Box sx={styles.root}>
      <Box sx={contentSx}>{children}</Box>

      {showOverlay && (
        <Box sx={styles.overlay}>
          <Paper elevation={0} sx={styles.dialog}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              This module is not installed.
            </Typography>
            {installing && (
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  component="div"
                  sx={{ mb: 0.75 }}
                >
                  {installLabel || `Installing ${moduleName}`}
                </Typography>
                <LinearProgress variant="determinate" value={installProgress} />
              </Box>
            )}
            {!installing && installError && (
              <Typography
                variant="caption"
                color="error"
                component="div"
                sx={{ mb: 2 }}
              >
                {installError}
              </Typography>
            )}
            <Button
              variant="contained"
              onClick={handleInstallClick}
              disabled={installing}
              startIcon={
                installing ? (
                  <CircularProgress color="inherit" size={16} />
                ) : (
                  <DownloadOutlinedIcon />
                )
              }
            >
              Install {moduleName}
            </Button>
            {!installing && installError && (
              <Button
                variant="text"
                size="small"
                onClick={() => setShowErrorDialog(false)}
                sx={{ mt: 1 }}
              >
                Show logs
              </Button>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
}
