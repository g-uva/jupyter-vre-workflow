import React from 'react';
import { Grid2, Paper, SxProps, Typography } from '@mui/material';

interface IKpiValue {
  children?: React.ReactNode;
  value: number;
  unit: string;
  color: React.CSSProperties['color'];
  Icon: React.ReactNode;
}

const styles: Record<string, SxProps> = {
  paperKpi: {
    height: '300px',
    width: '100%',
    border: '1px solid #ccc',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  }
};

export default function KpiValue(props: IKpiValue) {
  const { Icon, value, unit, children } = props;
  return (
    <Grid2 size="grow">
      <Paper elevation={0} sx={styles.paperKpi}>
        {Icon}
        <Typography>{value}</Typography>
        <Typography>{unit}</Typography>
        {children}
      </Paper>
    </Grid2>
  );
}
