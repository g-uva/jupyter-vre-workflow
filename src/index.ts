// import React from 'react';

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

import {
  INotebookTracker,
  NotebookPanel,
  NotebookActions
} from '@jupyterlab/notebook';

import { MainWidget } from './widget';

import {
  handleFirstCellExecution,
  handleLastCellExecution,
  handleNotebookSessionContents
} from './api/handleNotebookContents';

import { getUsernameSh, saveUsernameSh } from './api/apiScripts';
// import JupyterDialogWarning from './components/JupyterDialogWarning';

// import { monitorCellExecutions } from './api/monitorCellExecutions';

/**
 * Main reference: https://github.com/jupyterlab/extension-examples/blob/71486d7b891175fb3883a8b136b8edd2cd560385/react/react-widget/src/index.ts
 * And all other files in the repo.
 */

const namespaceId = 'gdapod';

/**
 * Initialization data for the GreenDIGIT JupyterLab extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'ecojupyter',
  description: 'GreenDIGIT EcoJupyter App',
  autoStart: true,
  requires: [ICommandPalette, ILayoutRestorer, INotebookTracker],
  activate: async (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    restorer: ILayoutRestorer,
    notebookTracker: INotebookTracker
  ) => {
    // const [currentPanel, setCurrentPanel] = React.useState<NotebookPanel | null>(null);
    const { shell } = app;

    // Create a widget tracker
    const tracker = new WidgetTracker<MainAreaWidget<MainWidget>>({
      namespace: namespaceId
    });

    // Ensure the tracker is restored properly on refresh
    restorer?.restore(tracker, {
      command: `${namespaceId}:open`,
      name: () => 'gd-ecojupyter'
      // when: app.restored, // Ensure restorer waits for the app to be fully restored
    });

    // Define a widget creator function
    const newWidget = async (
      username: string,
      panel: NotebookPanel
    ): Promise<MainAreaWidget<MainWidget>> => {
      const content = new MainWidget(username, panel);
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
      widget: MainAreaWidget<MainWidget> | null,
      username: string,
      panel: NotebookPanel
    ) {
      // If the widget is not provided or is disposed, create a new one
      if (!widget || widget.isDisposed) {
        widget = await newWidget(username, panel);
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
        const panel = notebookTracker.currentWidget;
        if (!panel) {
          return;
        }

        await panel.context.ready;

        try {
          const username =
            (await handleNotebookSessionContents(panel, getUsernameSh)) ?? '';
          await addNewWidget(shell, tracker.currentWidget, username, panel);
        } catch (err) {
          console.error('Failed to fetch username:', err);
        }
      }
    });

    // app.restored.then(() => {
    //   JupyterDialogWarning({
    //     message:
    //       'EcoJupyter has been installed. Please reload the window to activate it.',
    //     buttonLabel: 'Reload window',
    //     action: () => window.location.reload()
    //   });
    // });

    // Add the command to the palette
    palette.addItem({
      command: openCommand,
      category: 'Sustainability metrics'
    });

    // Restore the widget if available
    if (!tracker.currentWidget) {
      const panel = notebookTracker.currentWidget;
      let username: string | null = null;

      if (panel) {
        await panel.context.ready;
        try {
          username =
            (await handleNotebookSessionContents(panel, getUsernameSh)) ?? null;
        } catch (err) {
          console.warn(
            'Could not fetch username during restore, using default:',
            err
          );
        }
      }

      if (username !== null && panel !== null) {
        const widget = await newWidget(username, panel);
        tracker.add(widget);
        shell.add(widget, 'main');
      }
    }

    const seenKey = 'greendigit-ecojupyter-seen';
    const seen = window.sessionStorage.getItem(seenKey);

    if (seen) {
      const panel = notebookTracker.currentWidget;
      if (panel) {
        await panel.context.ready;
        try {
          const username = await handleNotebookSessionContents(
            panel,
            getUsernameSh
          );
          if (username) {
            await addNewWidget(shell, tracker.currentWidget, username, panel);
          }
        } catch (err) {
          console.error('Failed to fetch username on seen restore:', err);
        }
      }
    }

    notebookTracker.widgetAdded.connect((_: unknown, panel: NotebookPanel) => {
      panel.context.ready.then(async () => {
        // Saving username
        await handleNotebookSessionContents(panel, saveUsernameSh);
        const username =
          (await handleNotebookSessionContents(panel, getUsernameSh)) ?? '';

        await addNewWidget(shell, tracker.currentWidget, username, panel);

        NotebookActions.executed.connect(async (_, args) => {
          const { cell, notebook } = args;
          const index = notebook.widgets.indexOf(cell);
          const isFirst = index === 0;
          const isLast = index === notebook.widgets.length - 1;
          if (isFirst) {
            await handleFirstCellExecution(panel);
          }
          if (isLast) {
            await handleLastCellExecution(panel);
          }
        });

        // Monitor cell execution
        // monitorCellExecutions(panel);
      });
    });
  }
};

export default plugin;
