import * as React from 'react';
import { Grid2 } from '@mui/material';

import dayjs, { Dayjs } from 'dayjs';

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

interface IDateTimeRangeProps {
  startTime: Dayjs | null;
  endTime: Dayjs | null;
  onStartTimeChange?: (newValue: Dayjs | null) => void;
  onEndTimeChange?: (newValue: Dayjs | null) => void;
}

export default function DateTimeRange({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange
}: IDateTimeRangeProps) {
  const [tempStartTime, setTempStartTime] = React.useState<Dayjs | null>(null);
  const [tempEndTime, setTempEndTime] = React.useState<Dayjs | null>(null);

  function handleAccept() {
    if (onStartTimeChange) {
      onStartTimeChange(tempStartTime);
    }
    if (onEndTimeChange) {
      onEndTimeChange(tempEndTime);
    }
    setTempStartTime(null);
    setTempEndTime(null);
  }

  return (
    <Grid2 sx={{ width: '100%', p: '15px' }}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DateTimePicker
          slotProps={{ textField: { size: 'small' } }}
          label="Start time"
          value={tempStartTime ?? startTime}
          onChange={setTempStartTime}
          onAccept={handleAccept}
          maxDateTime={tempEndTime ?? endTime ?? undefined}
          sx={{ mr: 2 }}
        />
      </LocalizationProvider>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DateTimePicker
          slotProps={{ textField: { size: 'small' } }}
          label="End time"
          value={tempEndTime ?? endTime}
          onChange={setTempEndTime}
          onAccept={handleAccept}
          minDateTime={tempStartTime ?? startTime ?? undefined}
          maxDateTime={dayjs(new Date())}
          disabled
        />
      </LocalizationProvider>
    </Grid2>
  );
}
