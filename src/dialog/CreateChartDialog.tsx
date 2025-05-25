import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import SelectComponent from '../components/SelectComponent';
import { METRICS_GRAFANA_KEY, URL_GRAFANA_KEY } from '../helpers/constants';

interface IFormDialog {
  open: boolean;
  handleClose: (cancel: boolean) => void;
  sendNewMetrics: (metrics: string[]) => void;
  sendNewUrl: (url: string) => void;
}

const isValidUrl = (urlString: string) => {
  const urlPattern = new RegExp(
    '^(http?:\\/\\/)?' + // validate protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // validate domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))' + // validate OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // validate port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?' + // validate query string
      '(\\#[-a-z\\d_]*)?$',
    'i'
  ); // validate fragment locator
  return !!urlPattern.test(urlString);
};

export default function CreateChartDialog({
  open,
  handleClose,
  sendNewMetrics,
  sendNewUrl
}: IFormDialog) {
  return (
    <React.Fragment>
      <Dialog
        open={open}
        onClose={(_e, reason) => {
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            return;
          } else {
            handleClose(true);
          }
        }}
        slotProps={{
          paper: {
            component: 'form',
            onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const formJson = Object.fromEntries((formData as any).entries());
              if (METRICS_GRAFANA_KEY in formJson) {
                const metrics = formJson.metrics_grafana;
                sendNewMetrics(metrics.split(','));
              }
              if (URL_GRAFANA_KEY in formJson) {
                const url = formJson.url_grafana;
                // Only send the URl if it is valid, since it is optional.
                if (isValidUrl(url)) {
                  sendNewUrl(url);
                }
              } else {
                throw 'Some error happened with the form.';
              }
            }
          }
        }}
      >
        <DialogTitle>Add Metric Chart</DialogTitle>
        <DialogContent>
          <DialogContentText>
            To create a chart, you must either select a metric from the list,
            and/or provide the URL from the Grafana's dashboard.
          </DialogContentText>
          <SelectComponent />
          <TextField
            autoFocus
            // required
            margin="dense"
            id="name"
            name={URL_GRAFANA_KEY}
            label="Grafana URL"
            type="url"
            fullWidth
            variant="outlined"
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => handleClose(true)}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button type="submit" sx={{ textTransform: 'none' }}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}
