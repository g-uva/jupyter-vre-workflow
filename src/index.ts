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
  getAndSaveUsername,
  getSavedUsername
} from './api/handleNotebookContents';
import { setContentsManager } from './api/jupyterContents';
// import JupyterDialogWarning from './components/JupyterDialogWarning';

// import { monitorCellExecutions } from './api/monitorCellExecutions';

/**
 * Main reference: https://github.com/jupyterlab/extension-examples/blob/71486d7b891175fb3883a8b136b8edd2cd560385/react/react-widget/src/index.ts
 * And all other files in the repo.
 */

const namespaceId = 'gdapod';

async function getUsername(panel: NotebookPanel): Promise<string> {
  return (await getSavedUsername(panel)) || (await getAndSaveUsername(panel));
}

/**
 * Initialization data for the Jupyter VRE Workflow extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'ecojupyter',
  description: 'Jupyter VRE Workflow',
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
    setContentsManager(app.serviceManager.contents);

    // Create a widget tracker
    const tracker = new WidgetTracker<MainAreaWidget<MainWidget>>({
      namespace: namespaceId
    });

    // Define a widget creator function
    const newWidget = async (
      username: string,
      panel: NotebookPanel
    ): Promise<MainAreaWidget<MainWidget>> => {
      const content = new MainWidget(username, panel);
      const widget = new MainAreaWidget({ content });
      widget.id = 'gd-ecojupyter';
      widget.title.label = 'Jupyter VRE Workflow';
      widget.title.closable = true;
      return widget;
    };

    // Add an application command before any restore/notebook work can fail.
    const openCommand: string = `${namespaceId}:open`;

    async function addNewWidget(
      shell: JupyterFrontEnd.IShell,
      widget: MainAreaWidget<MainWidget> | null,
      username: string,
      panel: NotebookPanel
    ) {
      if (!widget || widget.isDisposed) {
        widget = await newWidget(username, panel);
        tracker.add(widget);
        shell.add(widget, 'main');
      }
      if (!widget.isAttached) {
        shell.add(widget, 'main');
      }
      shell.activateById(widget.id);
    }

    async function openForPanel(panel: NotebookPanel): Promise<void> {
      await panel.context.ready;

      try {
        const username = await getUsername(panel);
        await addNewWidget(shell, tracker.currentWidget, username, panel);
      } catch (err) {
        console.error('Failed to open Jupyter VRE Workflow:', err);
        await addNewWidget(shell, tracker.currentWidget, '', panel);
      }
    }

    app.commands.addCommand(openCommand, {
      label: 'Open Jupyter VRE Workflow',
      execute: async () => {
        const panel = notebookTracker.currentWidget;
        if (!panel) {
          return;
        }

        await openForPanel(panel);
      }
    });

    palette.addItem({
      command: openCommand,
      category: 'Jupyter VRE Workflow'
    });

    // Ensure the tracker is restored properly on refresh.
    restorer?.restore(tracker, {
      command: openCommand,
      name: () => 'gd-ecojupyter'
    });

    const connectedPanels = new WeakSet<NotebookPanel>();

    function connectPanelExecution(panel: NotebookPanel): void {
      if (connectedPanels.has(panel)) {
        return;
      }
      connectedPanels.add(panel);

      NotebookActions.executed.connect(async (_, args) => {
        const { cell, notebook, success } = args;
        if (notebook !== panel.content || !success) {
          return;
        }

        const index = notebook.widgets.indexOf(cell);
        const isFirst = index === 0;
        const isLast = index === notebook.widgets.length - 1;
        if (isFirst) {
          try {
            await handleFirstCellExecution(panel);
          } catch (err) {
            console.error('Failed to create experiment metadata:', err);
          }
        }
        if (isLast) {
          const username = await getUsername(panel);
          await handleLastCellExecution(panel, username);
        }
      });
    }

    notebookTracker.currentChanged.connect(async (_, panel) => {
      if (!panel) {
        return;
      }

      connectPanelExecution(panel);
      await openForPanel(panel);
    });

    notebookTracker.widgetAdded.connect((_: unknown, panel: NotebookPanel) => {
      panel.context.ready.then(async () => {
        connectPanelExecution(panel);
        await openForPanel(panel);
      });
    });

    const currentPanel = notebookTracker.currentWidget;
    if (currentPanel) {
      connectPanelExecution(currentPanel);
      await openForPanel(currentPanel);
    }
  }
};

export default plugin;
