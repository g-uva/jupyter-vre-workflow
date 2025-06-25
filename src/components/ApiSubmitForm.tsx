import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { IExportJsonProps } from '../api/apiScripts';

interface IApiSubmitForm {
  open: boolean;
  setOpen: (newValue: boolean) => void;
  submitValues: (
    values: Pick<
      IExportJsonProps,
      'title' | 'creator' | 'email' | 'orcid' | 'token'
    >
  ) => void;
}

export default function ApiSubmitForm({
  open,
  setOpen,
  submitValues
}: IApiSubmitForm) {
  const handleClose = () => {
    setOpen(false);
  };

  return (
    <React.Fragment>
      <Dialog
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            component: 'form',
            onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const formJson = Object.fromEntries((formData as any).entries());

              const title: string = formJson.title;
              const creator: string = formJson.creator;
              const email: string = formJson.email;
              const orcid: string = formJson.orcid;
              const token: string = formJson.token;

              if (
                typeof title === 'string' &&
                typeof creator === 'string' &&
                typeof email === 'string' &&
                typeof orcid === 'string' &&
                typeof token === 'string'
              ) {
                submitValues({ title, creator, email, orcid, token });
                handleClose();
              }
            }
          }
        }}
      >
        <DialogTitle>Submit Experiment ID to database</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will publish your Experiment ID in the database.
          </DialogContentText>
          <TextField
            autoFocus
            required
            margin="dense"
            id="name"
            name="email"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
          />

          <TextField
            autoFocus
            required
            margin="dense"
            id="creator"
            name="creator"
            label="Creator's name"
            type="text"
            fullWidth
            variant="outlined"
          />

          <TextField
            autoFocus
            required
            margin="dense"
            id="orcid"
            name="orcid"
            label="ORCID"
            type="text"
            fullWidth
            variant="outlined"
          />

          <TextField
            autoFocus
            required
            margin="dense"
            id="title"
            name="title"
            label="Title"
            type="text"
            fullWidth
            variant="outlined"
          />

          <TextField
            autoFocus
            required
            margin="dense"
            id="token"
            name="token"
            label="FDMI Token"
            type="text"
            fullWidth
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit">Submit</Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}
