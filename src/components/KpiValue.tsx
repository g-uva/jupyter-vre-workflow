import React from 'react';
import { Grid2, Paper, SxProps, Typography } from '@mui/material';
import { shortenNumber } from '../helpers/utils';

interface IKpiValue {
  children?: React.ReactNode;
  title: string;
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
    alignItems: 'center',
    justifyContent: 'center'
  },
  typographyTitle: {
    fontSize: '32px'
  },
  typographyValue: {
    fontWeight: 'bold',
    fontSize: '46px'
  },
  typographyUnit: {
    fontSize: '22px'
  }
};

export default function KpiValue(props: IKpiValue) {
  const { Icon, value, unit, color, title, children } = props;
  return (
    <Grid2 size="grow" sx={{ color }}>
      <Paper
        elevation={0}
        sx={{ ...styles.paperKpi, border: `1px solid ${color}` }}
      >
        {Icon}
        <Typography sx={{ ...styles.typographyTitle, color }}>
          {title}
        </Typography>
        <Typography sx={{ ...styles.typographyValue, color }}>
          {shortenNumber(value)}
        </Typography>
        <Typography sx={{ ...styles.typographyUnit, color }}>{unit}</Typography>
        {children}
      </Paper>
    </Grid2>
  );
}
