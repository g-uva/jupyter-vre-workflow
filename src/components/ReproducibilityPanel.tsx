import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  connectFdmi,
  configureReproducibility,
  generateRoCrate,
  getReproducibilityState,
  ICloudConfiguration,
  ICrateConfiguration,
  ICimConnection,
  ICimMetadataProfile,
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
  'Discovering the internal CIM endpoint',
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
  const [selectedMetadataProfileKey, setSelectedMetadataProfileKey] =
    React.useState('default');
  const [state, setState] = React.useState<IReproducibilityState | null>(null);
  const [draftMapping, setDraftMapping] = React.useState({
    experiment_term: 'schema:Dataset',
    metric_term: 'sosa:Observation'
  });
  const [cloudConfiguration, setCloudConfiguration] =
    React.useState<ICloudConfiguration>({
      group: 'greendigit',
      site_name: '',
      cloud_type: '',
      cloud_compute_service: '',
      owner: ''
    });
  const [crateConfiguration, setCrateConfiguration] =
    React.useState<ICrateConfiguration>({
      title: '',
      description: '',
      creator: '',
      organization: '',
      license: '',
      publication_reference: '',
      environment_information: '',
      notebook_role: 'https://schema.org/SoftwareSourceCode',
      output_role: 'https://schema.org/SoftwareSourceCode'
    });
  const [savingMapping, setSavingMapping] = React.useState(false);
  const [configurationError, setConfigurationError] = React.useState('');
  const [generating, setGenerating] = React.useState(false);
  const [generationError, setGenerationError] = React.useState('');
  const [publishing, setPublishing] = React.useState(false);
  const [publicationError, setPublicationError] = React.useState('');
  const [reviewOpen, setReviewOpen] = React.useState(false);

  const standard: ICimStandard | undefined = connection?.standards.find(
    item => item.key === selectedStandardKey
  );
  const metadataProfile: ICimMetadataProfile | undefined =
    connection?.metadata_profiles.find(
      item => item.key === selectedMetadataProfileKey
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
          setCloudConfiguration(result.cloud_configuration);
          setCrateConfiguration(result.crate_configuration);
          if (result.standard_key) {
            setSelectedStandardKey(result.standard_key);
          }
          setSelectedMetadataProfileKey(result.metadata_profile_key);
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
    mapping: Partial<IReproducibilityState['mapping']> = {},
    metadataProfileKey = selectedMetadataProfileKey,
    cloud = cloudConfiguration,
    crate = crateConfiguration
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
        mapping,
        metadataProfileKey,
        cloud,
        crate
      );
      setState(result);
      setDraftMapping(result.mapping);
      setCloudConfiguration(result.cloud_configuration);
      setCrateConfiguration(result.crate_configuration);
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

  async function handleMetadataProfileChange(key: string) {
    setSelectedMetadataProfileKey(key);
    await saveConfiguration(selectedStandardKey, {}, key);
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
      const selectedProfile =
        state?.metadata_profile_key ?? result.default_metadata_profile;
      setSelectedStandardKey(selected);
      setSelectedMetadataProfileKey(selectedProfile);
      if (experimentPath && !state?.configured) {
        await saveConfiguration(
          selected,
          {},
          selectedProfile,
          cloudConfiguration,
          crateConfiguration
        );
      }
    } catch (error) {
      setConnectionError(
        error instanceof Error ? error.message : 'Could not connect to CIM'
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

  async function handleConnectFdmi() {
    if (!experimentPath) {
      return;
    }
    setPublicationError('');
    try {
      setState(await connectFdmi(experimentPath));
    } catch (error) {
      setPublicationError(
        error instanceof Error ? error.message : String(error)
      );
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
                  ? 'Reconnect to CIM'
                  : 'Connect to CIM'}
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
                <FormControl size="small" fullWidth>
                  <InputLabel>Metadata profile</InputLabel>
                  <Select
                    label="Metadata profile"
                    value={selectedMetadataProfileKey}
                    onChange={event =>
                      handleMetadataProfileChange(event.target.value)
                    }
                    disabled={!experimentPath || savingMapping}
                  >
                    {connection.metadata_profiles.map(item => (
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
                successful response from the demonstration service.
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
        {metadataProfile && (
          <Alert severity="info" sx={{ mt: 1.5 }} icon={false}>
            <Typography variant="subtitle2">{metadataProfile.label}</Typography>
            <Typography variant="body2">
              {metadataProfile.description}
            </Typography>
            <Typography variant="caption">
              Local CIM profile: {metadataProfile.ri_type} · version{' '}
              {metadataProfile.profile_version}
            </Typography>
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
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              gap={1.5}
              flexWrap="wrap"
            >
              {(
                [
                  ['group', 'Authorised group'],
                  ['site_name', 'Site name'],
                  ['cloud_type', 'Cloud type'],
                  ['cloud_compute_service', 'Cloud compute service'],
                  ['owner', 'VO / workload owner']
                ] as [keyof ICloudConfiguration, string][]
              ).map(([key, label]) => (
                <TextField
                  key={key}
                  size="small"
                  label={label}
                  value={cloudConfiguration[key]}
                  onChange={event =>
                    setCloudConfiguration(value => ({
                      ...value,
                      [key]: event.target.value
                    }))
                  }
                  sx={{ flex: '1 1 210px' }}
                />
              ))}
              <Button
                onClick={() =>
                  saveConfiguration(
                    selectedStandardKey,
                    draftMapping,
                    selectedMetadataProfileKey,
                    cloudConfiguration
                  )
                }
                disabled={savingMapping}
              >
                {savingMapping ? 'Saving…' : 'Apply Cloud configuration'}
              </Button>
            </Stack>
            <Paper variant="outlined" sx={{ p: 1.5, background: '#f8fafc' }}>
              <Typography variant="caption" fontWeight={700}>
                Run {state.preview.experiment_id} · {state.preview.run_status}
              </Typography>
              <Typography variant="body2">
                Experiment → {state.preview.run_type}
              </Typography>
              <Typography variant="body2">
                Metadata profile → {state.preview.metadata_profile}
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
            {connection?.cloud_profile && (
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Cloud field registry ·{' '}
                  {connection.cloud_profile.registry_version}
                </Typography>
                <Stack gap={1}>
                  {connection.cloud_profile.field_registry.map(field => (
                    <Box key={field.eimps_target}>
                      <Typography variant="body2" fontWeight={700}>
                        {field.eimps_target}
                        {field.required ? ' · required' : ' · optional'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {field.source} → {field.value_type}
                        {field.canonical_unit
                          ? ` (${field.canonical_unit})`
                          : ''}{' '}
                        · {field.transformation} ·{' '}
                        {field.standards_mapping.status}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        {field.definition} Boundary:{' '}
                        {field.measurement_boundary}. Provenance:{' '}
                        {field.provenance_requirements}.
                      </Typography>
                      <Typography
                        variant="caption"
                        color={
                          field.eimps_target
                            .split(', ')
                            .some(target =>
                              state.crate?.missing_required_fields?.includes(
                                target
                              )
                            )
                            ? 'warning.main'
                            : 'success.main'
                        }
                        display="block"
                      >
                        Availability:{' '}
                        {!state.crate
                          ? 'pending export validation'
                          : field.eimps_target
                                .split(', ')
                                .some(target =>
                                  state.crate?.missing_required_fields?.includes(
                                    target
                                  )
                                )
                            ? 'missing or unavailable'
                            : 'available'}{' '}
                        · validation:{' '}
                        {state.crate
                          ? state.crate.eimps_ready
                            ? 'EIMPS-ready'
                            : 'draft'
                          : 'not run'}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            )}
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
        <Typography variant="subtitle2" gutterBottom>
          Permitted descriptive metadata
        </Typography>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          gap={1.25}
          flexWrap="wrap"
          mb={2}
        >
          {(
            [
              ['title', 'Title'],
              ['description', 'Description'],
              ['creator', 'Creator'],
              ['organization', 'Organisation'],
              ['license', 'Licence URL'],
              ['publication_reference', 'Publication URL'],
              ['environment_information', 'Environment information']
            ] as [keyof ICrateConfiguration, string][]
          ).map(([key, label]) => (
            <TextField
              key={key}
              size="small"
              label={label}
              value={crateConfiguration[key]}
              multiline={key === 'description'}
              onChange={event =>
                setCrateConfiguration(value => ({
                  ...value,
                  [key]: event.target.value
                }))
              }
              helperText={
                state?.crate_configuration_preview.find(
                  item => item.field === key
                )?.jsonld_location
              }
              sx={{ flex: '1 1 250px' }}
            />
          ))}
          <Button
            onClick={() =>
              saveConfiguration(
                selectedStandardKey,
                draftMapping,
                selectedMetadataProfileKey,
                cloudConfiguration,
                crateConfiguration
              )
            }
            disabled={savingMapping}
          >
            Apply RO-Crate configuration
          </Button>
        </Stack>
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
              ? 'Connect successfully to the CIM service first.'
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
                ? state.crate.eimps_ready
                  ? 'EIMPS-ready RO-Crate metadata is up to date'
                  : 'Draft RO-Crate metadata is up to date'
                : 'RO-Crate metadata is stale — regenerate before publishing'}
            </Typography>
            {state.crate.missing_required_fields?.length ? (
              <Typography variant="body2" color="warning.dark">
                Missing: {state.crate.missing_required_fields.join(', ')}
              </Typography>
            ) : null}
            {state.crate.quality_flags?.length ? (
              <Typography variant="body2" color="warning.dark">
                Quality: {state.crate.quality_flags.join(', ')}
              </Typography>
            ) : null}
            <Typography variant="caption" display="block">
              {state.crate.name} · {state.crate.path} · generated{' '}
              {new Date(state.crate.generated_at).toLocaleString()} · generation{' '}
              {state.crate.generation}
            </Typography>
            <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
              {[
                [
                  'RO-Crate',
                  state.crate.artifacts?.ro_crate ?? state.crate.path
                ],
                ['EIMPS Cloud', state.crate.artifacts?.eimps_cloud],
                ['CIM record', state.crate.artifacts?.cim_record]
              ]
                .filter((entry): entry is [string, string] => Boolean(entry[1]))
                .map(([label, path]) => (
                  <Button
                    key={label}
                    size="small"
                    component="a"
                    href={artifactUrl(path)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download {label}
                  </Button>
                ))}
            </Stack>
          </Alert>
        )}
        {state?.export_comparison && (
          <Alert severity="info" sx={{ mt: 1.5 }} icon={false}>
            <Typography variant="subtitle2">Compare exports</Typography>
            <Typography variant="body2">
              Mapping revision changed:{' '}
              {state.export_comparison.mapping_changed ? 'yes' : 'no'} · run
              measurements changed:{' '}
              {state.export_comparison.measurements_changed ? 'yes' : 'no'}.
            </Typography>
            <Typography variant="caption">
              Immutable snapshot: {state.export_comparison.current_revision}
            </Typography>
          </Alert>
        )}
      </WorkflowCard>

      <WorkflowCard title="4. Connect and synchronise mock FDMI">
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
          onClick={handleConnectFdmi}
          disabled={
            !experimentPath || Boolean(state?.fdmi_connection?.connected)
          }
          startIcon={<CloudOutlinedIcon />}
          sx={{ mr: 1 }}
        >
          {state?.fdmi_connection?.connected
            ? 'Connected to mock FDMI'
            : 'Connect to mock FDMI'}
        </Button>
        <Button
          onClick={() => setReviewOpen(true)}
          disabled={
            publishing ||
            !state?.fdmi_connection?.connected ||
            !state?.crate_current ||
            Boolean(state.publication && !state.publication.stale)
          }
          startIcon={publishing ? <AutorenewIcon /> : <SendOutlinedIcon />}
        >
          {publishing
            ? 'Submitting artefact…'
            : state?.publication && !state.publication.stale
              ? 'Already submitted'
              : 'Review mock synchronisation'}
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
            Mock FDMI synchronisation failed: {publicationError}
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
                : 'Mock FDMI synchronisation accepted'}
            </Typography>
            <Typography
              variant="caption"
              display="block"
              sx={{ fontFamily: 'monospace' }}
            >
              Receipt: {state.publication.receipt}
            </Typography>
            <Typography variant="caption">
              Version {state.publication.version} · {state.publication.endpoint}{' '}
              · {new Date(state.publication.submitted_at).toLocaleString()} ·{' '}
              {state.standard?.label}
            </Typography>
          </Alert>
        )}
        <Dialog
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          fullWidth
        >
          <DialogTitle>Review mock FDMI synchronisation</DialogTitle>
          <DialogContent dividers>
            <Stack gap={1}>
              <Typography variant="body2">
                Run: {state?.preview.experiment_id ?? 'unavailable'}
              </Typography>
              <Typography variant="body2">
                Crate: {state?.crate?.name ?? 'unavailable'} · generation{' '}
                {state?.crate?.generation ?? '—'}
              </Typography>
              <Typography variant="body2">
                Profile: {state?.metadata_profile?.label ?? 'unavailable'}
              </Typography>
              <Alert severity="info">
                This writes to the persistent local workshop catalogue only. It
                is not a production EIMPS submission.
              </Alert>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReviewOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                setReviewOpen(false);
                await handlePublish();
              }}
            >
              Synchronise mock metadata
            </Button>
          </DialogActions>
        </Dialog>
      </WorkflowCard>
    </Stack>
  );
}
