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
      {value === index && <Box>{children}</Box>}
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
      <Box sx={{ borderBottom: '1px solid #e5eaf0', px: 2 }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="dashboard tabs"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              minHeight: 52,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 13,
              gap: 0.5
            },
            '& .MuiTab-root.Mui-selected': {
              color: '#1e40af'
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#1e40af',
              height: 2.5,
              borderRadius: '2px 2px 0 0'
            }
          }}
        >
          <Tab
            icon={<TimelineRoundedIcon fontSize="small" />}
            iconPosition="start"
            label="Real-time Metrics"
            {...a11yProps(0)}
          />
          <Tab
            icon={<QueryStatsRoundedIcon fontSize="small" />}
            iconPosition="start"
            label="Predictions"
            {...a11yProps(1)}
          />
          <Tab
            icon={<HistoryRoundedIcon fontSize="small" />}
            iconPosition="start"
            label="History"
            {...a11yProps(2)}
          />
        </Tabs>
      </Box>
      {children
        ? children.map((element, index) => (
            <CustomTabPanel key={index} value={value} index={index}>
              {element}
            </CustomTabPanel>
          ))
        : null}
    </Box>
  );
}
