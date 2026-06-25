import React from 'react';
import ReactGridLayout, { LayoutItem } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import {
  Box,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Popover,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import ScaphChart from './ScaphChart';
import { RawMetrics } from '../helpers/types';
import { mainColour01, mainColour02, mainColour03 } from '../helpers/constants';

// ─── Grid constants (must mirror ReactGridLayout props exactly) ────────────────
const COLS = 2;
const ROW_HEIGHT = 300;
const MARGIN: [number, number] = [16, 16];
const PAD: [number, number] = [8, 8];

// ─── Metric metadata ──────────────────────────────────────────────────────────
const METRIC_META: Record<string, { label: string; color: string }> = {
  scaph_host_energy_microjoules: { label: 'Host Energy', color: mainColour01 },
  scaph_host_load_avg_fifteen: { label: 'Load Avg (15m)', color: mainColour02 },
  scaph_host_power_microwatts: { label: 'Host Power', color: mainColour03 },
  scaph_process_power_microwatts: { label: 'Process Power', color: '#7c3aed' }
};

function getMetricMeta(key: string) {
  return (
    METRIC_META[key] ?? {
      label: key.replace(/^scaph_/, '').replace(/_/g, ' '),
      color: mainColour03
    }
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface IWidget {
  id: string;
  metricKey: string;
}

function makeId() {
  return `w-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
}

function findNextPosition(existing: LayoutItem[], span: 1 | 2): { x: number; y: number } {
  const occupied = new Set<string>();
  for (const item of existing) {
    for (let cx = item.x; cx < item.x + item.w; cx++) {
      for (let cy = item.y; cy < item.y + item.h; cy++) {
        occupied.add(`${cx},${cy}`);
      }
    }
  }
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x <= COLS - span; x++) {
      let fits = true;
      for (let cx = x; cx < x + span; cx++) {
        if (occupied.has(`${cx},${y}`)) {
          fits = false;
          break;
        }
      }
      if (fits) return { x, y };
    }
  }
  return { x: 0, y: 100 };
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface IChartGridProps {
  metrics: string[];
  dataMap: RawMetrics;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ChartGrid({ metrics, dataMap }: IChartGridProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(640);

  const [widgets, setWidgets] = React.useState<IWidget[]>(() =>
    metrics.slice(0, 4).map((key, i) => ({ id: `init-${i}`, metricKey: key }))
  );
  const [layout, setLayout] = React.useState<LayoutItem[]>(() =>
    metrics.slice(0, 4).map((_key, i) => ({
      i: `init-${i}`,
      x: i % COLS,
      y: Math.floor(i / COLS),
      w: 1,
      h: 1
    }))
  );

  const [addAnchor, setAddAnchor] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerWidth(w);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // ─── Actions ───────────────────────────────────────────────────────────────
  function addWidget(metricKey: string) {
    setAddAnchor(null);
    const id = makeId();
    const pos = findNextPosition(layout, 1);
    setWidgets(prev => [...prev, { id, metricKey }]);
    setLayout(prev => [...prev, { i: id, x: pos.x, y: pos.y, w: 1, h: 1 }]);
  }

  function removeWidget(id: string) {
    setWidgets(prev => prev.filter(w => w.id !== id));
    setLayout(prev => prev.filter(l => l.i !== id));
  }

  function toggleSpan(id: string) {
    setLayout(prev =>
      prev.map(l => {
        if (l.i !== id) return l;
        const newW = l.w === 1 ? 2 : 1;
        return { ...l, w: newW, x: newW === 2 ? 0 : l.x };
      })
    );
  }

  // ─── Ghost background slots ────────────────────────────────────────────────
  const colWidth =
    (containerWidth - 2 * PAD[0] - (COLS - 1) * MARGIN[0]) / COLS;
  const maxRow = layout.reduce((m, l) => Math.max(m, l.y + l.h), 0);
  const numGhostRows = Math.max(2, maxRow + 1);
  const containerHeight =
    PAD[1] * 2 + numGhostRows * ROW_HEIGHT + (numGhostRows - 1) * MARGIN[1];

  // ─── Chart sizing ──────────────────────────────────────────────────────────
  function chartWidthFor(widgetId: string): number {
    const item = layout.find(l => l.i === widgetId);
    const span = item?.w ?? 1;
    const innerPad = 28;
    if (span === 1) return Math.max(180, colWidth - innerPad);
    return Math.max(360, containerWidth - 2 * PAD[0] - MARGIN[0] - innerPad);
  }

  const chartHeight = ROW_HEIGHT - 80;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <Box>
      {/* Toolbar (replaces the old tab bar) */}
      <Stack
        direction="row"
        alignItems="center"
        gap={1.5}
        sx={{
          px: 2,
          py: 1,
          borderBottom: '1px solid #e5eaf0',
          background: '#fff'
        }}
      >
        <Tooltip title="Add chart widget" placement="right">
          <IconButton
            onClick={e => setAddAnchor(e.currentTarget)}
            size="small"
            sx={{
              border: '1.5px solid #d7dde6',
              borderRadius: '8px',
              width: 30,
              height: 30,
              color: '#1e40af',
              '&:hover': { background: '#eff6ff', borderColor: '#93c5fd' }
            }}
          >
            <AddRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Typography variant="caption" color="text.secondary" fontWeight={500}>
          {widgets.length === 0
            ? 'Click + to add a chart'
            : `${widgets.length} chart${widgets.length > 1 ? 's' : ''} · drag handle to reorder · columns icon to resize`}
        </Typography>
      </Stack>

      {/* Metric picker popover */}
      <Popover
        open={Boolean(addAnchor)}
        anchorEl={addAnchor}
        onClose={() => setAddAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{
          elevation: 4,
          sx: {
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            minWidth: 280,
            mt: 0.75
          }
        }}
      >
        <Box sx={{ px: 2, pt: 1.5, pb: 0.75 }}>
          <Typography
            variant="caption"
            fontWeight={700}
            color="text.secondary"
            sx={{ textTransform: 'uppercase', letterSpacing: '0.07em' }}
          >
            Select a metric
          </Typography>
        </Box>
        <Divider />
        <List dense disablePadding sx={{ pb: 0.5 }}>
          {metrics.map(key => {
            const meta = getMetricMeta(key);
            return (
              <ListItem disablePadding key={key}>
                <ListItemButton onClick={() => addWidget(key)} sx={{ px: 2, py: 0.75 }}>
                  <Box
                    sx={{
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      background: meta.color,
                      mr: 1.5,
                      flexShrink: 0
                    }}
                  />
                  <ListItemText
                    primary={meta.label}
                    secondary={key}
                    primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }}
                    secondaryTypographyProps={{
                      fontSize: 10,
                      fontFamily: 'monospace',
                      color: '#94a3b8'
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Popover>

      {/* Grid area */}
      <Box
        ref={containerRef}
        sx={{ position: 'relative', minHeight: containerHeight, background: '#f8fafc' }}
      >
        {/* Ghost background slots */}
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          {Array.from({ length: numGhostRows }, (_, row) =>
            Array.from({ length: COLS }, (_, col) => (
              <Box
                key={`ghost-${row}-${col}`}
                sx={{
                  position: 'absolute',
                  left: PAD[0] + col * (colWidth + MARGIN[0]),
                  top: PAD[1] + row * (ROW_HEIGHT + MARGIN[1]),
                  width: colWidth,
                  height: ROW_HEIGHT,
                  border: '2px dashed #d1d5db',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  boxSizing: 'border-box'
                }}
              />
            ))
          )}
        </Box>

        {/* Empty state */}
        {widgets.length === 0 && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 0.5,
              pointerEvents: 'none'
            }}
          >
            <Typography variant="body2" color="text.disabled" fontWeight={600}>
              No charts yet
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Click the + button above to add a chart widget
            </Typography>
          </Box>
        )}

        {/* ReactGridLayout */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <ReactGridLayout
            cols={COLS}
            rowHeight={ROW_HEIGHT}
            margin={MARGIN}
            containerPadding={PAD}
            width={containerWidth}
            layout={layout}
            onLayoutChange={newLayout => setLayout([...newLayout])}
            draggableHandle=".drag-handle"
            compactType="vertical"
            preventCollision={false}
            isResizable={false}
          >
            {widgets.map(widget => {
              const meta = getMetricMeta(widget.metricKey);
              const layoutItem = layout.find(l => l.i === widget.id);
              const span = layoutItem?.w ?? 1;

              return (
                <div key={widget.id}>
                  <Paper
                    elevation={0}
                    sx={{
                      width: '100%',
                      height: '100%',
                      border: '1px solid #e2e8f0',
                      borderTop: `3px solid ${meta.color}`,
                      borderRadius: '10px',
                      background: '#fff',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      boxShadow: '0 2px 10px rgba(15,23,42,0.06)',
                      boxSizing: 'border-box',
                      transition: 'box-shadow 0.15s',
                      '&:hover': { boxShadow: '0 4px 18px rgba(15,23,42,0.10)' }
                    }}
                  >
                    {/* Header */}
                    <Stack
                      direction="row"
                      alignItems="center"
                      sx={{
                        px: 1.5,
                        pt: 1,
                        pb: 0.5,
                        flexShrink: 0,
                        borderBottom: '1px solid #f1f5f9'
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="subtitle2"
                          fontWeight={700}
                          sx={{ color: meta.color, lineHeight: 1.2 }}
                          noWrap
                        >
                          {meta.label}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontFamily: 'monospace', fontSize: 10 }}
                          noWrap
                        >
                          {widget.metricKey}
                        </Typography>
                      </Box>

                      <Stack direction="row" alignItems="center">
                        {/* Width toggle */}
                        <Tooltip
                          title={span === 1 ? 'Expand to full width' : 'Collapse to half width'}
                          placement="top"
                        >
                          <IconButton
                            size="small"
                            onClick={() => toggleSpan(widget.id)}
                            sx={{
                              width: 26,
                              height: 26,
                              color: span === 2 ? '#1e40af' : '#94a3b8',
                              '&:hover': { color: '#1e40af', background: '#eff6ff' }
                            }}
                          >
                            <ViewColumnOutlinedIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>

                        {/* Delete */}
                        <Tooltip title="Remove widget" placement="top">
                          <IconButton
                            size="small"
                            onClick={() => removeWidget(widget.id)}
                            sx={{
                              width: 26,
                              height: 26,
                              color: '#94a3b8',
                              '&:hover': { color: '#ef4444', background: '#fef2f2' }
                            }}
                          >
                            <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>

                        {/* Drag handle */}
                        <Tooltip title="Drag to reorder" placement="top">
                          <Box
                            className="drag-handle"
                            sx={{
                              width: 26,
                              height: 26,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'grab',
                              color: '#94a3b8',
                              borderRadius: '4px',
                              '&:hover': { color: '#475569', background: '#f1f5f9' },
                              '&:active': { cursor: 'grabbing' }
                            }}
                          >
                            <DragIndicatorIcon sx={{ fontSize: 16 }} />
                          </Box>
                        </Tooltip>
                      </Stack>
                    </Stack>

                    {/* Chart */}
                    <Box
                      sx={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        py: 0.5
                      }}
                    >
                      <ScaphChart
                        rawData={dataMap.get(widget.metricKey) || []}
                        color={meta.color}
                        width={chartWidthFor(widget.id)}
                        height={chartHeight}
                      />
                    </Box>
                  </Paper>
                </div>
              );
            })}
          </ReactGridLayout>
        </Box>
      </Box>
    </Box>
  );
}
