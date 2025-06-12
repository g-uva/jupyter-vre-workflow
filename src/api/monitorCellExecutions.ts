import { CodeCell, ICodeCellModel } from '@jupyterlab/cells';
import { NotebookPanel } from '@jupyterlab/notebook';

export function monitorCellExecutions(panel: NotebookPanel) {
  let executedCount = 0;
  let failedCount = 0;

  panel.content.widgets.forEach(cell => {
    if (cell instanceof CodeCell) {
      const model = cell.model as ICodeCellModel;
      cell.model.stateChanged.connect((_, args) => {
        if (args.name === 'executionCount' && model.executionCount !== null) {
          executedCount += 1;

          const lastOutput = model.outputs.get(model.outputs.length - 1);
          const isError =
            lastOutput && lastOutput.toJSON().output_type === 'error';

          if (isError) {
            failedCount += 1;
          }

          console.log(
            `📊 Executed: ${executedCount}, ❌ Failed: ${failedCount}`
          );
        }
      });
    }
  });
}
