import * as React from 'react';
import Checkbox from '@mui/material/Checkbox';
import { FormControl, FormControlLabel, TextField } from '@mui/material';

interface IFetchAutomatic {
  fetchInterval: number;
  setFetchInterval: (value: number) => void;
  setIsFetchMetrics: (value: boolean) => void;
}

export default function FetchAutomatic(props: IFetchAutomatic) {
  const { fetchInterval, setFetchInterval, setIsFetchMetrics } = props;
  const [checked, setChecked] = React.useState(true);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setChecked(event.target.checked);
    setIsFetchMetrics(event.target.checked);
  };

  return (
    <>
      <FormControl>
        <TextField
          label="Fetch interval (s)"
          value={fetchInterval}
          onChange={e => {
            const newValue = Number(e.target.value);
            setFetchInterval(newValue >= 5 ? newValue : 5);
          }}
          type="number"
          size="small"
          slotProps={{ htmlInput: { min: 5, max: 360 } }}
          disabled={!checked}
        />
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
          label="Automatic Refresh"
          labelPlacement="end"
          sx={{ fontSize: '10px' }}
        />
      </FormControl>
    </>
  );
}
