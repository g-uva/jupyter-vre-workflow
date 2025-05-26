import React from 'react';
// import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import { Checkbox, Grid2 } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

interface IDataCentre {
  label: string;
  details: {
    cpu: {
      usage: number;
      time: number;
      frequency: number;
    };
    memory: {
      energy: number;
      used: number;
    };
    network: {
      io: number;
      connections: number;
    };
  };
}

interface IData {
  sci: number;
  time: number;
  availability: string;
  datacentres: IDataCentre[];
}

function createData(sci: number, time: number, availability: string) {
  const datacentres: IDataCentre[] = Array.from({ length: 2 }, (_, index) => ({
    label: `Data Centre ${index + 1}`,
    details: {
      cpu: {
        usage: Number((Math.random() * 100).toFixed(2)),
        time: Math.floor(Math.random() * 10000),
        frequency: Number((Math.random() * 3 + 2).toFixed(2))
      },
      memory: {
        energy: Number((Math.random() * 1000).toFixed(2)),
        used: Math.floor(Math.random() * 1000000)
      },
      network: {
        io: Number((Math.random() * 100).toFixed(2)),
        connections: Math.floor(Math.random() * 50)
      }
    }
  }));

  return { sci, time, availability, datacentres };
}

function Row({
  row,
  checkedIndex,
  setSelectedIndex,
  rowIndex
}: {
  row: IData;
  checkedIndex: boolean;
  setSelectedIndex: () => void;
  rowIndex: number;
}) {
  const [open, setOpen] = React.useState<boolean>(false);

  return (
    <>
      <TableRow>
        <TableCell>
          <Grid2 sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography>{rowIndex}</Typography>
            <IconButton
              aria-label="expand row"
              size="small"
              onClick={() => setOpen(!open)}
            >
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
            <Checkbox checked={checkedIndex} onClick={setSelectedIndex} />
          </Grid2>
        </TableCell>
        <TableCell>{row.sci}</TableCell>
        <TableCell align="right">{row.time}</TableCell>
        <TableCell align="center">{row.availability}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={4}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ m: 1 }}>
              {row.datacentres.map((datacentre, index) => (
                <Box
                  key={index}
                  sx={{
                    mb: 2,
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    p: 2
                  }}
                >
                  <Typography
                    sx={{ fontWeight: 'bold', mb: 1 }}
                    variant="subtitle1"
                  >
                    {datacentre.label}
                  </Typography>
                  <Grid2
                    container
                    spacing={2}
                    sx={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <Grid2
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        flexGrow: 1
                      }}
                    >
                      <Typography sx={{ fontWeight: 'bold' }}>CPU</Typography>
                      <ul style={{ paddingInlineStart: '10px' }}>
                        <li>Usage: {datacentre.details.cpu.usage} %</li>
                        <li>Time: {datacentre.details.cpu.time} μs</li>
                        <li>
                          Frequency: {datacentre.details.cpu.frequency} GHz
                        </li>
                      </ul>
                    </Grid2>
                    <Grid2
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        flexGrow: 1
                      }}
                    >
                      <Typography sx={{ fontWeight: 'bold' }}>
                        Memory
                      </Typography>
                      <ul style={{ paddingInlineStart: '10px' }}>
                        <li>Energy: {datacentre.details.memory.energy} μJ</li>
                        <li>Used: {datacentre.details.memory.used} Bytes</li>
                      </ul>
                    </Grid2>
                    <Grid2
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        flexGrow: 1
                      }}
                    >
                      <Typography sx={{ fontWeight: 'bold' }}>
                        Network
                      </Typography>
                      <ul style={{ paddingInlineStart: '10px' }}>
                        <li>IO: {datacentre.details.network.io} B/s</li>
                        <li>
                          Connections: {datacentre.details.network.connections}
                        </li>
                      </ul>
                    </Grid2>
                  </Grid2>
                </Box>
              ))}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

const rows: Array<IData> = [
  createData(12.33, 4500, '++'),
  createData(14.12, 5200, '+'),
  createData(10.89, 4300, '+++')
];

interface ICollapsibleTableProps {
  checkedIndex: number | null;
  setCheckedIndex: (newValue: number | null) => void;
}

export default function CollapsibleTable({
  checkedIndex,
  setCheckedIndex
}: ICollapsibleTableProps) {
  return (
    <TableContainer component={Paper}>
      <Table aria-label="collapsible table">
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell>SCI</TableCell>
            <TableCell align="right">Est. Time (s)</TableCell>
            <TableCell align="center">Availability</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => (
            <Row
              key={index}
              row={row}
              rowIndex={index}
              checkedIndex={index === checkedIndex}
              setSelectedIndex={() => {
                const newValue = index === checkedIndex ? null : index;
                setCheckedIndex(newValue);
              }}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
