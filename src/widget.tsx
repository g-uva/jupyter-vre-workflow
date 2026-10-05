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
    minHeight: 0,
    overflow: 'hidden'
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
    overflowX: 'hidden',
    overflowY: 'auto',
    scrollbarGutter: 'stable',
    padding: '10px'
  }
};

interface IAppProps {
  username: string;
  panel: NotebookPanel | null;
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
  private _panel: NotebookPanel | null;

  constructor(username: string, panel: NotebookPanel | null) {
    super();
    this.addClass('jp-ReactWidget');
    this._username = username;
    this._panel = null;
    this.setNotebook(username, panel);
  }

  setNotebook(username: string, panel: NotebookPanel | null): void {
    if (this._panel === panel && this._username === username) {
      return;
    }
    this._panel?.disposed.disconnect(this._onPanelDisposed, this);
    this._panel?.context.pathChanged.disconnect(this._onPathChanged, this);
    this._username = username;
    this._panel = panel;
    this._panel?.disposed.connect(this._onPanelDisposed, this);
    this._panel?.context.pathChanged.connect(this._onPathChanged, this);
    this.update();
  }

  dispose(): void {
    this._panel?.disposed.disconnect(this._onPanelDisposed, this);
    this._panel?.context.pathChanged.disconnect(this._onPathChanged, this);
    super.dispose();
  }

  private _onPanelDisposed(): void {
    this.setNotebook('', null);
  }

  private _onPathChanged(): void {
    this.update();
  }

  render(): JSX.Element {
    return (
      <App
        key={this._panel?.context.path ?? 'no-notebook'}
        username={this._username}
        panel={this._panel}
      />
    );
  }
}
