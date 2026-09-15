import React from 'react';
import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography
} from '@mui/material';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import AutoGraphOutlinedIcon from '@mui/icons-material/AutoGraphOutlined';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import Co2OutlinedIcon from '@mui/icons-material/Co2';
import ForestOutlinedIcon from '@mui/icons-material/ForestOutlined';
import LeaderboardOutlinedIcon from '@mui/icons-material/LeaderboardOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';

const MAP_STYLE =
  'https://api.maptiler.com/maps/openstreetmap/style.json?key=EbBHdB4yorH5ew69HEPJ';

// ─── EGI site data ────────────────────────────────────────────────────────────
export interface IEgiSite {
  id: string;
  name: string;
  country: string;
  flag: string;
  lat: number;
  lon: number;
  pue: number;
  carbonIntensityGco2Kwh: number;
  greenEnergyFraction: number;
  availableCores: number;
  totalPowerKw: number;
}

const EGI_SITES: IEgiSite[] = [
  {
    id: 'NIKHEF',
    name: 'Nikhef',
    country: 'Netherlands',
    flag: '🇳🇱',
    lat: 52.357,
    lon: 4.954,
    pue: 1.35,
    carbonIntensityGco2Kwh: 185,
    greenEnergyFraction: 0.78,
    availableCores: 4800,
    totalPowerKw: 960
  },
  {
    id: 'CESNET',
    name: 'CESNET',
    country: 'Czech Republic',
    flag: '🇨🇿',
    lat: 50.077,
    lon: 14.428,
    pue: 1.42,
    carbonIntensityGco2Kwh: 510,
    greenEnergyFraction: 0.28,
    availableCores: 2400,
    totalPowerKw: 480
  },
  {
    id: 'KIT',
    name: 'KIT GridKa',
    country: 'Germany',
    flag: '🇩🇪',
    lat: 49.012,
    lon: 8.411,
    pue: 1.28,
    carbonIntensityGco2Kwh: 320,
    greenEnergyFraction: 0.55,
    availableCores: 7800,
    totalPowerKw: 1560
  },
  {
    id: 'INFN-CNAF',
    name: 'INFN-CNAF',
    country: 'Italy',
    flag: '🇮🇹',
    lat: 44.493,
    lon: 11.340,
    pue: 1.50,
    carbonIntensityGco2Kwh: 235,
    greenEnergyFraction: 0.62,
    availableCores: 5200,
    totalPowerKw: 1040
  },
  {
    id: 'IN2P3-CC',
    name: 'IN2P3-CC',
    country: 'France',
    flag: '🇫🇷',
    lat: 45.776,
    lon: 4.828,
    pue: 1.31,
    carbonIntensityGco2Kwh: 55,
    greenEnergyFraction: 0.90,
    availableCores: 9600,
    totalPowerKw: 1920
  },
  {
    id: 'CYFRONET',
    name: 'Cyfronet AGH',
    country: 'Poland',
    flag: '🇵🇱',
    lat: 50.064,
    lon: 19.923,
    pue: 1.55,
    carbonIntensityGco2Kwh: 670,
    greenEnergyFraction: 0.18,
    availableCores: 3200,
    totalPowerKw: 640
  },
  {
    id: 'DESY',
    name: 'DESY Hamburg',
    country: 'Germany',
    flag: '🇩🇪',
    lat: 53.574,
    lon: 9.882,
    pue: 1.22,
    carbonIntensityGco2Kwh: 280,
    greenEnergyFraction: 0.61,
    availableCores: 6400,
    totalPowerKw: 1280
  },
  {
    id: 'GRNET',
    name: 'GRNET',
    country: 'Greece',
    flag: '🇬🇷',
    lat: 37.986,
    lon: 23.726,
    pue: 1.48,
    carbonIntensityGco2Kwh: 380,
    greenEnergyFraction: 0.42,
    availableCores: 1600,
    totalPowerKw: 320
  }
];

// ─── Prediction model ─────────────────────────────────────────────────────────
const MOCK_JOB = { cpuCores: 4, durationMin: 25, powerPerCoreW: 14 };

interface IPrediction {
  jobEnergyWh: number;
  totalEnergyWh: number;
  co2g: number;
  greenEnergyWh: number;
}

function predictForSite(site: IEgiSite): IPrediction {
  const jobEnergyWh =
    (MOCK_JOB.cpuCores * MOCK_JOB.powerPerCoreW * MOCK_JOB.durationMin) / 60;
  const totalEnergyWh = jobEnergyWh * site.pue;
  const co2g = totalEnergyWh * site.carbonIntensityGco2Kwh;
  const greenEnergyWh = totalEnergyWh * site.greenEnergyFraction;
  return {
    jobEnergyWh: Math.round(jobEnergyWh * 1000) / 1000,
    totalEnergyWh: Math.round(totalEnergyWh * 1000) / 1000,
    co2g: Math.round(co2g * 10) / 10,
    greenEnergyWh: Math.round(greenEnergyWh * 1000) / 1000
  };
}

function siteColor(site: IEgiSite): string {
  if (site.greenEnergyFraction >= 0.70) return '#16a34a';
  if (site.greenEnergyFraction >= 0.45) return '#ca8a04';
  return '#dc2626';
}

// ─── Marker ───────────────────────────────────────────────────────────────────
// Pure DOM — no MUI components inside <Marker>. MUI icons work but require the
// maplibre-gl CSS to give .maplibregl-marker its `position: absolute`, otherwise
// markers render as block elements hidden at the canvas corner.
function SiteMarker({
  site,
  selected,
  onClick
}: {
  site: IEgiSite;
  selected: boolean;
  onClick: () => void;
}) {
  const color = siteColor(site);
  const size = selected ? 36 : 28;
  return (
    <div
      title={`${site.name} — ${site.country}`}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `2.5px solid ${color}`,
        background: selected ? color : '#ffffff',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: selected
          ? `0 0 0 3px ${color}44, 0 2px 8px rgba(0,0,0,0.3)`
          : '0 1px 5px rgba(0,0,0,0.25)',
        fontSize: 13,
        lineHeight: 1,
        userSelect: 'none',
        flexShrink: 0
      }}
    >
      {site.flag}
    </div>
  );
}

// ─── Rank badge ───────────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  const bg = ['#16a34a', '#ca8a04', '#dc2626'][rank] ?? '#64748b';
  return (
    <Box
      sx={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        background: bg,
        color: '#fff',
        fontSize: 11,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}
    >
      {rank + 1}
    </Box>
  );
}

// ─── Site detail panel ────────────────────────────────────────────────────────
function SiteDetail({ site }: { site: IEgiSite }) {
  const pred = predictForSite(site);
  const color = siteColor(site);
  return (
    <Stack gap={1.5}>
      <Stack direction="row" alignItems="center" gap={1}>
        <Typography variant="h6" fontWeight={700} lineHeight={1.1}>
          {site.flag} {site.name}
        </Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {site.country}
      </Typography>
      <Divider />
      <Box>
        <Typography
          variant="caption"
          fontWeight={700}
          color="text.secondary"
          sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.75 }}
        >
          Site properties
        </Typography>
        <Stack gap={0.5}>
          {[
            { label: 'PUE', value: site.pue.toFixed(2) },
            { label: 'Carbon intensity', value: `${site.carbonIntensityGco2Kwh} gCO₂/kWh` },
            { label: 'Green energy', value: `${Math.round(site.greenEnergyFraction * 100)}%`, valueColor: color },
            { label: 'Available cores', value: site.availableCores.toLocaleString() },
            { label: 'Total power', value: `${site.totalPowerKw} kW` }
          ].map(row => (
            <Stack key={row.label} direction="row" justifyContent="space-between" alignItems="baseline">
              <Typography variant="caption" color="text.secondary">{row.label}</Typography>
              <Typography variant="caption" fontWeight={700} sx={{ color: row.valueColor ?? 'text.primary' }}>
                {row.value}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>
      <Divider />
      <Box>
        <Typography
          variant="caption"
          fontWeight={700}
          color="text.secondary"
          sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.75 }}
        >
          Job estimate ({MOCK_JOB.cpuCores} cores · {MOCK_JOB.durationMin} min)
        </Typography>
        <Stack gap={0.6}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" gap={0.5} alignItems="center">
              <BoltOutlinedIcon sx={{ fontSize: 13, color: '#ca8a04' }} />
              <Typography variant="caption" color="text.secondary">Energy</Typography>
            </Stack>
            <Typography variant="caption" fontWeight={700}>{pred.totalEnergyWh} Wh</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" gap={0.5} alignItems="center">
              <Co2OutlinedIcon sx={{ fontSize: 13, color: '#dc2626' }} />
              <Typography variant="caption" color="text.secondary">Carbon</Typography>
            </Stack>
            <Typography variant="caption" fontWeight={700}>
              {pred.co2g < 1000
                ? `${pred.co2g} mgCO₂`
                : `${(pred.co2g / 1000).toFixed(2)} gCO₂`}
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" gap={0.5} alignItems="center">
              <ForestOutlinedIcon sx={{ fontSize: 13, color }} />
              <Typography variant="caption" color="text.secondary">Green energy</Typography>
            </Stack>
            <Typography variant="caption" fontWeight={700} sx={{ color }}>
              {pred.greenEnergyWh} Wh ({Math.round(site.greenEnergyFraction * 100)}%)
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </Stack>
  );
}

// ─── Best options list ────────────────────────────────────────────────────────
function BestOptionsList({
  count,
  onSelect
}: {
  count: number;
  onSelect: (site: IEgiSite) => void;
}) {
  const ranked = [...EGI_SITES]
    .map(site => ({ site, pred: predictForSite(site) }))
    .sort((a, b) => a.pred.co2g - b.pred.co2g)
    .slice(0, count);

  return (
    <Stack gap={1}>
      <Typography
        variant="caption"
        fontWeight={700}
        color="text.secondary"
        sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}
      >
        Best {count} options — lowest CO₂
      </Typography>
      {ranked.map(({ site, pred }, i) => (
        <Paper
          key={site.id}
          elevation={0}
          onClick={() => onSelect(site)}
          sx={{
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            p: 1.25,
            cursor: 'pointer',
            '&:hover': { background: '#f8fafc', borderColor: '#93c5fd' }
          }}
        >
          <Stack direction="row" alignItems="center" gap={1}>
            <RankBadge rank={i} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" fontWeight={700} noWrap>
                {site.flag} {site.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: 10 }}>
                {site.country} · {Math.round(site.greenEnergyFraction * 100)}% green
              </Typography>
            </Box>
            <Stack alignItems="flex-end">
              <Typography variant="caption" fontWeight={700} sx={{ color: siteColor(site), fontSize: 11 }}>
                {pred.co2g < 1000 ? `${pred.co2g} mgCO₂` : `${(pred.co2g / 1000).toFixed(1)} gCO₂`}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                {pred.totalEnergyWh} Wh
              </Typography>
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OrchestratorPanel() {
  const [selectedSite, setSelectedSite] = React.useState<IEgiSite | null>(null);
  const [nSelect, setNSelect] = React.useState<number>(3);
  const [estimateSiteId, setEstimateSiteId] = React.useState<string>(EGI_SITES[0].id);
  const [panelMode, setPanelMode] = React.useState<'idle' | 'site' | 'best' | 'single'>('idle');

  // ResizeObserver measures the map container so maplibre always gets a px height.
  const mapBoxRef = React.useRef<HTMLDivElement>(null);
  const [mapHeight, setMapHeight] = React.useState(380);

  React.useEffect(() => {
    if (!mapBoxRef.current) return;
    const obs = new ResizeObserver(entries => {
      const h = entries[0]?.contentRect.height;
      if (h && h > 0) setMapHeight(h);
    });
    obs.observe(mapBoxRef.current);
    return () => obs.disconnect();
  }, []);

  function handleMarkerClick(site: IEgiSite) {
    setSelectedSite(site);
    setPanelMode('site');
  }

  const panelSite =
    panelMode === 'single'
      ? (EGI_SITES.find(s => s.id === estimateSiteId) ?? null)
      : selectedSite;

  return (
    // height: 100% fills the moduleBody flex space; flex column distributes service bar / map / legend
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        minHeight: 0
      }}
    >
      {/* ── Service status + estimation controls ── */}
      <Paper
        elevation={0}
        sx={{ border: '1px solid #e2e8f0', borderRadius: '10px', p: 1.5, background: '#fff', flexShrink: 0 }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          gap={1.5}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          flexWrap="wrap"
        >
          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
            <Chip
              icon={<CheckCircleOutlinedIcon sx={{ fontSize: 13 }} />}
              label={
                <Stack direction="row" alignItems="center" gap={0.5}>
                  <AutoGraphOutlinedIcon sx={{ fontSize: 12 }} />
                  <span>T6.2 Multi-Level ML</span>
                </Stack>
              }
              size="small"
              color="success"
              variant="outlined"
              sx={{ fontSize: 11, '& .MuiChip-label': { display: 'flex', alignItems: 'center' } }}
            />
            <Chip
              icon={<CheckCircleOutlinedIcon sx={{ fontSize: 13 }} />}
              label={
                <Stack direction="row" alignItems="center" gap={0.5}>
                  <HubOutlinedIcon sx={{ fontSize: 12 }} />
                  <span>T6.3 Brokering</span>
                </Stack>
              }
              size="small"
              color="success"
              variant="outlined"
              sx={{ fontSize: 11, '& .MuiChip-label': { display: 'flex', alignItems: 'center' } }}
            />
          </Stack>

          <Box sx={{ flex: 1 }} />

          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
            <Stack direction="row" gap={0.75} alignItems="center">
              <Button
                size="small"
                startIcon={<LeaderboardOutlinedIcon />}
                onClick={() => { setSelectedSite(null); setPanelMode('best'); }}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Estimate best options
              </Button>
              <Select
                size="small"
                value={nSelect}
                onChange={e => setNSelect(Number(e.target.value))}
                sx={{ height: 32, fontSize: 12, minWidth: 56 }}
              >
                {[1, 2, 3, 5].map(n => (
                  <MenuItem key={n} value={n} sx={{ fontSize: 12 }}>{n}</MenuItem>
                ))}
              </Select>
            </Stack>

            <Stack direction="row" gap={0.75} alignItems="center">
              <Button
                size="small"
                startIcon={<StorageOutlinedIcon />}
                onClick={() => {
                  const site = EGI_SITES.find(s => s.id === estimateSiteId) ?? EGI_SITES[0];
                  setSelectedSite(site);
                  setPanelMode('single');
                }}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Estimate for site
              </Button>
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel sx={{ fontSize: 12 }}>Site</InputLabel>
                <Select
                  label="Site"
                  value={estimateSiteId}
                  onChange={e => setEstimateSiteId(e.target.value)}
                  sx={{ height: 32, fontSize: 12 }}
                >
                  {EGI_SITES.map(s => (
                    <MenuItem key={s.id} value={s.id} sx={{ fontSize: 12 }}>
                      {s.flag} {s.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      {/* ── Map + side panel — flex: 1 fills the rest ── */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', gap: 2 }}>
        {/* Map container — ResizeObserver measures actual height → passed to <Map> */}
        <Box
          ref={mapBoxRef}
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            borderRadius: '10px',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            position: 'relative'
          }}
        >
          <Map
            initialViewState={{ longitude: 10, latitude: 49.5, zoom: 4.1 }}
            style={{ width: '100%', height: mapHeight }}
            mapStyle={MAP_STYLE}
            maplibreLogo={false}
            attributionControl={false}
          >
            {EGI_SITES.map(site => (
              <Marker
                key={site.id}
                latitude={site.lat}
                longitude={site.lon}
                anchor="center"
              >
                <SiteMarker
                  site={site}
                  selected={selectedSite?.id === site.id}
                  onClick={() => handleMarkerClick(site)}
                />
              </Marker>
            ))}
          </Map>
        </Box>

        {/* Side panel */}
        <Paper
          elevation={0}
          sx={{
            width: 260,
            flexShrink: 0,
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            p: 2,
            background: '#fff',
            overflow: 'auto',
            boxSizing: 'border-box'
          }}
        >
          {panelMode === 'idle' && (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{ height: '100%', textAlign: 'center', gap: 1, opacity: 0.45 }}
            >
              <StorageOutlinedIcon sx={{ fontSize: 28, color: '#94a3b8' }} />
              <Typography variant="caption" color="text.secondary">
                Click a site on the map or use the estimation buttons above
              </Typography>
            </Stack>
          )}
          {(panelMode === 'site' || panelMode === 'single') && panelSite && (
            <SiteDetail site={panelSite} />
          )}
          {panelMode === 'best' && (
            <BestOptionsList
              count={nSelect}
              onSelect={site => { setSelectedSite(site); setPanelMode('site'); }}
            />
          )}
        </Paper>
      </Box>

      {/* ── Legend ── */}
      <Stack direction="row" gap={2} alignItems="center" sx={{ flexShrink: 0, px: 0.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          Site carbon:
        </Typography>
        {[
          { color: '#16a34a', label: '≥70% green energy' },
          { color: '#ca8a04', label: '45–70% green' },
          { color: '#dc2626', label: '<45% green' }
        ].map(item => (
          <Stack key={item.label} direction="row" gap={0.5} alignItems="center">
            <Box sx={{ width: 9, height: 9, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
            <Typography variant="caption" color="text.secondary">{item.label}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
