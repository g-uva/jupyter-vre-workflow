import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Typography
} from '@mui/material';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import {
  connectCim,
  ICimConnection,
  ICimStandard
} from '../api/reproducibility';

interface IReproducibilityPanelProps {
  selectedWorkflow: string | null;
  selectedExperiment: string | null;
}

const CONNECTION_STEPS = [
  'Discovering the internal mock CIM endpoint',
  'Simulating EGI Check-in authentication',
  'Retrieving available standards',
  'Selecting the demonstration standard'
];

function WorkflowCard({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Paper
      elevation={0}
      sx={{ border: '1px solid #e2e8f0', borderRadius: '10px', p: 2.5 }}
    >
      <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

export default function ReproducibilityPanel({
  selectedWorkflow,
  selectedExperiment
}: IReproducibilityPanelProps) {
  const [connection, setConnection] = React.useState<ICimConnection | null>(
    null
  );
  const [connecting, setConnecting] = React.useState(false);
  const [connectionStep, setConnectionStep] = React.useState(-1);
  const [connectionError, setConnectionError] = React.useState('');
  const [selectedStandardKey, setSelectedStandardKey] = React.useState('');

  const standard: ICimStandard | undefined = connection?.standards.find(
    item => item.key === selectedStandardKey
  );
  const contextLabel =
    selectedWorkflow && selectedExperiment
      ? `${selectedWorkflow} / ${selectedExperiment}`
      : 'No experiment selected';

  async function handleConnect() {
    setConnecting(true);
    setConnection(null);
    setConnectionError('');
    setConnectionStep(0);
    try {
      const request = connectCim();
      for (let step = 0; step < CONNECTION_STEPS.length - 1; step++) {
        await new Promise(resolve => window.setTimeout(resolve, 250));
        setConnectionStep(step + 1);
      }
      const result = await request;
      setConnection(result);
      setSelectedStandardKey(result.default_standard);
    } catch (error) {
      setConnectionError(
        error instanceof Error ? error.message : 'Could not connect to mock CIM'
      );
    } finally {
      setConnecting(false);
    }
  }

  return (
    <Stack gap={2.5}>
      <Stack direction="row" gap={1} flexWrap="wrap">
        <Chip label={contextLabel} size="small" variant="outlined" />
        <Chip label="Autumn School demo" size="small" color="info" />
      </Stack>

      <WorkflowCard title="1. Configure CIM (EIMPS)">
        <RadioGroup row value="online">
          <FormControlLabel value="online" control={<Radio />} label="Online" />
          <FormControlLabel
            value="offline"
            disabled
            control={<Radio />}
            label="Offline (unavailable)"
          />
        </RadioGroup>
        <FormHelperText sx={{ mb: 2 }}>
          Online connects through the Jupyter server to the internal demo
          service. Offline configuration is planned for a later backend and is
          unavailable in this prototype.
        </FormHelperText>

        <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
          <Box sx={{ flex: 1 }}>
            <Button
              onClick={handleConnect}
              disabled={connecting}
              startIcon={
                connecting ? <AutorenewIcon /> : <AccountTreeOutlinedIcon />
              }
            >
              {connecting
                ? 'Connecting…'
                : connection
                  ? 'Reconnect to mock CIM'
                  : 'Connect to mock CIM'}
            </Button>
            {(connecting || connection) && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={
                    connection
                      ? 100
                      : ((connectionStep + 0.5) / CONNECTION_STEPS.length) * 100
                  }
                />
                <Stack gap={0.75} mt={1.5}>
                  {CONNECTION_STEPS.map((label, index) => {
                    const done = Boolean(connection) || index < connectionStep;
                    const active = connecting && index === connectionStep;
                    return (
                      <Stack key={label} direction="row" gap={1}>
                        <CheckCircleOutlinedIcon
                          sx={{
                            fontSize: 17,
                            color: done
                              ? 'success.main'
                              : active
                                ? 'primary.main'
                                : 'text.disabled'
                          }}
                        />
                        <Typography
                          variant="caption"
                          color={active ? 'primary.main' : 'text.secondary'}
                        >
                          {label}
                        </Typography>
                      </Stack>
                    );
                  })}
                </Stack>
              </Box>
            )}
            {connectionError && (
              <Alert
                severity="error"
                sx={{ mt: 2 }}
                action={<Button onClick={handleConnect}>Retry</Button>}
              >
                Connection failed: {connectionError}
              </Alert>
            )}
          </Box>

          <Paper
            variant="outlined"
            sx={{ p: 2, flex: 1, background: '#f8fafc' }}
          >
            {connection ? (
              <Stack gap={1}>
                <Stack direction="row" gap={1} alignItems="center">
                  <CloudOutlinedIcon color="success" fontSize="small" />
                  <Typography variant="body2" fontWeight={700}>
                    Connected to demo data
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                  {connection.endpoint}
                </Typography>
                <Alert severity="info" icon={false}>
                  <strong>{connection.identity}</strong> — simulated EGI
                  Check-in sign-in. No real EGI account was contacted or
                  verified.
                </Alert>
                <FormControl size="small" fullWidth>
                  <InputLabel>Standard</InputLabel>
                  <Select
                    label="Standard"
                    value={selectedStandardKey}
                    onChange={event =>
                      setSelectedStandardKey(event.target.value)
                    }
                  >
                    {connection.standards.map(item => (
                      <MenuItem key={item.key} value={item.key}>
                        {item.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Not connected. The standards list becomes usable only after a
                successful response from the mock service.
              </Typography>
            )}
          </Paper>
        </Stack>

        {standard && (
          <Alert severity="warning" sx={{ mt: 2 }} icon={false}>
            <Typography variant="subtitle2">{standard.label}</Typography>
            <Typography variant="body2">
              {standard.description} Profile: {standard.profile}. Version:{' '}
              {standard.version}.
            </Typography>
            <Typography variant="caption">{standard.compliance}</Typography>
          </Alert>
        )}
      </WorkflowCard>

      <WorkflowCard title="2. Preview standards and metrics mapping">
        <Stack direction="row" gap={1} alignItems="center">
          <DescriptionOutlinedIcon color="disabled" />
          <Typography variant="body2" color="text.secondary">
            Unavailable until an experiment and standard are configured. Safe
            mapping edits will be enabled by the experiment metadata backend.
          </Typography>
        </Stack>
      </WorkflowCard>

      <WorkflowCard title="3. Generate RO-Crate metadata">
        <Button disabled startIcon={<DescriptionOutlinedIcon />}>
          Generate RO-Crate metadata
        </Button>
        <FormHelperText>
          Requires a successful CIM connection and configured standard.
        </FormHelperText>
      </WorkflowCard>

      <WorkflowCard title="4. Publish experiment metadata">
        <Button disabled startIcon={<SendOutlinedIcon />}>
          Publish to mock FDMI
        </Button>
        <FormHelperText>
          Requires an up-to-date generated RO-Crate artefact. No DOI is minted
          and nothing is sent to Zenodo.
        </FormHelperText>
      </WorkflowCard>
    </Stack>
  );
}
