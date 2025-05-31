import React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { Grid2, Paper } from '@mui/material';
import ChartsPage from './pages/ChartsPage';
import WelcomePage from './pages/WelcomePage';

import VerticalLinearStepper from './components/VerticalLinearStepper';
import GoBackButton from './components/GoBackButton';
import GrafanaPage from './pages/GrafanaPage';
import { CONTAINER_ID } from './helpers/constants';

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

/**
 * React component for a counter.
 *
 * @returns The React component
 */
const App = (): JSX.Element => {
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
  /**
   * Constructs a new CounterWidget.
   */
  constructor() {
    super();
    this.addClass('jp-ReactWidget');
  }

  render(): JSX.Element {
    return <App />;
  }
}
