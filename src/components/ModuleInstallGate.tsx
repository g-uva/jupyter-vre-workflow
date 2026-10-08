import React from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Paper,
  SxProps,
  Typography
} from '@mui/material';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import PowerSettingsNewOutlinedIcon from '@mui/icons-material/PowerSettingsNewOutlined';

interface IModuleInstallGateProps {
  moduleName: string;
  prerequisiteText?: string;
  installed: boolean;
  installing?: boolean;
  installLabel?: string;
  installError?: string;
  installProgress?: number;
  installLogs?: string[];
  installDisabled?: boolean;
  activationOnly?: boolean;
  mockInstallation?: boolean;
  statusDetails?: React.ReactNode;
  onInstall: () => void;
  children: React.ReactNode;
}

const styles: Record<string, SxProps> = {
  root: {
    position: 'relative',
    height: '100%',
    minHeight: 0
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
    overflowY: 'auto',
    scrollbarGutter: 'stable',
    background: 'rgba(248, 250, 252, 0.48)',
    backdropFilter: 'blur(2px)'
  },
  dialog: {
    width: 'min(420px, 100%)',
    minHeight: 180,
    maxHeight: 'calc(100% - 32px)',
    overflowY: 'auto',
    p: 3,
    border: '1px solid #d7dde6',
    borderRadius: '8px',
    boxShadow: '0 18px 48px rgba(15, 23, 42, 0.18)',
    textAlign: 'center'
  }
};

export default function ModuleInstallGate({
  moduleName,
  prerequisiteText,
  installed,
  installing = false,
  installLabel,
  installError,
  installProgress = 0,
  installLogs = [],
  installDisabled = false,
  activationOnly = false,
  mockInstallation = false,
  statusDetails,
  onInstall,
  children
}: IModuleInstallGateProps) {
  const showOverlay = !installed;
  const lockContent = !installed;
  const contentSx = (
    lockContent ? [styles.content, styles.lockedContent] : styles.content
  ) as SxProps;

  return (
    <Box sx={styles.root}>
      <Box sx={contentSx}>{children}</Box>

      {showOverlay && (
        <Box sx={styles.overlay}>
          <Paper elevation={0} sx={styles.dialog}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              {mockInstallation
                ? 'This bundled module is not installed for the workshop.'
                : activationOnly
                  ? 'This bundled module is not active.'
                  : 'This module is not installed.'}
            </Typography>
            {prerequisiteText && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {prerequisiteText}
              </Typography>
            )}
            {statusDetails && <Box sx={{ mb: 2 }}>{statusDetails}</Box>}
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
              <Alert severity="warning" sx={{ mb: 2, textAlign: 'left' }}>
                {installError}
              </Alert>
            )}
            {installLogs.length > 0 && (
              <Box
                sx={{
                  mb: 2,
                  maxHeight: 96,
                  overflow: 'auto',
                  textAlign: 'left',
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
            <Button
              onClick={onInstall}
              disabled={installing || installDisabled}
              startIcon={
                installing ? (
                  <CircularProgress color="inherit" size={16} />
                ) : activationOnly ? (
                  <PowerSettingsNewOutlinedIcon />
                ) : (
                  <DownloadOutlinedIcon />
                )
              }
            >
              {mockInstallation
                ? `Install ${moduleName} (mock)`
                : `${activationOnly ? 'Activate' : 'Install'} ${moduleName}`}
            </Button>
          </Paper>
        </Box>
      )}
    </Box>
  );
}
