import React from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import { IExportJsonProps } from '../api/apiScripts';

// ─── Mock connection constants ─────────────────────────────────────────────────
const FDMI_IP = '85.120.14.2';
const FDMI_CONFIG = '/etc/fdmi/config.yml';
const ZENODO_TOKEN_MASKED = '••••••••v2BkXp7';

// ─── CIM / SAREF standards ────────────────────────────────────────────────────
interface ICimStandard {
  key: string;
  label: string;
  profile: string;
  version: string;
}

const CIM_STANDARDS: ICimStandard[] = [
  {
    key: 'SAREF4Energy',
    label: 'SAREF4Energy',
    profile: 'Energy Domain (extended)',
    version: 'IEC/TS 63180-2:2021'
  },
  {
    key: 'SAREF4Env',
    label: 'SAREF4Environment',
    profile: 'Environment Domain',
    version: 'ETSI TS 103 410-7'
  },
  {
    key: 'SAREF4BLDG',
    label: 'SAREF4BLDG',
    profile: 'Building Domain',
    version: 'IEC/TS 63180-4:2021'
  },
  {
    key: 'IEC-CIM',
    label: 'IEC CIM',
    profile: 'Common Information Model',
    version: 'IEC 61968 / IEC 61970'
  }
];

// ─── Submit steps (generated per-run to include the active standard) ──────────
interface ILogStep {
  delay: number;
  text: string;
}

function makeSubmitSteps(cim: ICimStandard): ILogStep[] {
  return [
    { delay: 550, text: 'Authenticating with Zenodo...' },
    { delay: 700, text: 'Creating Zenodo deposit draft...' },
    { delay: 500, text: 'DOI assigned: 10.5281/zenodo.1234567' },
    { delay: 650, text: `Submitting to FDMI (${FDMI_IP})...` },
    { delay: 450, text: `Publishing to CIM — ${cim.label} ${cim.profile}...` },
    { delay: 300, text: 'All submissions accepted.' }
  ];
}

// ─── User config (persisted) ──────────────────────────────────────────────────
const CONFIG_STORAGE_KEY = 'ecojupyter.userConfig';

interface IUserConfig {
  creator: string;
  orcid: string;
  email: string;
  token: string;
}

function loadConfig(): IUserConfig {
  try {
    const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    return raw
      ? { creator: '', orcid: '', email: '', token: '', ...JSON.parse(raw) }
      : { creator: '', orcid: '', email: '', token: '' };
  } catch {
    return { creator: '', orcid: '', email: '', token: '' };
  }
}

function saveConfig(cfg: IUserConfig) {
  window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(cfg));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusDot({ color = '#22c55e' }: { color?: string }) {
  return (
    <Box
      sx={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 0 2px ${color}33`,
        flexShrink: 0
      }}
    />
  );
}

function ConnectionCard({
  icon,
  title,
  statusLabel,
  rows,
  children
}: {
  icon: React.ReactNode;
  title: string;
  statusLabel: string;
  rows?: { label: string; value: string; mono?: boolean }[];
  children?: React.ReactNode;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        flex: '1 1 180px',
        minWidth: 180,
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        p: 2,
        background: '#fff'
      }}
    >
      <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
        <Box sx={{ color: '#1e40af' }}>{icon}</Box>
        <Typography variant="subtitle2" fontWeight={700}>
          {title}
        </Typography>
        <Box sx={{ ml: 'auto' }}>
          <Stack direction="row" alignItems="center" gap={0.6}>
            <StatusDot />
            <Typography variant="caption" color="success.main" fontWeight={600}>
              {statusLabel}
            </Typography>
          </Stack>
        </Box>
      </Stack>
      {rows && (
        <Stack gap={0.4}>
          {rows.map(row => (
            <Stack key={row.label} direction="row" gap={1} alignItems="baseline">
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ minWidth: 56, flexShrink: 0 }}
              >
                {row.label}
              </Typography>
              <Typography
                variant="caption"
                fontWeight={600}
                sx={{
                  fontFamily: row.mono ? 'monospace' : undefined,
                  wordBreak: 'break-all'
                }}
              >
                {row.value}
              </Typography>
            </Stack>
          ))}
        </Stack>
      )}
      {children}
    </Paper>
  );
}

function LogLine({ text, done }: { text: string; done: boolean }) {
  return (
    <Stack direction="row" alignItems="center" gap={1}>
      {done ? (
        <CheckCircleOutlinedIcon sx={{ fontSize: 14, color: '#22c55e', flexShrink: 0 }} />
      ) : (
        <AutorenewIcon
          sx={{
            fontSize: 14,
            color: '#94a3b8',
            flexShrink: 0,
            animation: 'spin 1s linear infinite',
            '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } }
          }}
        />
      )}
      <Typography
        variant="caption"
        sx={{ fontFamily: 'monospace', color: done ? '#1e293b' : '#64748b' }}
      >
        {text}
      </Typography>
    </Stack>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface IReproducibilityPanelProps {
  selectedWorkflow: string | null;
  selectedExperiment: string | null;
  onSubmit: (
    args: Pick<IExportJsonProps, 'title' | 'creator' | 'email' | 'orcid' | 'token'>
  ) => void;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ReproducibilityPanel({
  selectedWorkflow,
  selectedExperiment,
  onSubmit
}: IReproducibilityPanelProps) {
  const [config, setConfig] = React.useState<IUserConfig>(loadConfig);
  const [draft, setDraft] = React.useState<IUserConfig>(loadConfig);
  const [editing, setEditing] = React.useState(false);

  const [selectedCimKey, setSelectedCimKey] = React.useState<string>(
    CIM_STANDARDS[0].key
  );
  const selectedCim =
    CIM_STANDARDS.find(s => s.key === selectedCimKey) ?? CIM_STANDARDS[0];

  const [log, setLog] = React.useState<string[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const hasConfig = Boolean(config.creator && config.email);

  function handleSaveConfig() {
    setConfig(draft);
    saveConfig(draft);
    setEditing(false);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitted(false);
    setLog([]);

    const title = selectedExperiment
      ? `${selectedWorkflow ?? 'experiment'} / ${selectedExperiment}`
      : 'Unnamed experiment';

    onSubmit({
      title,
      creator: config.creator,
      email: config.email,
      orcid: config.orcid,
      token: config.token
    });

    const steps = makeSubmitSteps(selectedCim);
    for (const step of steps) {
      await new Promise<void>(res => setTimeout(res, step.delay));
      setLog(prev => [...prev, step.text]);
    }

    setSubmitting(false);
    setSubmitted(true);
  }

  const contextLabel =
    selectedWorkflow && selectedExperiment
      ? `${selectedWorkflow} / ${selectedExperiment}`
      : 'No experiment selected';

  return (
    <Stack gap={2.5}>
      {/* ── User config strip ── */}
      <Paper
        elevation={0}
        sx={{ border: '1px solid #e2e8f0', borderRadius: '10px', p: 2, background: '#fff' }}
      >
        <Stack direction="row" alignItems="center" gap={1} mb={editing ? 1.5 : 0}>
          <PersonOutlinedIcon sx={{ fontSize: 16, color: '#64748b' }} />
          <Typography
            variant="caption"
            fontWeight={700}
            color="text.secondary"
            sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            Submitter config
          </Typography>
          <Box sx={{ ml: 'auto' }}>
            {editing ? (
              <Tooltip title="Save config">
                <IconButton size="small" onClick={handleSaveConfig} sx={{ color: '#1e40af' }}>
                  <SaveOutlinedIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Edit config">
                <IconButton
                  size="small"
                  onClick={() => { setDraft(config); setEditing(true); }}
                  sx={{ color: '#94a3b8' }}
                >
                  <EditOutlinedIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Stack>

        {editing ? (
          <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5} flexWrap="wrap">
            <TextField
              label="Creator name"
              size="small"
              value={draft.creator}
              onChange={e => setDraft(p => ({ ...p, creator: e.target.value }))}
              sx={{ flex: '1 1 160px' }}
            />
            <TextField
              label="ORCID"
              size="small"
              value={draft.orcid}
              placeholder="0000-0000-0000-0000"
              onChange={e => setDraft(p => ({ ...p, orcid: e.target.value }))}
              sx={{ flex: '1 1 160px' }}
            />
            <TextField
              label="Email"
              size="small"
              type="email"
              value={draft.email}
              onChange={e => setDraft(p => ({ ...p, email: e.target.value }))}
              sx={{ flex: '1 1 160px' }}
            />
            <TextField
              label="FDMI / Zenodo token"
              size="small"
              type="password"
              value={draft.token}
              onChange={e => setDraft(p => ({ ...p, token: e.target.value }))}
              sx={{ flex: '1 1 160px' }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <VpnKeyOutlinedIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                    </InputAdornment>
                  )
                }
              }}
            />
            <Button size="small" onClick={handleSaveConfig} sx={{ alignSelf: 'flex-end' }}>
              Save
            </Button>
          </Stack>
        ) : (
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            {hasConfig ? (
              <>
                <Typography variant="caption" color="text.secondary">
                  Submitting as
                </Typography>
                <Typography variant="caption" fontWeight={700}>
                  {config.creator}
                </Typography>
                {config.orcid && (
                  <>
                    <Typography variant="caption" color="text.disabled">·</Typography>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {config.orcid}
                    </Typography>
                  </>
                )}
                {config.email && (
                  <>
                    <Typography variant="caption" color="text.disabled">·</Typography>
                    <Typography variant="caption">{config.email}</Typography>
                  </>
                )}
                {config.token && (
                  <>
                    <Typography variant="caption" color="text.disabled">·</Typography>
                    <Typography variant="caption" color="success.main" fontWeight={600}>
                      Token configured
                    </Typography>
                  </>
                )}
              </>
            ) : (
              <Typography variant="caption" color="text.disabled">
                No submitter configured — click edit to set your name, ORCID, email and token.
              </Typography>
            )}
          </Stack>
        )}
      </Paper>

      {/* ── Connection status cards ── */}
      <Box>
        <Typography
          variant="caption"
          fontWeight={700}
          color="text.secondary"
          sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 1 }}
        >
          Connections
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} gap={2} flexWrap="wrap">
          {/* FDMI */}
          <ConnectionCard
            icon={<CloudOutlinedIcon fontSize="small" />}
            title="FDMI"
            statusLabel="Connected"
            rows={[
              { label: 'Address', value: FDMI_IP, mono: true },
              { label: 'Config', value: FDMI_CONFIG, mono: true },
              { label: 'Publish', value: 'Auto on submit' }
            ]}
          />

          {/* Zenodo */}
          <ConnectionCard
            icon={<VpnKeyOutlinedIcon fontSize="small" />}
            title="Zenodo"
            statusLabel="Authenticated"
            rows={[
              { label: 'Token', value: ZENODO_TOKEN_MASKED, mono: true },
              { label: 'Publish', value: 'Automatic (DOI minted)' },
              { label: 'Licence', value: 'CC-BY 4.0' }
            ]}
          />

          {/* CIM / SAREF — with standard selector */}
          <ConnectionCard
            icon={<AccountTreeOutlinedIcon fontSize="small" />}
            title="CIM / SAREF"
            statusLabel="Connected"
          >
            <FormControl size="small" fullWidth sx={{ mb: 1 }}>
              <InputLabel sx={{ fontSize: 12 }}>Standard</InputLabel>
              <Select
                label="Standard"
                value={selectedCimKey}
                onChange={e => setSelectedCimKey(e.target.value)}
                sx={{ fontSize: 12 }}
              >
                {CIM_STANDARDS.map(s => (
                  <MenuItem key={s.key} value={s.key} sx={{ fontSize: 12 }}>
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack gap={0.4}>
              <Stack direction="row" gap={1} alignItems="baseline">
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ minWidth: 56, flexShrink: 0 }}
                >
                  Profile
                </Typography>
                <Typography variant="caption" fontWeight={600}>
                  {selectedCim.profile}
                </Typography>
              </Stack>
              <Stack direction="row" gap={1} alignItems="baseline">
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ minWidth: 56, flexShrink: 0 }}
                >
                  Version
                </Typography>
                <Typography
                  variant="caption"
                  fontWeight={600}
                  sx={{ fontFamily: 'monospace' }}
                >
                  {selectedCim.version}
                </Typography>
              </Stack>
            </Stack>
          </ConnectionCard>
        </Stack>
      </Box>

      {/* ── Submit card ── */}
      <Paper
        elevation={0}
        sx={{ border: '1px solid #e2e8f0', borderRadius: '10px', p: 2.5, background: '#fff' }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          gap={2}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
        >
          <Box>
            <Stack direction="row" gap={1} alignItems="center" mb={0.5}>
              <SendOutlinedIcon sx={{ fontSize: 16, color: '#1e40af' }} />
              <Typography variant="subtitle2" fontWeight={700}>
                Publish experiment metadata
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={0.75}>
              Submit RO-Crate metadata to FDMI, mint a Zenodo DOI, and register
              with {selectedCim.label} — {selectedCim.profile}.
            </Typography>
            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
              <Chip
                label={contextLabel}
                size="small"
                color={selectedWorkflow && selectedExperiment ? 'primary' : 'default'}
                variant={selectedWorkflow && selectedExperiment ? 'filled' : 'outlined'}
                sx={{
                  fontSize: 11,
                  maxWidth: 320,
                  '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' }
                }}
              />
              {submitted && (
                <Chip
                  icon={<TaskAltOutlinedIcon sx={{ fontSize: 13 }} />}
                  label="Submitted"
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ fontSize: 11 }}
                />
              )}
            </Stack>
          </Box>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedWorkflow || !selectedExperiment}
            startIcon={
              submitting ? (
                <AutorenewIcon
                  sx={{
                    animation: 'spin 1s linear infinite',
                    '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } }
                  }}
                />
              ) : (
                <SendOutlinedIcon />
              )
            }
            sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {submitting ? 'Publishing…' : 'Submit metadata'}
          </Button>
        </Stack>
      </Paper>

      {/* ── Submission log ── */}
      {(log.length > 0 || submitting) && (
        <Paper
          elevation={0}
          sx={{ border: '1px solid #e2e8f0', borderRadius: '10px', p: 2, background: '#f8fafc' }}
        >
          <Typography
            variant="caption"
            fontWeight={700}
            color="text.secondary"
            sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 1 }}
          >
            Submission log
          </Typography>
          <Divider sx={{ mb: 1.5 }} />
          <Stack gap={0.75}>
            {log.map((line, i) => (
              <LogLine key={i} text={line} done={i < log.length - 1 || !submitting} />
            ))}
            {submitting && log.length < makeSubmitSteps(selectedCim).length && (
              <LogLine text="…" done={false} />
            )}
          </Stack>
          {submitted && (
            <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid #e2e8f0' }}>
              <Stack direction="row" gap={2} flexWrap="wrap">
                <Chip
                  label="DOI: 10.5281/zenodo.1234567"
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ fontFamily: 'monospace', fontSize: 11 }}
                />
                <Chip
                  label={`FDMI: ${FDMI_IP}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontSize: 11 }}
                />
                <Chip
                  label={`CIM: ${selectedCim.label}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: 11 }}
                />
              </Stack>
            </Box>
          )}
        </Paper>
      )}
    </Stack>
  );
}
