import * as React from 'react';
import OutlinedInput from '@mui/material/OutlinedInput';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import ListItemText from '@mui/material/ListItemText';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Checkbox from '@mui/material/Checkbox';
import { METRICS_GRAFANA_KEY } from '../helpers/constants';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250
    }
  }
};

const metrics = [
  'CPU Usage',
  'CPU Time',
  'CPU Frequency',
  'Memory Energy',
  'Memory Used',
  'Network I/O',
  'Network Connections'
];

const noMetricSelected = 'No metric selected';

export default function MultipleSelectCheckmarks() {
  const [metricName, setMetricName] = React.useState<string[]>([]);

  const handleChange = (event: SelectChangeEvent<typeof metricName>) => {
    const {
      target: { value }
    } = event;
    setMetricName(
      // On autofill we get a stringified value.
      typeof value === 'string' ? value.split(',') : value
    );
  };

  return (
    <div>
      <FormControl sx={{ width: '100%' }}>
        <Select
          labelId="metrics-multiple-checkbox-label"
          id="metrics-multiple-checkbox"
          multiple
          value={metricName}
          onChange={handleChange}
          input={<OutlinedInput label="Metric" sx={{ width: '100%' }} />}
          renderValue={selected => {
            if (selected.length === 0) {
              return <em>{noMetricSelected}</em>;
            }

            return selected.join(', ');
          }}
          MenuProps={MenuProps}
          size="small"
          name={METRICS_GRAFANA_KEY}
        >
          <MenuItem disabled value="">
            <em>{noMetricSelected}</em>
          </MenuItem>
          {metrics.map(metric => (
            <MenuItem key={metric} value={metric}>
              <Checkbox checked={metricName.includes(metric)} />
              <ListItemText primary={metric} />
            </MenuItem>
          ))}
        </Select>
        {metricName.length > 0
          ? `${metricName.length} metric${metricName.length > 1 ? 's' : ''} selected.`
          : null}
      </FormControl>
    </div>
  );
}
