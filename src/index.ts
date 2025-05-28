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
    const { shell } = app;

    // Create a widget tracker
    const tracker = new WidgetTracker<MainAreaWidget<MainWidget>>({
      namespace: namespaceId
    });

    // Ensure the tracker is restored properly on refresh
    restorer.restore(tracker, {
      command: `${namespaceId}:open`,
      name: () => 'gd-ecojupyter'
      // when: app.restored, // Ensure restorer waits for the app to be fully restored
    });

    // Define a widget creator function
    const newWidget = async (): Promise<MainAreaWidget<MainWidget>> => {
      const content = new MainWidget();
      const widget = new MainAreaWidget({ content });
      widget.id = 'gd-ecojupyter';
      widget.title.label = 'GreenDIGIT EcoJupyter Dashboard';
      widget.title.closable = true;
      return widget;
    };

    // Add an application command
    const openCommand: string = `${namespaceId}:open`;

    async function addNewWidget(
      shell: JupyterFrontEnd.IShell,
      widget: MainAreaWidget<MainWidget> | null
    ) {
      // If the widget is not provided or is disposed, create a new one
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

    app.commands.addCommand(openCommand, {
      label: 'Open GreenDIGIT Dashboard',
      execute: async () => {
        addNewWidget(shell, tracker.currentWidget);
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

    const seenKey = 'greendigit-jupyterlab-seen';
    const seen = window.sessionStorage.getItem(seenKey);

    if (seen) {
      addNewWidget(shell, tracker.currentWidget);
    }
  }
};

export default plugin;
