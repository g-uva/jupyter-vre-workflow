import React from 'react';
import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  FormHelperText,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import {
  getRegistration,
  IExperimentMetadata,
  IRegistrationState,
  ISite,
  registerNode,
  selectExperimentMetadata
} from '../api/orchestration';

const MAP_STYLE =
  'https://api.maptiler.com/maps/openstreetmap/style.json?key=EbBHdB4yorH5ew69HEPJ';

interface IOrchestratorPanelProps {
  username: string;
  selectedWorkflow: string | null;
  selectedExperiment: string | null;
  experimentPath: string | null;
}

function SiteMarker({
  site,
  selected,
  onClick
}: {
  site: ISite;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Box
      title={`${site.name} — stable demo site`}
      onClick={onClick}
      sx={{
        width: selected ? 36 : 29,
        height: selected ? 36 : 29,
        borderRadius: '50%',
        border: '3px solid #1d4ed8',
        background: selected ? '#1d4ed8' : '#fff',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,.25)'
      }}
    >
      {site.flag}
    </Box>
  );
}

export default function OrchestratorPanel({
  username,
  selectedWorkflow,
  selectedExperiment,
  experimentPath
}: IOrchestratorPanelProps) {
  const user = username || 'local-user';
  const [state, setState] = React.useState<IRegistrationState | null>(null);
  const [selectedSiteId, setSelectedSiteId] = React.useState('GRNET');
  const [loading, setLoading] = React.useState(true);
  const [registering, setRegistering] = React.useState(false);
  const [registrationStep, setRegistrationStep] = React.useState(0);
  const [error, setError] = React.useState('');
  const [metadata, setMetadata] = React.useState<IExperimentMetadata | null>(
    null
  );
  const [metadataLoading, setMetadataLoading] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [metadataError, setMetadataError] = React.useState('');
  const [form, setForm] = React.useState({
    node_name: '',
    site: 'Athens, Greece',
    operator: user,
    contact: user.includes('@') ? user : `${user}@demo.invalid`
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getRegistration(user);
      setState(result);
      setSelectedSiteId(result.selected_site_id);
      setForm(value => ({ ...value, node_name: result.default_node_name }));
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : String(loadError)
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const loadMetadata = React.useCallback(async () => {
    setMetadata(null);
    setMetadataError('');
    if (!state?.registered || !experimentPath) {
      return;
    }
    setMetadataLoading(true);
    try {
      setMetadata(await selectExperimentMetadata(user, experimentPath));
    } catch (metadataLoadError) {
      setMetadataError(
        metadataLoadError instanceof Error
          ? metadataLoadError.message
          : String(metadataLoadError)
      );
    } finally {
      setMetadataLoading(false);
    }
  }, [experimentPath, state?.registered, user]);

  React.useEffect(() => {
    void loadMetadata();
  }, [loadMetadata]);

  async function handleSync() {
    if (!experimentPath) {
      return;
    }
    setSyncing(true);
    setMetadataError('');
    try {
      setMetadata(await selectExperimentMetadata(user, experimentPath, 'sync'));
    } catch (syncError) {
      setMetadataError(
        syncError instanceof Error ? syncError.message : String(syncError)
      );
    } finally {
      setSyncing(false);
    }
  }

  async function handleRegister() {
    setRegistering(true);
    setRegistrationStep(0);
    setError('');
    try {
      const request = registerNode(user, form);
      for (let step = 1; step <= 3; step++) {
        await new Promise(resolve => window.setTimeout(resolve, 300));
        setRegistrationStep(step);
      }
      const result = await request;
      setState(result);
      setSelectedSiteId('GRNET');
    } catch (registrationError) {
      setError(
        registrationError instanceof Error
          ? registrationError.message
          : String(registrationError)
      );
    } finally {
      setRegistering(false);
    }
  }

  const sites = state?.sites ?? [];
  const selectedSite =
    sites.find(site => site.id === selectedSiteId) ?? sites[0];

  return (
    <Stack gap={2}>
      <Alert severity="info" icon={false}>
        <strong>Autumn School simulation:</strong> federation membership, site
        availability, prediction and execution are demo data. No live EGI, T6.2
        or T6.3 service is contacted.
      </Alert>

      <Box sx={{ display: 'flex', gap: 2, minHeight: 430 }}>
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            border: '1px solid #e2e8f0',
            borderRadius: 2,
            overflow: 'hidden'
          }}
        >
          <Map
            key={state?.registered ? 'federation' : 'greece'}
            initialViewState={
              state?.registered
                ? { longitude: 15, latitude: 47, zoom: 3.7 }
                : { longitude: 23.726, latitude: 37.986, zoom: 6.2 }
            }
            style={{ width: '100%', height: 430 }}
            mapStyle={MAP_STYLE}
            maplibreLogo={false}
            attributionControl={false}
          >
            {sites.map(site => (
              <Marker
                key={site.id}
                latitude={site.lat}
                longitude={site.lon}
                anchor="center"
              >
                <SiteMarker
                  site={site}
                  selected={site.id === selectedSiteId}
                  onClick={() => setSelectedSiteId(site.id)}
                />
              </Marker>
            ))}
          </Map>
        </Box>

        <Paper variant="outlined" sx={{ width: 330, p: 2, flexShrink: 0 }}>
          {loading ? (
            <Stack gap={1}>
              <LinearProgress />
              <Typography variant="body2">
                Loading local registration…
              </Typography>
            </Stack>
          ) : state?.registered ? (
            <Stack gap={1.5}>
              <Stack direction="row" gap={1} alignItems="center">
                <HubOutlinedIcon color="success" />
                <Typography variant="subtitle1" fontWeight={700}>
                  Demo federation joined
                </Typography>
              </Stack>
              <Chip
                label="GD-AS-DEMO · simulated membership"
                color="success"
                variant="outlined"
              />
              <Typography variant="body2">
                <strong>Node:</strong> {state.registration?.node_name}
              </Typography>
              <Typography variant="body2">
                <strong>Membership:</strong> {state.registration?.membership_id}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Persisted for {state.user_key} under the local m3l2 folder.
              </Typography>
              <FormControl size="small" fullWidth>
                <InputLabel>Available demo site</InputLabel>
                <Select
                  label="Available demo site"
                  value={selectedSiteId}
                  onChange={event => setSelectedSiteId(event.target.value)}
                >
                  {sites.map(site => (
                    <MenuItem key={site.id} value={site.id}>
                      {site.flag} {site.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {selectedSite && (
                <Alert severity="info" icon={<LocationOnOutlinedIcon />}>
                  {selectedSite.name}, {selectedSite.country}
                  <br />
                  PUE {selectedSite.pue}; demo carbon intensity{' '}
                  {selectedSite.carbon_intensity_g_kwh} gCO₂/kWh.
                </Alert>
              )}
            </Stack>
          ) : (
            <Stack gap={1.5}>
              <Typography variant="subtitle1" fontWeight={700}>
                Register this node
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Registration enters the node into mock VO GD-AS-DEMO. Other
                sites and orchestration controls remain hidden until it
                succeeds.
              </Typography>
              <TextField
                size="small"
                label="Node name"
                value={form.node_name}
                onChange={event =>
                  setForm(value => ({
                    ...value,
                    node_name: event.target.value
                  }))
                }
              />
              <TextField
                size="small"
                label="Site / location"
                value={form.site}
                onChange={event =>
                  setForm(value => ({ ...value, site: event.target.value }))
                }
              />
              <TextField
                size="small"
                label="Operator"
                value={form.operator}
                onChange={event =>
                  setForm(value => ({ ...value, operator: event.target.value }))
                }
              />
              <TextField
                size="small"
                label="Contact"
                value={form.contact}
                onChange={event =>
                  setForm(value => ({ ...value, contact: event.target.value }))
                }
              />
              <Button
                onClick={handleRegister}
                disabled={registering || !form.node_name}
                startIcon={
                  registering ? <AutorenewIcon /> : <HubOutlinedIcon />
                }
              >
                {registering ? 'Registering…' : 'Register this node'}
              </Button>
              {registering && (
                <Box>
                  <LinearProgress
                    variant="determinate"
                    value={(registrationStep / 3) * 100}
                  />
                  <FormHelperText>
                    {
                      [
                        'Contacting mock endpoint…',
                        'Validating demo node…',
                        'Assigning GD-AS-DEMO membership…',
                        'Confirming registration…'
                      ][registrationStep]
                    }
                  </FormHelperText>
                </Box>
              )}
            </Stack>
          )}
          {error && (
            <Alert
              severity="error"
              sx={{ mt: 2 }}
              action={
                <Button onClick={state?.registered ? load : handleRegister}>
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          )}
        </Paper>
      </Box>

      {state?.registered && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            2. Select and synchronise experiment metadata
          </Typography>
          {!experimentPath ? (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              Select an existing experiment in the page controls before site
              estimates or orchestration can be enabled.
            </Alert>
          ) : metadataLoading ? (
            <LinearProgress sx={{ mt: 1.5 }} />
          ) : metadata ? (
            <Stack gap={1.25} mt={1.5}>
              <Stack direction="row" gap={1} flexWrap="wrap">
                <Chip
                  label={`${selectedWorkflow} / ${selectedExperiment}`}
                  color="primary"
                />
                <Chip label={`Run: ${metadata.experiment.status}`} />
                <Chip
                  label={metadata.metadata_status}
                  color={metadata.sync ? 'success' : 'warning'}
                />
              </Stack>
              <Typography variant="body2">
                Runtime:{' '}
                {metadata.experiment.runtime_s?.toFixed(3) ?? 'missing'} s ·
                source: {metadata.source}
              </Typography>
              <Typography variant="body2">
                Metrics: {metadata.metrics_available.join(', ') || 'none'} ·
                RO-Crate:{' '}
                {metadata.ro_crate_available
                  ? 'available'
                  : 'not generated (optional)'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {metadata.online_definition}
              </Typography>
              {!metadata.minimum_ready && (
                <Alert severity="error">
                  Cannot estimate yet. Missing: {metadata.missing.join('; ')}.
                </Alert>
              )}
              <Button
                onClick={handleSync}
                disabled={
                  syncing || !metadata.minimum_ready || Boolean(metadata.sync)
                }
                startIcon={syncing ? <AutorenewIcon /> : <HubOutlinedIcon />}
                sx={{ alignSelf: 'flex-start' }}
              >
                {syncing
                  ? 'Synchronising with mock catalogue…'
                  : metadata.sync
                    ? 'Present in mock GD-AS-DEMO catalogue'
                    : 'Synchronise metadata'}
              </Button>
              {metadata.sync && (
                <Alert severity="success">
                  Mock catalogue ID: {metadata.sync.catalogue_id}. This is not
                  FDMI publication.
                </Alert>
              )}
            </Stack>
          ) : null}
          {metadataError && (
            <Alert
              severity="error"
              sx={{ mt: 1.5 }}
              action={<Button onClick={loadMetadata}>Retry</Button>}
            >
              Synchronisation failed; the local record is preserved.{' '}
              {metadataError}
            </Alert>
          )}
        </Paper>
      )}
    </Stack>
  );
}
