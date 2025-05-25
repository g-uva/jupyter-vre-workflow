import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette,
  MainAreaWidget,
  WidgetTracker
} from '@jupyterlab/apputils';

import { MainWidget } from './widget';

/**
 * Main reference: https://github.com/jupyterlab/extension-examples/blob/71486d7b891175fb3883a8b136b8edd2cd560385/react/react-widget/src/index.ts
 * And all other files in the repo.
 */

const namespaceId = 'gdapod';

/**
 * Initialization data for the GreenDIGIT JupyterLab extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-greendigit',
  description: 'GreenDIGIT App',
  autoStart: true,
  requires: [ICommandPalette, ILayoutRestorer],
  activate: async (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    restorer: ILayoutRestorer
  ) => {
    // console.log('JupyterLab extension GreenDIGIT is activated!');

    const { shell } = app;

    // Create a widget tracker
    const tracker = new WidgetTracker<MainAreaWidget<MainWidget>>({
      namespace: namespaceId
    });

    // Ensure the tracker is restored properly on refresh
    restorer.restore(tracker, {
      command: `${namespaceId}:open`,
      name: () => 'greendigit-jupyterlab'
      // when: app.restored, // Ensure restorer waits for the app to be fully restored
    });

    // Define a widget creator function
    const newWidget = async (): Promise<MainAreaWidget<MainWidget>> => {
      const content = new MainWidget();
      const widget = new MainAreaWidget({ content });
      widget.id = 'greendigit-jupyterlab';
      widget.title.label = 'GreenDIGIT Dashboard';
      widget.title.closable = true;
      return widget;
    };

    // Add an application command
    const openCommand: string = `${namespaceId}:open`;

    app.commands.addCommand(openCommand, {
      label: 'Open GreenDIGIT Dashboard',
      execute: async () => {
        let widget = tracker.currentWidget;
        if (!widget || widget.isDisposed) {
          widget = await newWidget();
          // Add the widget to the tracker and shell
          tracker.add(widget);
          shell.add(widget, 'main');
        }
        if (!widget.isAttached) {
          shell.add(widget, 'main');
        }
        shell.activateById(widget.id);
      }
    });

    // Add the command to the palette
    palette.addItem({ command: openCommand, category: 'Sustainability' });

    // Restore the widget if available
    if (!tracker.currentWidget) {
      const widget = await newWidget();
      tracker.add(widget);
      shell.add(widget, 'main');
    }
  }
};

export default plugin;
