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
    minHeight: '150px',
    width: '100%',
    border: '1px solid #d7dde6',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 1,
    p: 2,
    boxSizing: 'border-box',
    background: '#fff'
  },
  typographyTitle: {
    fontSize: '15px',
    fontWeight: 700,
    textAlign: 'left',
    lineHeight: 1.2
  },
  typographyValue: {
    fontWeight: 'bold',
    fontSize: '34px',
    lineHeight: 1
  },
  typographyUnit: {
    fontSize: '14px',
    fontWeight: 600
  }
};

export default function KpiValue(props: IKpiValue) {
  const { Icon, value, unit, color, title, children } = props;
  return (
    <Grid2 size="grow" sx={{ color }}>
      <Paper
        elevation={0}
        sx={{
          ...styles.paperKpi,
          borderTop: `3px solid ${color}`
        }}
      >
        {Icon}
        <Grid2>
          <Typography sx={{ ...styles.typographyTitle, color }}>
            {title}
          </Typography>
          <Typography sx={{ ...styles.typographyValue, color }}>
            {shortenNumber(value)}
          </Typography>
          <Typography sx={{ ...styles.typographyUnit, color }}>
            {unit}
          </Typography>
        </Grid2>
        {children}
      </Paper>
    </Grid2>
  );
}
