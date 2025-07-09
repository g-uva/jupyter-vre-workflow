import React from 'react';
import { Grid2, SxProps, Typography } from '@mui/material';
import GeneralDashboard from './GeneralDashboard';
import { Dayjs } from 'dayjs';
import getScaphData from '../api/getScaphData';
import {
  startDateJs,
  endDateJs,
  NR_CHARTS,
  mainColour01,
  CONTAINER_ID
} from '../helpers/constants';
import { RawMetrics } from '../helpers/types';
import FetchMetricsComponent from '../components/FetchMetricsComponents';
import { KPIComponent } from '../components/KPIComponent';
import {
  exportSendJson,
  IExportJsonProps,
  installPrometheusScaphandre
} from '../api/apiScripts';
import ApiSubmitForm from '../components/ApiSubmitForm';
import { NotebookPanel } from '@jupyterlab/notebook';
import {
  getHandleSessionMetrics,
  handleGetTime,
  handleLoadExperimentList,
  handleLoadWorkflowList,
  handleNotebookSessionContents
} from '../api/handleNotebookContents';
import JupyterDialogWarning from '../components/JupyterDialogWarning';

export const styles: Record<string, SxProps> = {
  main: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  },
  title: {
    fontWeight: 'bold',
    color: mainColour01,
    my: 2
  },
  topRibbon: {
    display: 'flex',
    width: '100%',
    gap: 3
  },
  buttonGrid: {
    display: 'flex',
    width: '100%',
    gap: 3,
    justifyContent: 'center',
    alignContent: 'center',
    '& .MuiButtonBase-root': {
      textTransform: 'none'
    },
    mb: 2
  }
};

interface IWelcomePage {
  handleRealTimeClick: () => void;
  handlePredictionClick: () => void;
  handleGrafanaClick: () => void;
  username: string;
  panel: NotebookPanel;
}

export default function WelcomePage({
  // handleRealTimeClick,
  // handlePredictionClick,
  // handleGrafanaClick,
  username,
  panel
}: IWelcomePage) {
  const [startDate, setStartDate] = React.useState<Dayjs>(startDateJs);
  const [endDate, setEndDate] = React.useState<Dayjs>(endDateJs);

  const [metrics, setMetrics] = React.useState<string[]>([]);
  const [dataMap, setDataMap] = React.useState<RawMetrics>(new Map());
  const [selectedMetric, setSelectedMetric] = React.useState<string[]>(
    new Array(NR_CHARTS).fill('')
  );
  const [loading, setLoading] = React.useState<boolean>(false);

  // const [isFetchMetrics, setIsFetchMetrics] = React.useState<boolean>(false);

  // const [fetchIntervalS, setFetchIntervalS] = React.useState<number>(30);

  const [openDialog, setOpenDialog] = React.useState<boolean>(false);

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
    // setIsFetchMetrics(true);
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
        const code = exportSendJson({
          ...args,
          session_metrics,
          creation_date: startEndTime.start_time,
          experiment_id: selectedExperiment,
          workflow_id: selectedWorkflow
        });
        // console.log(code);
        handleNotebookSessionContents(panel, code);
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
    setSelectedWorkflow(newWorkflowList[0]);
  }

  async function handleRefreshExperimentList() {
    if (selectedWorkflow) {
      const newExperimentList = await handleLoadExperimentList(
        selectedWorkflow,
        panel
      );
      setExperimentList(newExperimentList);
      setSelectedExperiment(newExperimentList[0]);
    }
  }

  async function handleInstallMetrics() {
    await handleNotebookSessionContents(panel, installPrometheusScaphandre);
  }

  function handleSubmitExport() {
    setOpenDialog(true);
  }

  // React.useEffect(() => {
  //   let intervalId: NodeJS.Timeout;
  //   if (isFetchMetrics === true) {
  //     intervalId = setInterval(() => {
  //       fetchMetrics();
  //     }, fetchIntervalS * 1000);
  //   }

  //   return () => {
  //     if (intervalId) {
  //       return clearInterval(intervalId);
  //     }
  //   }; // Clear the interval Id when umounting ;)
  // }, [isFetchMetrics]);

  // Just run it once the component mounts.
  React.useEffect(() => {
    handleRefreshWorkflowList();
  }, []);

  React.useEffect(() => {
    handleRefreshExperimentList();
  }, [workflowList, selectedWorkflow]);

  return (
    <>
      <Grid2 sx={styles.main}>
        <Typography variant="h4" sx={styles.title}>
          🌱🌍♻️ EcoJupyter Dashboard
        </Typography>
        <Grid2 sx={styles.topRibbon}>
          <Grid2
            sx={{
              width: '100%',
              p: 2,
              m: 2,
              border: '1px solid #ccc',
              borderRadius: '15px'
            }}
          >
            <KPIComponent
              rawMetrics={dataMap}
              experimentList={experimentList}
              workflowList={workflowList}
              handleSubmitExport={handleSubmitExport}
              handleRefreshExperimentList={handleRefreshWorkflowList}
              selectedExperiment={selectedExperiment}
              setSelectedExperiment={setSelectedExperiment}
              selectedWorkflow={selectedWorkflow}
              setSelectedWorkflow={setSelectedWorkflow}
            />
          </Grid2>
        </Grid2>
        {/* <ScaphInstaller /> */}

        {/* <Grid2 sx={styles.buttonGrid}>
        <Button variant="outlined">
          Install and run Scaphandre + Prometheus
        </Button>
        <Button variant="outlined" disabled>
          Export Metrics
        </Button>
        <Button variant="outlined" disabled>
          ZIP metrics
        </Button>
      </Grid2> */}
        <Grid2 sx={styles.buttonGrid}>
          {/* <Button variant="outlined" disabled onClick={handleRealTimeClick}>
          Real-time Tracking Monitor
        </Button> */}
          {/* <Button variant="outlined" disabled onClick={handlePredictionClick}>
          Resource Usage Prediction
        </Button> */}
          {/* <Button variant="outlined" disabled onClick={handleGrafanaClick}>
          Grafana Dashboard
        </Button> */}
        </Grid2>

        {metrics && (
          <>
            <Grid2 sx={styles.topRibbon}>
              <FetchMetricsComponent
                fetchMetrics={handleSetMetrics}
                // fetchInterval={fetchIntervalS}
                // setFetchInterval={setFetchIntervalS}
                // setIsFetchMetrics={setIsFetchMetrics}
                handleInstallMetrics={handleInstallMetrics}
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
      </Grid2>
      <ApiSubmitForm
        open={openDialog}
        setOpen={(newValue: boolean) => setOpenDialog(newValue)}
        submitValues={handleSubmitValues}
      />
    </>
  );
}
