import React from 'react';
import { TextField } from '@mui/material';
import { DEFAULT_REFRESH_RATE } from '../helpers/constants';

interface INumberInput {
  // currentRefreshValue: number;
  handleRefreshNumberChange: (newValue: string) => void;
}

export default function NumberInput({
  // currentRefreshValue,
  handleRefreshNumberChange
}: INumberInput) {
  return (
    <TextField
      id="outlined-number"
      label="Refresh(S)"
      type="number"
      slotProps={{
        inputLabel: {
          shrink: true
        }
      }}
      onChange={event => handleRefreshNumberChange(event.target.value)}
      defaultValue={DEFAULT_REFRESH_RATE}
      size="small"
      sx={{ maxWidth: 90 }}
    />
  );
}
