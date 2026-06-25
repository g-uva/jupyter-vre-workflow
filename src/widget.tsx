import React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { createTheme, Paper, ThemeProvider } from '@mui/material';
import WelcomePage from './pages/WelcomePage';
import { CONTAINER_ID } from './helpers/constants';
import { NotebookPanel } from '@jupyterlab/notebook';

const theme = createTheme({
  components: {
    MuiButton: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: '8px' }
      }
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: 'none' }
      }
    }
  }
});

const styles: Record<string, React.CSSProperties> = {
  main: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    flexWrap: 'wrap',
    boxSizing: 'border-box',
    padding: '3px',
    minHeight: 0
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
    minHeight: 0,
    overflow: 'hidden',
    padding: '10px'
  }
};

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
  return (
    <ThemeProvider theme={theme}>
      <div style={styles.main}>
        <Paper id={CONTAINER_ID} style={styles.grid}>
          <WelcomePage username={username} panel={panel} />
        </Paper>
      </div>
    </ThemeProvider>
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
