import * as React from 'react';
import Checkbox from '@mui/material/Checkbox';
import { FormControl, FormControlLabel } from '@mui/material';

export default function FetchAutomatic() {
  const [checked, setChecked] = React.useState(true);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setChecked(event.target.checked);
  };

  return (
    <>
      <FormControl>
        <FormControlLabel
          value="automatic_metric_refresh"
          control={
            <Checkbox
              defaultChecked
              checked={checked}
              onChange={handleChange}
              size="small"
            />
          }
          label="Automatic Refresh (30s)"
          labelPlacement="end"
          sx={{ fontSize: '10px' }}
        />
      </FormControl>
    </>
  );
}
