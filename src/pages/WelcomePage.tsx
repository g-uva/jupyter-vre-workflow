import React from 'react';
import {
  Box,
  Button,
  Chip,
  FormControl,
  Grid2,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  SxProps,
  Tab,
  Tabs,
  Tooltip,
  Typography
} from '@mui/material';
import { keyframes } from '@mui/material/styles';
import GeneralDashboard from './GeneralDashboard';
import getScaphData from '../api/getScaphData';
import { RawMetrics } from '../helpers/types';
import FetchMetricsComponent from '../components/FetchMetricsComponents';
import ExperimentRunPanel from '../components/ExperimentRunPanel';
import { KPIComponent } from '../components/KPIComponent';
import {
  IExperiment,
  getExperiment,
  startNotebookExperiment,
  cancelExperiment,
  deleteExperiment
} from '../api/experiments';
import ModuleInstallGate from '../components/ModuleInstallGate';
import { NotebookPanel } from '@jupyterlab/notebook';
import { ServerConnection } from '@jupyterlab/services';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SensorsRoundedIcon from '@mui/icons-material/SensorsRounded';
import {
  DEFAULT_MODULE_STATUS,
  InstalledModules,
  ITelemetryStatus,
  WorkflowModuleKey,
  activateModule,
  getModuleStatus,
  getTelemetryStatus
} from '../api/moduleStatus';
import {
  experimentPath,
  handleLoadExperimentList,
  handleLoadWorkflowList
} from '../api/handleNotebookContents';
import { IInstallerProgress, runMetricsInstaller } from '../api/installer';
import ReproducibilityPanel from '../components/ReproducibilityPanel';
import OrchestratorPanel from '../components/OrchestratorPanel';

export const styles: Record<string, SxProps> = {
  main: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    minHeight: 0,
    gap: 2,
    p: 2,
    background: '#f6f8fb',
    boxSizing: 'border-box',
    overflow: 'hidden'
  },
  title: {
    fontWeight: 700,
    color: '#1f2937',
    letterSpacing: 0
  },
  topRibbon: {
    display: 'flex',
    width: '100%',
    gap: 3
  },
  buttonGrid: {
    display: 'flex',
    width: '100%',
    gap: 1,
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
    '& .MuiButtonBase-root': {
      textTransform: 'none'
    },
    mb: 2
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: { xs: 'flex-start', md: 'center' },
    gap: 2,
    flexDirection: { xs: 'column', md: 'row' },
    flexShrink: 0
  },
  controlBar: {
    width: '100%',
    flexShrink: 0,
    p: 1.5,
    border: '1px solid #d7dde6',
    borderRadius: '8px',
    background: '#fff',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
    boxSizing: 'border-box',
    overflow: 'hidden'
  },
  controlBarStack: {
    width: '100%',
    minWidth: 0,
    flexWrap: 'wrap'
  },
  contextActions: {
    flexShrink: 0,
    minWidth: 'fit-content'
  },
  contextChip: {
    maxWidth: { xs: '100%', md: 320 },
    minWidth: 0,
    '& .MuiChip-label': {
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  },
  contextSelect: {
    flex: '1 1 180px',
    minWidth: { xs: '100%', sm: 180 },
    maxWidth: { xs: '100%', md: 280 }
  },
  moduleShell: {
    width: '100%',
    flex: '1 1 0',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #d7dde6',
    borderRadius: '8px',
    background: '#fff',
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)'
  },
  moduleTabs: {
    flexShrink: 0,
    px: 2,
    borderBottom: '1px solid #e5eaf0',
    '& .MuiTab-root': {
      minHeight: 56,
      textTransform: 'none',
      fontWeight: 600
    }
  },
  modulePanel: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden'
  },
  moduleHeader: {
    flexShrink: 0,
    display: 'flex',
    alignItems: { xs: 'flex-start', md: 'center' },
    justifyContent: 'space-between',
    gap: 2,
    flexDirection: { xs: 'column', md: 'row' },
    px: 3,
    py: 2,
    borderBottom: '1px solid #e5eaf0',
    background: '#fbfcfe'
  },
  moduleBody: {
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
    scrollbarGutter: 'stable',
    p: 2
  },
  emptyState: {
    border: '1px dashed #cbd5e1',
    borderRadius: '8px',
    p: 3,
    background: '#f8fafc'
  }
};

interface IWelcomePage {
  username: string;
  panel: NotebookPanel | null;
}

enum WorkflowModule {
  Telemetry = 0,
  Reproducibility = 1,
  Orchestration = 2
}

export const DEFAULT_EXPERIMENT_POLL_INTERVAL_SECONDS = 5;
const LIVE_METRICS_WINDOW_SECONDS = 300;

const livePulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(46, 125, 50, 0.55); }
  70% { box-shadow: 0 0 0 6px rgba(46, 125, 50, 0); }
  100% { box-shadow: 0 0 0 0 rgba(46, 125, 50, 0); }
`;

const MODULE_DETAILS: Record<
  WorkflowModule,
  { key: WorkflowModuleKey; label: string; prerequisiteText: string }
> = {
  [WorkflowModule.Telemetry]: {
    key: 'telemetry',
    label: 'Telemetry',
    prerequisiteText:
      'Requires Scaphandre and Prometheus. RAPL availability is checked for each notebook experiment.'
  },
  [WorkflowModule.Reproducibility]: {
    key: 'reproducibility',
    label: 'Reproducibility',
    prerequisiteText:
      'Uses internal CIM and FDMI demo services; select a tracked experiment to begin.'
  },
  [WorkflowModule.Orchestration]: {
    key: 'orchestration',
    label: 'Orchestration',
    prerequisiteText:
      'Requires an active connection to a Virtual Organisation (VO).'
  }
};

function shortExperimentId(experimentId: string): string {
  const compactIso = experimentId.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2})(\d{2})(\d{2})/
  );
  if (compactIso) {
    return `${compactIso[1]}T${compactIso[2]}:${compactIso[3]}:${compactIso[4]}`;
  }

  return (
    experimentId.match(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/)?.[0] ??
    experimentId
  );
}

export default function WelcomePage({ username, panel }: IWelcomePage) {
  const notebookName =
    panel && !panel.isDisposed && panel.content.model
      ? panel.context.path.split('/').pop() || panel.title.label || null
      : null;
  const [metrics, setMetrics] = React.useState<string[]>([]);
  const [dataMap, setDataMap] = React.useState<RawMetrics>(new Map());
  const [loading, setLoading] = React.useState<boolean>(false);

  const [automaticRefresh, setAutomaticRefresh] =
    React.useState<boolean>(false);
  const [liveMetricsEnabled, setLiveMetricsEnabled] =
    React.useState<boolean>(true);
  const [refreshIntervalS, setRefreshIntervalS] = React.useState<number>(
    DEFAULT_EXPERIMENT_POLL_INTERVAL_SECONDS
  );
  const [installingMetrics, setInstallingMetrics] =
    React.useState<boolean>(false);
  const [installProgress, setInstallProgress] = React.useState<number>(0);
  const [installLabel, setInstallLabel] = React.useState<string>('');
  const [installError, setInstallError] = React.useState<string>('');
  const [installLogs, setInstallLogs] = React.useState<string[]>([]);
  const [telemetryStatus, setTelemetryStatus] =
    React.useState<ITelemetryStatus | null>(null);
  const [checkingTelemetry, setCheckingTelemetry] = React.useState(true);
  const [telemetryStatusError, setTelemetryStatusError] = React.useState('');
  const [moduleStatus, setModuleStatus] = React.useState<InstalledModules>(
    DEFAULT_MODULE_STATUS
  );

  const [activeModule, setActiveModule] = React.useState<WorkflowModule>(
    WorkflowModule.Telemetry
  );

  const [workflowList, setWorkflowList] = React.useState<string[]>([]);
  const [experimentList, setExperimentList] = React.useState<string[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = React.useState<string | null>(
    null
  );
  const [selectedExperiment, setSelectedExperiment] = React.useState<
    string | null
  >(null);

  const [run, setRun] = React.useState<IExperiment | null>(null);
  const [runError, setRunError] = React.useState('');
  const [startingRun, setStartingRun] = React.useState(false);
  const requestVersion = React.useRef(0);
  const listRequestVersion = React.useRef(0);

  function showRun(value: IExperiment) {
    setRun(value);
  }

  async function fetchMetrics() {
    const version = ++requestVersion.current;
    const useLiveMetrics = liveMetricsEnabled && !selectedExperiment;
    if (
      !useLiveMetrics &&
      (!panel || !selectedWorkflow || !selectedExperiment)
    ) {
      setRun(null);
      setDataMap(new Map());
      setMetrics([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const baseUrl = ServerConnection.makeSettings().baseUrl.replace(
        /\/?$/,
        '/'
      );
      const prometheusUrl = new URL(
        `${baseUrl}proxy/9090`,
        window.location.origin
      ).toString();
      if (useLiveMetrics) {
        const endTime = Date.now() / 1000;
        const prometheusMetrics = await getScaphData({
          url: prometheusUrl.replace(/\/$/, ''),
          startTime: endTime - LIVE_METRICS_WINDOW_SECONDS,
          endTime
        });
        if (version !== requestVersion.current) {
          return;
        }
        setRun(null);
        setDataMap(prometheusMetrics);
        setMetrics(Array.from(prometheusMetrics.keys()));
        setRunError('');
        return;
      }

      const result = await getExperiment(
        experimentPath(panel!, selectedWorkflow!, selectedExperiment!)
      );
      if (version !== requestVersion.current) {
        return;
      }
      showRun(result);

      const prometheusMetrics = await getScaphData({
        url: prometheusUrl.replace(/\/$/, ''),
        startTime: Date.parse(result.start_time) / 1000,
        endTime: result.end_time
          ? Date.parse(result.end_time) / 1000
          : Date.now() / 1000
      });
      if (version !== requestVersion.current) {
        return;
      }
      setDataMap(prometheusMetrics);
      setMetrics(Array.from(prometheusMetrics.keys()));
      setRunError('');
    } catch (error) {
      if (version !== requestVersion.current) {
        return;
      }
      setRun(null);
      setDataMap(new Map());
      setMetrics([]);
      setRunError(error instanceof Error ? error.message : String(error));
    } finally {
      if (version === requestVersion.current) {
        setLoading(false);
      }
    }
  }

  async function handleStartRun() {
    if (!panel || !notebookName) {
      return;
    }
    setStartingRun(true);
    setRunError('');
    try {
      await startNotebookExperiment(panel);
    } catch (error) {
      setRunError(error instanceof Error ? error.message : String(error));
    } finally {
      setStartingRun(false);
    }
  }

  async function handleCancelRun() {
    if (!run) {
      return;
    }
    try {
      await cancelExperiment(run.path);
      await fetchMetrics();
    } catch (error) {
      setRunError(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleDeleteRun() {
    if (!run || run.status === 'running') {
      return;
    }
    if (!window.confirm('Delete this experiment and all of its artifacts?')) {
      return;
    }
    try {
      await deleteExperiment(run.path);
      ++requestVersion.current;
      ++listRequestVersion.current;
      setRun(null);
      setRunError('');
      setSelectedExperiment(null);
      await handleRefreshWorkflowList();
    } catch (error) {
      setRunError(error instanceof Error ? error.message : String(error));
    }
  }

  function handleSetMetrics() {
    fetchMetrics();
  }

  async function handleRefreshWorkflowList() {
    if (!panel) {
      setWorkflowList([]);
      setSelectedWorkflow(null);
      return;
    }
    const newWorkflowList = await handleLoadWorkflowList(panel);
    setWorkflowList(newWorkflowList);
    setSelectedWorkflow(currentWorkflow => {
      if (currentWorkflow && newWorkflowList.includes(currentWorkflow)) {
        return currentWorkflow;
      }
      return null;
    });
  }

  async function handleRefreshExperimentList() {
    const version = ++listRequestVersion.current;
    if (panel && selectedWorkflow) {
      const loadedExperimentList = await handleLoadExperimentList(
        selectedWorkflow,
        panel
      );
      if (version !== listRequestVersion.current) {
        return;
      }
      const newExperimentList = loadedExperimentList;
      setExperimentList(newExperimentList);
      setSelectedExperiment(currentExperiment => {
        if (
          currentExperiment &&
          newExperimentList.includes(currentExperiment)
        ) {
          return currentExperiment;
        }
        return null;
      });
    } else {
      setExperimentList([]);
      setSelectedExperiment(null);
    }
  }

  async function handleInstallMetrics() {
    setInstallingMetrics(true);
    setInstallProgress(0);
    setInstallLabel('Starting metrics agent installation');
    setInstallError('');
    setInstallLogs([]);

    try {
      await runMetricsInstaller({
        onProgress: (progress: IInstallerProgress) => {
          setInstallProgress(progress.progress);
          setInstallLabel(progress.label ?? 'Installing metrics agent');
        },
        onLog: log => {
          setInstallLogs(currentLogs => [...currentLogs, log.text]);
        }
      });
      const detectedStatus = await refreshTelemetryStatus();
      if (!detectedStatus?.installed) {
        throw new Error(
          'Installation finished, but Prometheus and Scaphandre could not both be detected.'
        );
      }
      setInstallProgress(100);
      setInstallLabel('Metrics agent installation complete');
    } catch (error) {
      console.error(error);
      setInstallLabel('Metrics agent installation failed');
      setInstallError(error instanceof Error ? error.message : String(error));
    } finally {
      setInstallingMetrics(false);
    }
  }

  async function refreshTelemetryStatus(): Promise<ITelemetryStatus | null> {
    setCheckingTelemetry(true);
    setTelemetryStatusError('');
    try {
      const status = await getTelemetryStatus();
      setTelemetryStatus(status);
      setInstallError('');
      setModuleStatus(current => ({
        ...current,
        telemetry: { installed: status.installed }
      }));
      return status;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setTelemetryStatus(null);
      setTelemetryStatusError(message);
      setModuleStatus(current => ({
        ...current,
        telemetry: { installed: false }
      }));
      return null;
    } finally {
      setCheckingTelemetry(false);
    }
  }

  async function handleInstallModule(moduleKey: WorkflowModuleKey) {
    if (moduleKey === 'telemetry') {
      await handleInstallMetrics();
      return;
    }

    setModuleStatus(
      await activateModule(moduleKey as 'reproducibility' | 'orchestration')
    );
  }

  // Just run it once the component mounts.
  React.useEffect(() => {
    handleRefreshWorkflowList();
  }, []);

  React.useEffect(() => {
    void getModuleStatus().then(setModuleStatus);
    void refreshTelemetryStatus();
  }, []);

  React.useEffect(() => {
    handleRefreshExperimentList();
  }, [workflowList, selectedWorkflow]);

  React.useEffect(() => {
    function started(event: Event) {
      const value = (event as CustomEvent<IExperiment>).detail;
      if (!panel || value.notebook_path !== panel.context.path) {
        return;
      }
      ++requestVersion.current;
      ++listRequestVersion.current;
      setWorkflowList(current =>
        Array.from(new Set([value.workflow_id, ...current]))
      );
      setExperimentList(current => Array.from(new Set([value.id, ...current])));
      setSelectedWorkflow(value.workflow_id);
      setSelectedExperiment(value.id);
      showRun(value);
      setAutomaticRefresh(true);
    }
    window.addEventListener('jupyter-vre-workflow:experiment-started', started);
    return () =>
      window.removeEventListener(
        'jupyter-vre-workflow:experiment-started',
        started
      );
  }, [panel]);

  React.useEffect(() => {
    setRun(null);
    setDataMap(new Map());
    setMetrics([]);
    let cancelled = false;
    let timer: number | undefined;
    async function refresh() {
      await fetchMetrics();
      const shouldRefresh = selectedExperiment
        ? automaticRefresh
        : liveMetricsEnabled;
      if (!cancelled && shouldRefresh) {
        timer = window.setTimeout(
          refresh,
          Math.max(1, refreshIntervalS) * 1000
        );
      }
    }
    void refresh();
    return () => {
      cancelled = true;
      ++requestVersion.current;
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [
    automaticRefresh,
    liveMetricsEnabled,
    refreshIntervalS,
    selectedWorkflow,
    selectedExperiment,
    panel
  ]);

  React.useEffect(() => {
    if (!run || run.status !== 'running') {
      return;
    }

    let cancelled = false;
    let timer: number | undefined;
    const path = run.path;

    async function refreshRunningExperiment() {
      try {
        const result = await getExperiment(path);
        if (cancelled) {
          return;
        }
        showRun(result);
        if (result.status === 'running') {
          timer = window.setTimeout(
            refreshRunningExperiment,
            DEFAULT_EXPERIMENT_POLL_INTERVAL_SECONDS * 1000
          );
        }
      } catch (error) {
        if (!cancelled) {
          setRunError(error instanceof Error ? error.message : String(error));
        }
      }
    }

    timer = window.setTimeout(
      refreshRunningExperiment,
      DEFAULT_EXPERIMENT_POLL_INTERVAL_SECONDS * 1000
    );
    return () => {
      cancelled = true;
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [run?.path, run?.status]);

  const selectedContextFullLabel =
    selectedWorkflow && selectedExperiment
      ? `${selectedWorkflow} / ${selectedExperiment}`
      : liveMetricsEnabled
        ? 'Live metrics'
        : 'No experiment selected';
  const selectedContextLabel =
    selectedWorkflow && selectedExperiment
      ? `${selectedWorkflow} / ${shortExperimentId(selectedExperiment)}`
      : selectedContextFullLabel;
  const showingLiveMetrics = liveMetricsEnabled && !selectedExperiment;
  const experimentStatus: IExperiment['status'] | 'starting' | undefined =
    startingRun ? 'starting' : run?.status;
  const experimentStatusColor = experimentStatus
    ? (
        {
          starting: 'info',
          running: 'info',
          succeeded: 'success',
          failed: 'error',
          cancelled: 'warning',
          interrupted: 'warning'
        } satisfies Record<
          IExperiment['status'] | 'starting',
          React.ComponentProps<typeof Chip>['color']
        >
      )[experimentStatus]
    : undefined;

  const telemetryStatusDetails = telemetryStatusError ? (
    <Typography variant="body2" color="warning.dark">
      {telemetryStatusError}
    </Typography>
  ) : (
    <Stack direction="row" gap={1} justifyContent="center" flexWrap="wrap">
      <Chip
        size="small"
        label={`Prometheus: ${checkingTelemetry ? 'checking' : telemetryStatus?.components.prometheus.installed ? 'installed' : 'missing'}`}
        color={
          telemetryStatus?.components.prometheus.installed
            ? 'success'
            : 'default'
        }
        variant="outlined"
      />
      <Chip
        size="small"
        label={`Scaphandre: ${checkingTelemetry ? 'checking' : telemetryStatus?.components.scaphandre.installed ? 'installed' : 'missing'}`}
        color={
          telemetryStatus?.components.scaphandre.installed
            ? 'success'
            : 'default'
        }
        variant="outlined"
      />
    </Stack>
  );

  return (
    <>
      <Grid2 sx={styles.main}>
        <Grid2 sx={styles.pageHeader}>
          <Box>
            <Typography variant="h4" sx={styles.title}>
              Jupyter VRE Workflow
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Telemetry, reproducibility, and orchestration for notebook-based
              VRE experiments.
            </Typography>
          </Box>
        </Grid2>

        <Paper elevation={0} sx={styles.controlBar}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            gap={1}
            alignItems={{ xs: 'stretch', md: 'center' }}
            sx={styles.controlBarStack}
          >
            <Stack
              direction="row"
              gap={0.75}
              alignItems="center"
              sx={styles.contextActions}
            >
              <IconButton
                onClick={handleRefreshWorkflowList}
                size="small"
                aria-label="Refresh workflows"
                sx={{ width: 32, height: 32 }}
              >
                <RefreshRoundedIcon fontSize="small" />
              </IconButton>
              <Typography variant="subtitle2" color="text.secondary">
                Selected context
              </Typography>
            </Stack>

            <Tooltip title={selectedContextFullLabel} arrow>
              <Chip
                label={selectedContextLabel}
                icon={
                  showingLiveMetrics ? (
                    <Box
                      component="span"
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: 'success.main',
                        animation: `${livePulse} 1.8s ease-out infinite`
                      }}
                    />
                  ) : undefined
                }
                size="small"
                color={
                  selectedWorkflow && selectedExperiment
                    ? 'primary'
                    : showingLiveMetrics
                      ? 'success'
                      : 'default'
                }
                variant={
                  (selectedWorkflow && selectedExperiment) || showingLiveMetrics
                    ? 'filled'
                    : 'outlined'
                }
                sx={styles.contextChip}
              />
            </Tooltip>

            <Button
              size="small"
              variant="outlined"
              startIcon={<SensorsRoundedIcon />}
              disabled={!liveMetricsEnabled || !selectedExperiment}
              onClick={() => {
                setSelectedWorkflow(null);
                setSelectedExperiment(null);
              }}
              sx={{ flexShrink: 0 }}
            >
              Use live metrics
            </Button>

            <FormControl size="small" sx={styles.contextSelect}>
              <InputLabel sx={{ background: '#fff' }}>Workflow ID</InputLabel>
              <Select
                key={selectedWorkflow || 'workflow-select'}
                value={selectedWorkflow || ''}
                label="Workflow ID"
                onChange={e => {
                  setSelectedExperiment(null);
                  e !== null && setSelectedWorkflow(e.target.value ?? '');
                }}
              >
                <MenuItem disabled value="">
                  <em>Select workflow</em>
                </MenuItem>
                {workflowList.map((workflowId: string, index: number) => {
                  return (
                    <MenuItem key={workflowId || index} value={workflowId}>
                      {workflowId}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            <FormControl size="small" sx={styles.contextSelect}>
              <InputLabel sx={{ background: '#fff' }}>Experiment ID</InputLabel>
              <Select
                key={selectedExperiment || 'experiment-select'}
                value={selectedExperiment || ''}
                label="Experiment ID"
                renderValue={value => shortExperimentId(String(value))}
                onChange={e => {
                  e !== null && setSelectedExperiment(e.target.value ?? '');
                }}
              >
                <MenuItem disabled value="">
                  <em>Select experiment</em>
                </MenuItem>
                {experimentList.map((experimentId: string, index: number) => {
                  return (
                    <MenuItem
                      key={experimentId || index}
                      value={experimentId}
                      title={experimentId}
                    >
                      {shortExperimentId(experimentId)}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            {experimentStatus && (
              <Chip
                label={`Status: ${experimentStatus}`}
                size="small"
                color={experimentStatusColor}
                variant="filled"
                sx={{ textTransform: 'capitalize', flexShrink: 0 }}
              />
            )}
          </Stack>
        </Paper>

        <ExperimentRunPanel
          notebookName={notebookName}
          run={run}
          error={runError}
          starting={startingRun}
          onStart={handleStartRun}
          onCancel={handleCancelRun}
          onDelete={handleDeleteRun}
        />

        <Grid2 sx={styles.moduleShell}>
          <Tabs
            value={activeModule}
            onChange={(_: React.SyntheticEvent, value: WorkflowModule) =>
              setActiveModule(value)
            }
            variant="scrollable"
            scrollButtons="auto"
            sx={styles.moduleTabs}
          >
            <Tab
              icon={<InsightsOutlinedIcon />}
              iconPosition="start"
              label="Telemetry & Observability"
            />
            <Tab
              icon={<AccountTreeOutlinedIcon />}
              iconPosition="start"
              label="Reproducibility"
            />
            <Tab
              icon={<HubOutlinedIcon />}
              iconPosition="start"
              label="Orchestration"
            />
          </Tabs>

          {activeModule === WorkflowModule.Telemetry && (
            <Box sx={styles.modulePanel}>
              <Box sx={styles.moduleHeader}>
                <Box>
                  <Typography variant="h6">
                    Telemetry & Observability
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Prometheus and Scaphandre metrics, KPI panels, and
                    dashboards.
                  </Typography>
                </Box>
                <FetchMetricsComponent
                  fetchMetrics={handleSetMetrics}
                  liveMetricsEnabled={liveMetricsEnabled}
                  automaticRefresh={automaticRefresh}
                  refreshIntervalS={refreshIntervalS}
                  setLiveMetricsEnabled={setLiveMetricsEnabled}
                  setAutomaticRefresh={setAutomaticRefresh}
                  setRefreshIntervalS={setRefreshIntervalS}
                  handleInstallMetrics={handleInstallMetrics}
                  installingMetrics={installingMetrics}
                  installProgress={installProgress}
                  installLabel={installLabel}
                  installLogs={installLogs}
                  metricsInstalled={moduleStatus.telemetry.installed}
                  telemetryStatus={telemetryStatus}
                  checkingTelemetry={checkingTelemetry}
                  telemetryStatusError={telemetryStatusError}
                  showProgress={false}
                />
              </Box>
              <Box sx={styles.moduleBody}>
                <ModuleInstallGate
                  moduleName={MODULE_DETAILS[WorkflowModule.Telemetry].label}
                  prerequisiteText={
                    MODULE_DETAILS[WorkflowModule.Telemetry].prerequisiteText
                  }
                  installed={moduleStatus.telemetry.installed}
                  installing={installingMetrics}
                  installLabel={installLabel}
                  installError={installError}
                  installProgress={installProgress}
                  installLogs={installLogs}
                  installDisabled={Boolean(telemetryStatusError)}
                  statusDetails={telemetryStatusDetails}
                  onInstall={() => handleInstallModule('telemetry')}
                >
                  <KPIComponent rawMetrics={dataMap} />

                  {metrics.length > 0 && (
                    <>
                      <Grid2 sx={{ ...styles.topRibbon, mt: 2 }}>
                        <FetchMetricsComponent
                          fetchMetrics={handleSetMetrics}
                          liveMetricsEnabled={liveMetricsEnabled}
                          automaticRefresh={automaticRefresh}
                          refreshIntervalS={refreshIntervalS}
                          setLiveMetricsEnabled={setLiveMetricsEnabled}
                          setAutomaticRefresh={setAutomaticRefresh}
                          setRefreshIntervalS={setRefreshIntervalS}
                          handleInstallMetrics={handleInstallMetrics}
                          installingMetrics={installingMetrics}
                          installProgress={installProgress}
                          installLabel={installLabel}
                          installLogs={installLogs}
                          metricsInstalled={moduleStatus.telemetry.installed}
                          telemetryStatus={telemetryStatus}
                          checkingTelemetry={checkingTelemetry}
                          telemetryStatusError={telemetryStatusError}
                          showControls={false}
                        />
                      </Grid2>

                      <GeneralDashboard
                        metrics={metrics}
                        dataMap={dataMap}
                        loading={loading && dataMap.size === 0}
                      />
                    </>
                  )}
                </ModuleInstallGate>
              </Box>
            </Box>
          )}

          {activeModule === WorkflowModule.Reproducibility && (
            <Box sx={styles.modulePanel}>
              <Box sx={styles.moduleHeader}>
                <Box>
                  <Typography variant="h6">Reproducibility</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Configure a demonstration CIM mapping, generate RO-Crate
                    metadata, and submit it to the internal FDMI target.
                  </Typography>
                </Box>
              </Box>
              <Box sx={styles.moduleBody}>
                <ModuleInstallGate
                  moduleName={
                    MODULE_DETAILS[WorkflowModule.Reproducibility].label
                  }
                  prerequisiteText={
                    MODULE_DETAILS[WorkflowModule.Reproducibility]
                      .prerequisiteText
                  }
                  installed={Boolean(moduleStatus.reproducibility.activated)}
                  activationOnly
                  statusDetails={
                    <Stack gap={0.5} textAlign="left">
                      <Typography variant="caption">
                        Mode: {moduleStatus.reproducibility.endpoint_mode}
                      </Typography>
                      <Typography variant="caption">
                        Bundled: yes · service connections are checked in the
                        workflow.
                      </Typography>
                    </Stack>
                  }
                  onInstall={() => handleInstallModule('reproducibility')}
                >
                  <ReproducibilityPanel
                    selectedWorkflow={selectedWorkflow}
                    selectedExperiment={selectedExperiment}
                    experimentPath={
                      run?.id === selectedExperiment ? run.path : null
                    }
                  />
                </ModuleInstallGate>
              </Box>
            </Box>
          )}

          {activeModule === WorkflowModule.Orchestration && (
            <Box sx={styles.modulePanel}>
              <Box sx={styles.moduleHeader}>
                <Box>
                  <Typography variant="h6">Orchestration</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Register with the demonstration federation, predict site
                    outcomes, and simulate orchestration without provisioning
                    remote compute.
                  </Typography>
                </Box>
              </Box>
              <Box sx={styles.moduleBody}>
                <ModuleInstallGate
                  moduleName={
                    MODULE_DETAILS[WorkflowModule.Orchestration].label
                  }
                  prerequisiteText={
                    MODULE_DETAILS[WorkflowModule.Orchestration]
                      .prerequisiteText
                  }
                  installed={Boolean(moduleStatus.orchestration.activated)}
                  activationOnly
                  statusDetails={
                    <Stack gap={0.5} textAlign="left">
                      <Typography variant="caption">
                        Mode: {moduleStatus.orchestration.endpoint_mode}
                      </Typography>
                      <Typography variant="caption">
                        Bundled: yes · federation registration remains a
                        separate mock action.
                      </Typography>
                    </Stack>
                  }
                  onInstall={() => handleInstallModule('orchestration')}
                >
                  <OrchestratorPanel
                    username={username}
                    selectedWorkflow={selectedWorkflow}
                    selectedExperiment={selectedExperiment}
                    experimentPath={
                      run?.id === selectedExperiment ? run.path : null
                    }
                  />
                </ModuleInstallGate>
              </Box>
            </Box>
          )}
        </Grid2>
      </Grid2>
    </>
  );
}
