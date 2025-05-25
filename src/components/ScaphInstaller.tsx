// src/Installer.tsx
import React from 'react';
import {
  Box,
  Button,
  LinearProgress,
  Typography,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';

const STEPS = [
  'Update apt-get',
  'Install dependencies',
  'Install Rust',
  'Clone & build Scaphandre'
  // …must match the backend’s labels exactly
];

export default function ScaphInstaller() {
  const [running, setRunning] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [logs, setLogs] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!running) {
      return;
    }

    const es = new EventSource('/api/run-install');

    es.addEventListener('progress', (e: MessageEvent) => {
      const { step, progress: pct } = JSON.parse(e.data);
      setCurrentStep(step);
      setProgress(pct);
    });

    es.addEventListener('log', (e: MessageEvent) => {
      const { text } = JSON.parse(e.data);
      setLogs(l => [...l, text]);
    });

    es.addEventListener('done', () => {
      setRunning(false);
      es.close();
    });

    return () => es.close();
  }, [running]);

  return (
    <Box p={4}>
      <Button
        variant="contained"
        disabled={running}
        onClick={() => {
          setLogs([]);
          setProgress(0);
          setCurrentStep(0);
          setRunning(true);
        }}
      >
        Start Installation
      </Button>

      {running && (
        <Box mt={4}>
          <Stepper activeStep={currentStep}>
            {STEPS.map(label => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Box mt={2}>
            <LinearProgress variant="determinate" value={progress} />
            <Typography align="right">{progress}%</Typography>
          </Box>

          <Box
            mt={2}
            sx={{
              maxHeight: 200,
              overflowY: 'auto',
              backgroundColor: '#fafafa',
              p: 1
            }}
          >
            {logs.map((line, i) => (
              <Typography key={i} variant="caption" component="div">
                {line}
              </Typography>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
