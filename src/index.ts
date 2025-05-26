import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the ecojupyterext extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'ecojupyterext:plugin',
  description: 'A JupyterLab extension for sustainability metrics.',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension ecojupyterext is activated!');
  }
};

export default plugin;
