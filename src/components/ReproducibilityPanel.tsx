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
  TextField,
  Typography
} from '@mui/material';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import {
  artifactUrl,
  connectCim,
  configureReproducibility,
  generateRoCrate,
  getReproducibilityState,
  ICimConnection,
  ICimStandard,
  IReproducibilityState,
  publishToFdmi
} from '../api/reproducibility';

interface IReproducibilityPanelProps {
  selectedWorkflow: string | null;
  selectedExperiment: string | null;
  experimentPath: string | null;
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
  selectedExperiment,
  experimentPath
}: IReproducibilityPanelProps) {
  const [connection, setConnection] = React.useState<ICimConnection | null>(
    null
  );
  const [connecting, setConnecting] = React.useState(false);
  const [connectionStep, setConnectionStep] = React.useState(-1);
  const [connectionError, setConnectionError] = React.useState('');
  const [selectedStandardKey, setSelectedStandardKey] = React.useState('');
  const [state, setState] = React.useState<IReproducibilityState | null>(null);
  const [draftMapping, setDraftMapping] = React.useState({
    experiment_term: 'schema:Dataset',
    metric_term: 'sosa:Observation'
  });
  const [savingMapping, setSavingMapping] = React.useState(false);
  const [configurationError, setConfigurationError] = React.useState('');
  const [generating, setGenerating] = React.useState(false);
  const [generationError, setGenerationError] = React.useState('');
  const [publishing, setPublishing] = React.useState(false);
  const [publicationError, setPublicationError] = React.useState('');

  const standard: ICimStandard | undefined = connection?.standards.find(
    item => item.key === selectedStandardKey
  );
  const contextLabel =
    selectedWorkflow && selectedExperiment
      ? `${selectedWorkflow} / ${selectedExperiment}`
      : 'No experiment selected';

  React.useEffect(() => {
    let active = true;
    setState(null);
    setConfigurationError('');
    if (!experimentPath) {
      return () => {
        active = false;
      };
    }
    getReproducibilityState(experimentPath)
      .then(result => {
        if (active) {
          setState(result);
          setDraftMapping(result.mapping);
          if (result.standard_key) {
            setSelectedStandardKey(result.standard_key);
          }
        }
      })
      .catch(error => {
        if (active) {
          setConfigurationError(
            error instanceof Error ? error.message : String(error)
          );
        }
      });
    return () => {
      active = false;
    };
  }, [experimentPath]);

  async function saveConfiguration(
    standardKey: string,
    mapping: Partial<IReproducibilityState['mapping']> = {}
  ) {
    if (!experimentPath) {
      return;
    }
    setSavingMapping(true);
    setConfigurationError('');
    try {
      const result = await configureReproducibility(
        experimentPath,
        standardKey,
        mapping
      );
      setState(result);
      setDraftMapping(result.mapping);
    } catch (error) {
      setConfigurationError(
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setSavingMapping(false);
    }
  }

  async function handleStandardChange(key: string) {
    setSelectedStandardKey(key);
    await saveConfiguration(key);
  }

  async function handleConnect() {
    setConnecting(true);
    setConnection(null);
    setConnectionError('');
    setConnectionStep(0);
    try {
      const request = connectCim(experimentPath);
      for (let step = 0; step < CONNECTION_STEPS.length - 1; step++) {
        await new Promise(resolve => window.setTimeout(resolve, 250));
        setConnectionStep(step + 1);
      }
      const result = await request;
      setConnection(result);
      const selected = state?.standard_key ?? result.default_standard;
      setSelectedStandardKey(selected);
      if (experimentPath && !state?.configured) {
        await saveConfiguration(selected);
      }
    } catch (error) {
      setConnectionError(
        error instanceof Error ? error.message : 'Could not connect to mock CIM'
      );
    } finally {
      setConnecting(false);
    }
  }

  async function handleGenerate() {
    if (!experimentPath) {
      return;
    }
    setGenerating(true);
    setGenerationError('');
    try {
      const result = await generateRoCrate(experimentPath);
      setState(result);
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handlePublish() {
    if (!experimentPath) {
      return;
    }
    setPublishing(true);
    setPublicationError('');
    try {
      const result = await publishToFdmi(experimentPath);
      setState(result);
    } catch (error) {
      setPublicationError(
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setPublishing(false);
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
                    onChange={event => handleStandardChange(event.target.value)}
                    disabled={!experimentPath || savingMapping}
                  >
                    {connection.standards.map(item => (
                      <MenuItem key={item.key} value={item.key}>
                        {item.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {!experimentPath && (
                  <FormHelperText>
                    Select a tracked experiment to save the standard.
                  </FormHelperText>
                )}
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
        {state?.configured ? (
          <Stack gap={2}>
            <Alert severity="info" icon={false}>
              Configured for <strong>{state.standard?.label}</strong>. This is a
              demonstrative mapping preview, not a compliance validation.
            </Alert>
            <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5}>
              <TextField
                size="small"
                label="Experiment type"
                value={draftMapping.experiment_term}
                onChange={event =>
                  setDraftMapping(value => ({
                    ...value,
                    experiment_term: event.target.value
                  }))
                }
                helperText="Safe example field"
              />
              <TextField
                size="small"
                label="Metric observation type"
                value={draftMapping.metric_term}
                onChange={event =>
                  setDraftMapping(value => ({
                    ...value,
                    metric_term: event.target.value
                  }))
                }
                helperText="Safe example field"
              />
              <Button
                onClick={() =>
                  saveConfiguration(selectedStandardKey, draftMapping)
                }
                disabled={savingMapping}
              >
                {savingMapping ? 'Saving…' : 'Save mapping edits'}
              </Button>
            </Stack>
            <Paper variant="outlined" sx={{ p: 1.5, background: '#f8fafc' }}>
              <Typography variant="caption" fontWeight={700}>
                Run {state.preview.experiment_id} · {state.preview.run_status}
              </Typography>
              <Typography variant="body2">
                Experiment → {state.preview.run_type}
              </Typography>
              {state.preview.metrics.length ? (
                state.preview.metrics.map(metric => (
                  <Typography key={metric.source} variant="body2">
                    {metric.source} ({metric.unit}) → {metric.mapped_type}
                  </Typography>
                ))
              ) : (
                <Typography variant="body2" color="warning.main">
                  No metric rows are available for this run.
                </Typography>
              )}
            </Paper>
            <TextField
              disabled
              fullWidth
              size="small"
              label="Advanced mapping editor (planned)"
              value="Broader vocabulary and configuration controls require the later mapping backend."
            />
          </Stack>
        ) : (
          <Stack direction="row" gap={1} alignItems="center">
            <DescriptionOutlinedIcon color="disabled" />
            <Typography variant="body2" color="text.secondary">
              Unavailable until an experiment is selected, CIM is connected, and
              a standard is configured.
            </Typography>
          </Stack>
        )}
        {configurationError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {configurationError}
          </Alert>
        )}
      </WorkflowCard>

      <WorkflowCard title="3. Generate RO-Crate metadata">
        <Button
          onClick={handleGenerate}
          disabled={generating || !connection?.connected || !state?.configured}
          startIcon={
            generating ? <AutorenewIcon /> : <DescriptionOutlinedIcon />
          }
        >
          {generating
            ? 'Generating…'
            : state?.crate_current
              ? 'Regenerate RO-Crate metadata'
              : 'Generate RO-Crate metadata'}
        </Button>
        <FormHelperText>
          {!experimentPath
            ? 'Select a tracked experiment first.'
            : !connection?.connected
              ? 'Connect successfully to the mock CIM service first.'
              : !state?.configured
                ? 'Configure a standard first.'
                : 'Generation writes a real RO-Crate 1.1 JSON-LD metadata descriptor beside the run outputs.'}
        </FormHelperText>
        {generationError && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            Generation failed: {generationError}
          </Alert>
        )}
        {state?.crate && (
          <Alert
            severity={state.crate_current ? 'success' : 'warning'}
            sx={{ mt: 1.5 }}
          >
            <Typography variant="body2" fontWeight={700}>
              {state.crate_current
                ? 'RO-Crate metadata is up to date'
                : 'RO-Crate metadata is stale — regenerate before publishing'}
            </Typography>
            <Typography variant="caption" display="block">
              {state.crate.name} · {state.crate.path} · generated{' '}
              {new Date(state.crate.generated_at).toLocaleString()} · generation{' '}
              {state.crate.generation}
            </Typography>
            <Button
              size="small"
              component="a"
              href={artifactUrl(state.crate.path)}
              target="_blank"
              rel="noreferrer"
              sx={{ mt: 0.5 }}
            >
              Inspect or download artefact
            </Button>
          </Alert>
        )}
      </WorkflowCard>

      <WorkflowCard title="4. Publish experiment metadata">
        {state?.fdmi_target && (
          <Alert severity="info" icon={false} sx={{ mb: 1.5 }}>
            <Typography variant="body2" fontWeight={700}>
              Target: {state.fdmi_target.mode}
            </Typography>
            <Typography
              variant="caption"
              display="block"
              sx={{ fontFamily: 'monospace' }}
            >
              Configured: {state.fdmi_target.endpoint}
            </Typography>
            <Typography
              variant="caption"
              display="block"
              sx={{ fontFamily: 'monospace' }}
            >
              Kubernetes: {state.fdmi_target.kubernetes_service}
            </Typography>
            <Typography variant="caption">
              Demonstration target only; no external FDMI registry is contacted.
            </Typography>
          </Alert>
        )}
        <Button
          onClick={handlePublish}
          disabled={
            publishing ||
            !state?.crate_current ||
            Boolean(state.publication && !state.publication.stale)
          }
          startIcon={publishing ? <AutorenewIcon /> : <SendOutlinedIcon />}
        >
          {publishing
            ? 'Submitting artefact…'
            : state?.publication && !state.publication.stale
              ? 'Already submitted'
              : 'Publish to mock FDMI'}
        </Button>
        <FormHelperText>
          {!state?.crate_current
            ? 'Requires an up-to-date generated RO-Crate artefact.'
            : 'Submits the artefact and experiment identifier idempotently. No DOI is minted and nothing is sent to Zenodo.'}
        </FormHelperText>
        {publicationError && (
          <Alert
            severity="error"
            sx={{ mt: 1.5 }}
            action={<Button onClick={handlePublish}>Retry</Button>}
          >
            Mock FDMI submission failed: {publicationError}
          </Alert>
        )}
        {state?.publication && (
          <Alert
            severity={state.publication.stale ? 'warning' : 'success'}
            sx={{ mt: 1.5 }}
          >
            <Typography variant="body2" fontWeight={700}>
              {state.publication.stale
                ? 'Previous receipt is stale; publish the regenerated artefact.'
                : 'Mock FDMI submission accepted'}
            </Typography>
            <Typography
              variant="caption"
              display="block"
              sx={{ fontFamily: 'monospace' }}
            >
              Receipt: {state.publication.receipt}
            </Typography>
            <Typography variant="caption">
              {state.publication.endpoint} ·{' '}
              {new Date(state.publication.submitted_at).toLocaleString()} ·{' '}
              {state.standard?.label}
            </Typography>
          </Alert>
        )}
      </WorkflowCard>
    </Stack>
  );
}
