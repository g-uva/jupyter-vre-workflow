import * as React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';

import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded';
import QueryStatsRoundedIcon from '@mui/icons-material/QueryStatsRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';

interface ITablePaneProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: ITablePaneProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`
  };
}

interface ITabPaperDashboard {
  children?: React.ReactNode[];
}

export default function TabPaperDashboard(props: ITabPaperDashboard) {
  const { children } = props;
  const [value, setValue] = React.useState(0);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="basic tabs example"
          variant="fullWidth"
        >
          <Tab
            icon={<TimelineRoundedIcon />}
            label="Real-time Metrics"
            {...a11yProps(0)}
            sx={{ flex: 1 }}
          />
          <Tab
            icon={<QueryStatsRoundedIcon />}
            label="Predictions"
            {...a11yProps(1)}
            sx={{ flex: 1 }}
          />
          <Tab
            icon={<HistoryRoundedIcon />}
            label="History"
            {...a11yProps(2)}
            sx={{ flex: 1 }}
          />
        </Tabs>
      </Box>
      {children
        ? children.map((element, index) => {
            return (
              <CustomTabPanel value={value} index={index}>
                {element}
              </CustomTabPanel>
            );
          })
        : null}
    </Box>
  );
}
