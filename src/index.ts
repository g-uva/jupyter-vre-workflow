import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the ecojupyter extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'ecojupyter:plugin',
  description: 'A JupyterLab extension for sustainability metrics.',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension ecojupyter is activated!');
  }
};

export default plugin;
