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
  Typography
} from '@mui/material';
import GeneralDashboard from './GeneralDashboard';
import { Dayjs } from 'dayjs';
import getScaphData from '../api/getScaphData';
import {
  startDateJs,
  endDateJs,
  NR_CHARTS,
  CONTAINER_ID
} from '../helpers/constants';
import { RawMetrics } from '../helpers/types';
import FetchMetricsComponent from '../components/FetchMetricsComponents';
import { KPIComponent } from '../components/KPIComponent';
import ModuleInstallGate from '../components/ModuleInstallGate';
import { IExportJsonProps } from '../api/apiScripts';
import { exportSendJson } from '../api/exportMetadata';
import ApiSubmitForm from '../components/ApiSubmitForm';
import { NotebookPanel } from '@jupyterlab/notebook';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined';
import MapComponent from '../components/map/MapComponent';
import {
  DEFAULT_MODULE_STATUS,
  InstalledModules,
  WorkflowModuleKey,
  loadModuleStatus,
  markModuleInstalled
} from '../api/moduleStatus';
import {
  getHandleSessionMetrics,
  handleGetTime,
  handleLoadExperimentList,
  handleLoadWorkflowList
} from '../api/handleNotebookContents';
import JupyterDialogWarning from '../components/JupyterDialogWarning';
import { IInstallerProgress, runMetricsInstaller } from '../api/installer';

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
    flex: 1,
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
    px: 3,
    py: 2,
    borderBottom: '1px solid #e5eaf0',
    background: '#fbfcfe'
  },
  moduleBody: {
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
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
  panel: NotebookPanel;
}

enum WorkflowModule {
  Telemetry = 0,
  Reproducibility = 1,
  Orchestration = 2
}

const MODULE_DETAILS: Record<
  WorkflowModule,
  { key: WorkflowModuleKey; label: string }
> = {
  [WorkflowModule.Telemetry]: {
    key: 'telemetry',
    label: 'Telemetry'
  },
  [WorkflowModule.Reproducibility]: {
    key: 'reproducibility',
    label: 'Reproducibility'
  },
  [WorkflowModule.Orchestration]: {
    key: 'orchestration',
    label: 'Orchestration'
  }
};

export default function WelcomePage({ username, panel }: IWelcomePage) {
  const [startDate, setStartDate] = React.useState<Dayjs>(startDateJs);
  const [endDate, setEndDate] = React.useState<Dayjs>(endDateJs);

  const [metrics, setMetrics] = React.useState<string[]>([]);
  const [dataMap, setDataMap] = React.useState<RawMetrics>(new Map());
  const [selectedMetric, setSelectedMetric] = React.useState<string[]>(
    new Array(NR_CHARTS).fill('')
  );
  const [loading, setLoading] = React.useState<boolean>(false);

  const [automaticRefresh, setAutomaticRefresh] =
    React.useState<boolean>(false);
  const [refreshIntervalS, setRefreshIntervalS] = React.useState<number>(30);
  const [installingMetrics, setInstallingMetrics] =
    React.useState<boolean>(false);
  const [installProgress, setInstallProgress] = React.useState<number>(0);
  const [installLabel, setInstallLabel] = React.useState<string>('');
  const [installError, setInstallError] = React.useState<string>('');
  const [installLogs, setInstallLogs] = React.useState<string[]>([]);
  const [moduleStatus, setModuleStatus] = React.useState<InstalledModules>(
    DEFAULT_MODULE_STATUS
  );

  const [openDialog, setOpenDialog] = React.useState<boolean>(false);
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

  function handleUpdateSelectedMetric(index: number, newMetric: string) {
    setSelectedMetric(prev => {
      const updated = [...prev];
      updated[index] = newMetric;
      return updated;
    });
  }

  React.useEffect(() => {
    for (let i = 0; i < NR_CHARTS; i++) {
      if (selectedMetric[i] === '') {
        handleUpdateSelectedMetric(i, metrics[i] || '');
      }
    }
  }, [metrics]);

  async function fetchMetrics() {
    const container = document.getElementById(CONTAINER_ID);
    const scrollPosition = container?.scrollTop;

    setLoading(true);

    let startTimeUnix: number = 0;
    let endTimeUnix: number = 0;

    if (selectedWorkflow && selectedExperiment) {
      const timeStartEnd = await handleGetTime(
        selectedWorkflow,
        selectedExperiment,
        panel
      );
      if (timeStartEnd) {
        startTimeUnix = timeStartEnd.startTimeUnix;
        endTimeUnix = timeStartEnd.endTimeUnix;
      }
    }

    getScaphData({
      url: `https://mc-a4.lab.uvalight.net/prometheus-${username}`,
      startTime: startTimeUnix,
      endTime: endTimeUnix
    }).then(results => {
      if (container !== null && scrollPosition !== undefined) {
        container.scrollTop = scrollPosition;
      }

      if (results.size === 0) {
        console.error('No metrics found');
        setLoading(false);
        return;
      }

      setDataMap(results);
      const keys: string[] = Array.from(results.keys());
      setMetrics(keys);
      setLoading(false);
    });
  }

  function handleSetMetrics() {
    fetchMetrics();
  }

  async function handleSubmitValues(
    args: Pick<
      IExportJsonProps,
      'title' | 'creator' | 'email' | 'orcid' | 'token'
    >
  ) {
    if (selectedWorkflow && selectedExperiment) {
      const session_metrics = await getHandleSessionMetrics(
        selectedWorkflow,
        selectedExperiment,
        panel
      );
      const startEndTime = await handleGetTime(
        selectedWorkflow,
        selectedExperiment,
        panel
      );
      if (session_metrics && startEndTime) {
        await exportSendJson(panel, {
          ...args,
          session_metrics,
          creation_date: startEndTime.start_time,
          experiment_id: selectedExperiment,
          workflow_id: selectedWorkflow
        });
      } else {
        JupyterDialogWarning({
          message: 'Could not get selected session metrics or creation date.'
        });
      }
    } else {
      JupyterDialogWarning({
        message: 'Could not get selected Experiment/Workflow.'
      });
    }
  }

  async function handleRefreshWorkflowList() {
    const newWorkflowList = await handleLoadWorkflowList(panel);
    setWorkflowList(newWorkflowList);
    setSelectedWorkflow(currentWorkflow => {
      if (currentWorkflow && newWorkflowList.includes(currentWorkflow)) {
        return currentWorkflow;
      }
      return newWorkflowList[0] ?? null;
    });
  }

  async function handleRefreshExperimentList() {
    if (selectedWorkflow) {
      const newExperimentList = await handleLoadExperimentList(
        selectedWorkflow,
        panel
      );
      setExperimentList(newExperimentList);
      setSelectedExperiment(currentExperiment => {
        if (
          currentExperiment &&
          newExperimentList.includes(currentExperiment)
        ) {
          return currentExperiment;
        }
        return newExperimentList[0] ?? null;
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
      setInstallProgress(100);
      setInstallLabel('Metrics agent installation complete');
      const updatedStatus = markModuleInstalled(moduleStatus, 'telemetry');
      setModuleStatus(updatedStatus);
    } catch (error) {
      console.error(error);
      setInstallLabel('Metrics agent installation failed');
      setInstallError(error instanceof Error ? error.message : String(error));
    } finally {
      setInstallingMetrics(false);
    }
  }

  async function handleInstallModule(moduleKey: WorkflowModuleKey) {
    if (moduleKey === 'telemetry') {
      await handleInstallMetrics();
      return;
    }

    const updatedStatus = markModuleInstalled(moduleStatus, moduleKey);
    setModuleStatus(updatedStatus);
  }

  function handleSubmitExport() {
    setOpenDialog(true);
  }

  // Just run it once the component mounts.
  React.useEffect(() => {
    handleRefreshWorkflowList();
  }, []);

  React.useEffect(() => {
    setModuleStatus(loadModuleStatus());
  }, []);

  React.useEffect(() => {
    handleRefreshExperimentList();
  }, [workflowList, selectedWorkflow]);

  React.useEffect(() => {
    if (!automaticRefresh) {
      return;
    }

    const intervalId = window.setInterval(() => {
      fetchMetrics();
    }, refreshIntervalS * 1000);

    return () => window.clearInterval(intervalId);
  }, [
    automaticRefresh,
    refreshIntervalS,
    selectedWorkflow,
    selectedExperiment,
    username
  ]);

  const selectedContextLabel =
    selectedWorkflow && selectedExperiment
      ? `${selectedWorkflow} / ${selectedExperiment}`
      : 'Real Time Metrics';

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

            <Chip
              label={selectedContextLabel}
              size="small"
              color={
                selectedWorkflow && selectedExperiment ? 'primary' : 'default'
              }
              variant={
                selectedWorkflow && selectedExperiment ? 'filled' : 'outlined'
              }
              sx={styles.contextChip}
            />

            <FormControl size="small" sx={styles.contextSelect}>
              <InputLabel sx={{ background: '#fff' }}>Workflow ID</InputLabel>
              <Select
                key={selectedWorkflow || 'workflow-select'}
                value={selectedWorkflow || ''}
                label="Workflow ID"
                onChange={e => {
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
                onChange={e => {
                  e !== null && setSelectedExperiment(e.target.value ?? '');
                }}
              >
                <MenuItem disabled value="">
                  <em>Select experiment</em>
                </MenuItem>
                {experimentList.map((experimentId: string, index: number) => {
                  return (
                    <MenuItem key={experimentId || index} value={experimentId}>
                      {experimentId.match(
                        /\d{4}-\d{2}-\d{2} \d{2}:\d{2}/
                      )?.[0] ?? experimentId}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Stack>
        </Paper>

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
                <Typography variant="h6">Telemetry & Observability</Typography>
                <Typography variant="body2" color="text.secondary">
                  Prometheus and Scaphandre metrics, KPI panels, and dashboards.
                </Typography>
              </Box>
              <Box sx={styles.moduleBody}>
                <ModuleInstallGate
                  moduleName={MODULE_DETAILS[WorkflowModule.Telemetry].label}
                  installed={moduleStatus.telemetry.installed}
                  installing={installingMetrics}
                  installLabel={installLabel}
                  installError={installError}
                  installProgress={installProgress}
                  onInstall={() => handleInstallModule('telemetry')}
                >
                  <KPIComponent rawMetrics={dataMap} />

                  {metrics && (
                    <>
                      <Grid2 sx={{ ...styles.topRibbon, mt: 2 }}>
                        <FetchMetricsComponent
                          fetchMetrics={handleSetMetrics}
                          automaticRefresh={automaticRefresh}
                          refreshIntervalS={refreshIntervalS}
                          setAutomaticRefresh={setAutomaticRefresh}
                          setRefreshIntervalS={setRefreshIntervalS}
                          handleInstallMetrics={handleInstallMetrics}
                          installingMetrics={installingMetrics}
                          installProgress={installProgress}
                          installLabel={installLabel}
                          installLogs={installLogs}
                        />
                      </Grid2>

                      <GeneralDashboard
                        startDate={startDate}
                        setStartDate={setStartDate}
                        setEndDate={setEndDate}
                        endDate={endDate}
                        metrics={metrics}
                        dataMap={dataMap}
                        selectedMetric={selectedMetric}
                        setSelectedMetric={handleUpdateSelectedMetric}
                        loading={loading}
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
                <Typography variant="h6">Reproducibility</Typography>
                <Typography variant="body2" color="text.secondary">
                  Submit experiment metadata to RO-Crate and FDMI-compatible
                  infrastructure.
                </Typography>
              </Box>
              <Box sx={styles.moduleBody}>
                <ModuleInstallGate
                  moduleName={
                    MODULE_DETAILS[WorkflowModule.Reproducibility].label
                  }
                  installed={moduleStatus.reproducibility.installed}
                  onInstall={() => handleInstallModule('reproducibility')}
                >
                  <Paper elevation={0} sx={styles.emptyState}>
                    <Stack
                      direction={{ xs: 'column', md: 'row' }}
                      gap={2}
                      alignItems={{ xs: 'flex-start', md: 'center' }}
                      justifyContent="space-between"
                    >
                      <Box>
                        <Stack direction="row" gap={1} alignItems="center">
                          <UploadFileOutlinedIcon color="primary" />
                          <Typography variant="subtitle1">
                            Experiment metadata export
                          </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          Publish the selected workflow and experiment metadata
                          to the configured API/FDMI endpoint.
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        onClick={handleSubmitExport}
                        startIcon={<UploadFileOutlinedIcon />}
                      >
                        Submit Experiment Metadata
                      </Button>
                    </Stack>
                  </Paper>
                </ModuleInstallGate>
              </Box>
            </Box>
          )}

          {activeModule === WorkflowModule.Orchestration && (
            <Box sx={styles.modulePanel}>
              <Box sx={styles.moduleHeader}>
                <Typography variant="h6">Orchestration</Typography>
                <Typography variant="body2" color="text.secondary">
                  VO registration context, EGI integration, and remote workload
                  replay/watch entry points.
                </Typography>
              </Box>
              <Box sx={styles.moduleBody}>
                <ModuleInstallGate
                  moduleName={
                    MODULE_DETAILS[WorkflowModule.Orchestration].label
                  }
                  installed={moduleStatus.orchestration.installed}
                  onInstall={() => handleInstallModule('orchestration')}
                >
                  <Paper elevation={0} sx={{ ...styles.emptyState, p: 0 }}>
                    <Box sx={{ p: 2 }}>
                      <Stack direction="row" gap={1} alignItems="center">
                        <RouteOutlinedIcon color="primary" />
                        <Typography variant="subtitle1">
                          VO registration and workload map
                        </Typography>
                      </Stack>
                    </Box>
                    <MapComponent />
                  </Paper>
                </ModuleInstallGate>
              </Box>
            </Box>
          )}
        </Grid2>
      </Grid2>
      <ApiSubmitForm
        open={openDialog}
        setOpen={(newValue: boolean) => setOpenDialog(newValue)}
        submitValues={handleSubmitValues}
      />
    </>
  );
}
