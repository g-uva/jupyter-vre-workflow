import React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { Grid2, Paper } from '@mui/material';
import ChartsPage from './pages/ChartsPage';
import WelcomePage from './pages/WelcomePage';

import VerticalLinearStepper from './components/VerticalLinearStepper';
import GoBackButton from './components/GoBackButton';
import GrafanaPage from './pages/GrafanaPage';
import { CONTAINER_ID } from './helpers/constants';
import { NotebookPanel } from '@jupyterlab/notebook';

const styles: Record<string, React.CSSProperties> = {
  main: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    flexWrap: 'wrap',
    boxSizing: 'border-box',
    padding: '3px'
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    whiteSpace: 'wrap',
    // justifyContent: 'center',
    // alignItems: 'center',
    flex: '0 1 100%',
    width: '100%',
    height: '100%',
    overflow: 'auto',
    padding: '10px'
  }
};

interface IPrediction {
  handleGoBack: () => void;
}

function Prediction({ handleGoBack }: IPrediction) {
  return (
    <Grid2 sx={{ width: '100%', px: 3, py: 5 }}>
      <GoBackButton handleClick={handleGoBack} />
      <VerticalLinearStepper />
    </Grid2>
  );
}

export enum Page {
  WelcomePage,
  ChartsPage,
  Prediction,
  Grafana
}

interface IAppProps {
  username: string;
  panel: NotebookPanel;
}

/**
 * React component for a counter.
 *
 * @returns The React component
 */
const App = ({ username, panel }: IAppProps): JSX.Element => {
  const [activePageState, setActivePageState] = React.useState<Page>(
    Page.WelcomePage
  );

  function handleRealTimeClick() {
    setActivePageState(Page.ChartsPage);
  }

  function handlePredictionClick() {
    setActivePageState(Page.Prediction);
  }

  function handleGrafanaClick() {
    setActivePageState(Page.Grafana);
  }

  function goToMainPage() {
    setActivePageState(Page.WelcomePage);
  }

  const ActivePage: Record<Page, React.JSX.Element> = {
    [Page.WelcomePage]: (
      <WelcomePage
        handleRealTimeClick={handleRealTimeClick}
        handlePredictionClick={handlePredictionClick}
        handleGrafanaClick={handleGrafanaClick}
        username={username}
        panel={panel}
      />
    ),
    [Page.ChartsPage]: <ChartsPage handleGoBack={goToMainPage} />,
    [Page.Prediction]: <Prediction handleGoBack={goToMainPage} />,
    [Page.Grafana]: <GrafanaPage handleGoBack={goToMainPage} />
  };

  return (
    <div style={styles.main}>
      <Paper id={CONTAINER_ID} style={styles.grid}>
        {ActivePage[activePageState]}
      </Paper>
    </div>
  );
};

/**
 * A Counter Lumino Widget that wraps a CounterComponent.
 */
export class MainWidget extends ReactWidget {
  private _username: string;
  private _panel: NotebookPanel;

  constructor(username: string, panel: NotebookPanel) {
    super();
    this.addClass('jp-ReactWidget');
    this._username = username;
    this._panel = panel;
  }

  render(): JSX.Element {
    return <App username={this._username} panel={this._panel} />;
  }
}
