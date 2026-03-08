import {
  Accordion,
  ActionIcon,
  Badge,
  Box,
  Button,
  Code,
  Divider,
  Group,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core'
import {
  IconArrowLeft,
  IconBolt,
  IconChevronRight,
  IconPlayerPlay,
  IconRefresh,
} from '@tabler/icons-react'
import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import type { TrainConfig } from '@services/jobs'
import { useCreateJob } from '@services/jobs'
import { useDatasetTomlPreview, useTrainTomlPreview } from '@services/toml'
import { useDatasets } from '@services/datasets'
import { useModels, type ModelFile, type ModelRole, type ModelArchitecture, formatSize } from '@services/models'
import { usePaths } from '@services/settings'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

// We alias ModelArchitecture minus 'unknown' for the trainable archs.
// The Select only exposes 9 valid options; 'unknown' is never submitted.
type Arch = Exclude<ModelArchitecture, 'unknown'>

interface NewJobForm {
  output_name: string
  arch: Arch

  // Dataset
  datasetRef: string
  resolution: number
  enable_bucket: boolean
  min_bucket_reso: number
  max_bucket_reso: number
  num_repeats: number
  class_tokens: string

  // Model paths — all stored as absolute paths
  pretrained_model_name_or_path: string
  clip_l: string
  clip_g: string
  t5xxl: string
  ae: string
  vae: string
  qwen3: string
  gemma2: string
  text_encoder: string
  byt5: string

  // LoRA
  network_dim: number
  network_alpha: number

  // Training loop
  use_steps: boolean
  max_train_epochs: number
  max_train_steps: number

  // Optimizer / LR
  optimizer_type: string
  learning_rate: number
  unet_lr: number
  text_encoder_lr: number
  lr_scheduler: string
  lr_warmup_steps: number

  // Save
  save_every_n_epochs: number
  output_dir: string

  // Precision
  mixed_precision: 'no' | 'fp16' | 'bf16'
  save_precision: 'float' | 'fp16' | 'bf16'

  // Advanced booleans
  gradient_checkpointing: boolean
  cache_latents: boolean
  cache_latents_to_disk: boolean
  network_train_unet_only: boolean
  cache_text_encoder_outputs: boolean
  fp8_base: boolean

  // Optional numerics
  seed: number | null
  blocks_to_swap: number | null

  // Flow-matching specific
  guidance_scale: number
  timestep_sampling: string
  apply_t5_attn_mask: boolean

  // SD2
  v2: boolean
  v_parameterization: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ARCH_OPTIONS = [
  { value: 'flux',    label: 'FLUX.1' },
  { value: 'chroma',  label: 'Chroma' },
  { value: 'sdxl',    label: 'SDXL' },
  { value: 'sd3',     label: 'SD 3 / 3.5' },
  { value: 'anima',   label: 'Anima' },
  { value: 'lumina',  label: 'Lumina 2.0' },
  { value: 'hunyuan', label: 'HunyuanImage 2.1' },
  { value: 'sd1',     label: 'SD 1.x' },
  { value: 'sd2',     label: 'SD 2.x' },
]

const ARCH_BADGE_COLOR: Record<Arch, string> = {
  sd1: 'gray', sd2: 'gray', sdxl: 'violet', flux: 'blue',
  chroma: 'cyan', sd3: 'teal', anima: 'orange', lumina: 'yellow', hunyuan: 'red',
}

// Safe lookup — form.arch is always one of the 9 valid values via ARCH_OPTIONS,
// but guard against stale state or future additions returning undefined.
const archBadgeColor = (arch: Arch) => ARCH_BADGE_COLOR[arch] ?? 'gray'

const LR_SCHEDULERS = [
  'cosine_with_restarts', 'cosine', 'constant', 'constant_with_warmup',
  'linear', 'polynomial', 'inverse_sqrt', 'adafactor',
].map(v => ({ value: v, label: v }))

const OPTIMIZERS = [
  'AdamW8bit', 'AdamW', 'Adafactor', 'Lion8bit', 'Lion',
  'Prodigy', 'DAdaptation', 'SGDNesterov', 'SGDNesterov8bit',
].map(v => ({ value: v, label: v }))

// Roles that represent a "main" model (DiT, U-Net, or classic checkpoint).
// Used in mainModels filter as a fallback when type='unknown' but role is known.
const MAIN_ROLES: ModelRole[] = ['checkpoint', 'dit', 'unet']

const TIMESTEP_SAMPLING_OPTIONS = [
  { value: 'sigmoid',       label: 'sigmoid' },
  { value: 'flux_shift',    label: 'flux_shift' },
  { value: 'sigma',         label: 'sigma' },
  { value: 'uniform',       label: 'uniform' },
  { value: 'shift',         label: 'shift' },
  { value: 'nextdit_shift', label: 'nextdit_shift (Lumina)' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Arch defaults
// ─────────────────────────────────────────────────────────────────────────────

const ARCH_DEFAULTS: Record<Arch, Partial<NewJobForm>> = {
  sd1:  { mixed_precision: 'fp16', v2: false, v_parameterization: false,
          network_train_unet_only: false, cache_text_encoder_outputs: false },
  sd2:  { mixed_precision: 'fp16', v2: true,  v_parameterization: false,
          network_train_unet_only: false, cache_text_encoder_outputs: false },
  sdxl: { mixed_precision: 'bf16', v2: false,
          network_train_unet_only: false, cache_text_encoder_outputs: false },
  flux: {
    mixed_precision: 'bf16', guidance_scale: 1.0,
    timestep_sampling: 'sigmoid', apply_t5_attn_mask: false,
    network_train_unet_only: false, cache_text_encoder_outputs: true,
  },
  chroma: {
    mixed_precision: 'bf16', guidance_scale: 0.0,
    timestep_sampling: 'sigmoid', apply_t5_attn_mask: true,
    network_train_unet_only: false, cache_text_encoder_outputs: true,
  },
  sd3: {
    mixed_precision: 'bf16', cache_text_encoder_outputs: true,
    network_train_unet_only: false,
  },
  anima: {
    mixed_precision: 'bf16', timestep_sampling: 'sigmoid',
    network_train_unet_only: false, cache_text_encoder_outputs: false,
  },
  lumina: {
    mixed_precision: 'bf16', timestep_sampling: 'nextdit_shift',
    network_train_unet_only: false, cache_text_encoder_outputs: true,
  },
  hunyuan: {
    mixed_precision: 'bf16', timestep_sampling: 'sigma',
    network_train_unet_only: true, cache_text_encoder_outputs: false,
  },
}

const DEFAULT_FORM: NewJobForm = {
  output_name: '', arch: 'flux',
  datasetRef: '', resolution: 1024, enable_bucket: true,
  min_bucket_reso: 256, max_bucket_reso: 2048, num_repeats: 1, class_tokens: '',
  pretrained_model_name_or_path: '',
  clip_l: '', clip_g: '', t5xxl: '', ae: '', vae: '',
  qwen3: '', gemma2: '', text_encoder: '', byt5: '',
  network_dim: 16, network_alpha: 1,
  use_steps: false, max_train_epochs: 10, max_train_steps: 2000,
  optimizer_type: 'AdamW8bit', learning_rate: 1e-4,
  unet_lr: 0, text_encoder_lr: 0,
  lr_scheduler: 'cosine_with_restarts', lr_warmup_steps: 0,
  save_every_n_epochs: 1, output_dir: '',
  mixed_precision: 'bf16', save_precision: 'bf16',
  gradient_checkpointing: true, cache_latents: true,
  cache_latents_to_disk: false, network_train_unet_only: false,
  cache_text_encoder_outputs: true, fp8_base: false,
  seed: null, blocks_to_swap: null,
  guidance_scale: 1.0, timestep_sampling: 'sigmoid', apply_t5_attn_mask: false,
  v2: false, v_parameterization: false,
}
Object.assign(DEFAULT_FORM, ARCH_DEFAULTS['flux'])

// ─────────────────────────────────────────────────────────────────────────────
// buildTrainConfig — for actual job creation (no placeholders)
// ─────────────────────────────────────────────────────────────────────────────

function buildTrainConfig(form: NewJobForm): TrainConfig {
  const base: TrainConfig = {
    arch:         form.arch,
    output_name:  form.output_name || 'untitled',
    pretrained_model_name_or_path: form.pretrained_model_name_or_path || '',
    // output_dir: only send when user explicitly filled the override field.
    // If omitted, JobsService constructs: path.join(settings.outputs, output_name)
    // which is OS-correct (backslashes on Windows, forward slashes on Linux).
    ...(form.output_dir.trim() && { output_dir: form.output_dir.trim() }),

    network_dim:    form.network_dim,
    network_alpha:  form.network_alpha,
    optimizer_type: form.optimizer_type,
    learning_rate:  form.learning_rate,

    ...(form.unet_lr         > 0 && { unet_lr:         form.unet_lr }),
    ...(form.text_encoder_lr > 0 && { text_encoder_lr: form.text_encoder_lr }),
    ...(form.lr_scheduler               && { lr_scheduler:    form.lr_scheduler }),
    ...(form.lr_warmup_steps > 0        && { lr_warmup_steps: form.lr_warmup_steps }),

    ...(form.use_steps
      ? { max_train_steps:  form.max_train_steps  || undefined }
      : { max_train_epochs: form.max_train_epochs || undefined }),

    save_every_n_epochs: form.save_every_n_epochs || undefined,
    mixed_precision:     form.mixed_precision,
    save_precision:      form.save_precision,

    ...(form.seed           !== null && { seed:           form.seed }),
    ...(form.blocks_to_swap !== null && { blocks_to_swap: form.blocks_to_swap }),

    ...(form.gradient_checkpointing     && { gradient_checkpointing:     true }),
    ...(form.cache_latents              && { cache_latents:              true }),
    ...(form.cache_latents_to_disk      && { cache_latents_to_disk:      true }),
    ...(form.network_train_unet_only    && { network_train_unet_only:    true }),
    ...(form.cache_text_encoder_outputs && { cache_text_encoder_outputs: true }),
    ...(form.fp8_base                   && { fp8_base:                   true }),
  }

  switch (form.arch) {
    case 'sd2':
      base.v2 = true
      if (form.v_parameterization) base.v_parameterization = true
      break
    case 'sdxl':
      if (form.vae) base.vae = form.vae
      break
    case 'flux':
      if (form.clip_l) base.clip_l = form.clip_l
      if (form.t5xxl)  base.t5xxl  = form.t5xxl
      if (form.ae)     base.ae     = form.ae
      base.guidance_scale = form.guidance_scale
      if (form.timestep_sampling) base.timestep_sampling = form.timestep_sampling
      if (form.apply_t5_attn_mask) base.apply_t5_attn_mask = true
      break
    case 'chroma':
      base.model_type         = 'chroma'
      base.t5xxl              = form.t5xxl
      base.ae                 = form.ae
      base.guidance_scale     = 0.0
      base.apply_t5_attn_mask = true
      if (form.timestep_sampling) base.timestep_sampling = form.timestep_sampling
      break
    case 'sd3':
      if (form.clip_l) base.clip_l = form.clip_l
      if (form.clip_g) base.clip_g = form.clip_g
      if (form.t5xxl)  base.t5xxl  = form.t5xxl
      if (form.vae)    base.vae    = form.vae
      break
    case 'anima':
      base.qwen3 = form.qwen3
      base.vae   = form.vae
      if (form.timestep_sampling) base.timestep_sampling = form.timestep_sampling
      break
    case 'lumina':
      base.gemma2 = form.gemma2
      base.ae     = form.ae
      if (form.timestep_sampling) base.timestep_sampling = form.timestep_sampling
      break
    case 'hunyuan':
      base.text_encoder          = form.text_encoder
      base.byt5                  = form.byt5
      base.vae                   = form.vae
      base.network_train_unet_only = true
      if (form.timestep_sampling) base.timestep_sampling = form.timestep_sampling
      break
  }

  return base
}

// ─────────────────────────────────────────────────────────────────────────────
// buildTrainPreviewConfig
// POST /toml/preview/train validates output_dir and dataset_config as required
// fields, but JobsService injects them at job-creation time.
// For preview we inject harmless placeholders.
// ─────────────────────────────────────────────────────────────────────────────

function buildTrainPreviewConfig(form: NewJobForm, outputsBase = '/workspace/outputs'): TrainConfig {
  const cfg = buildTrainConfig(form)
  // Inject preview-only placeholders — real values injected by JobsService at submission
  if (!cfg.output_dir) cfg.output_dir = `${outputsBase}/${form.output_name || 'untitled'}`
  // dataset_config is injected by JobsService on actual submission.
  // For preview we use a descriptive placeholder so the validator accepts the request.
  // The real path will be: <logs>/jobs/<jobId>/dataset.toml
  cfg.dataset_config = '<job-dir>/dataset.toml'
  return cfg
}

// ─────────────────────────────────────────────────────────────────────────────
// buildDatasetPreviewDto
// ─────────────────────────────────────────────────────────────────────────────

function buildDatasetPreviewDto(form: NewJobForm) {
  if (!form.datasetRef) return null
  return {
    datasets: [{
      resolution:      form.resolution,
      enable_bucket:   form.enable_bucket,
      min_bucket_reso: form.enable_bucket ? form.min_bucket_reso : undefined,
      max_bucket_reso: form.enable_bucket ? form.max_bucket_reso : undefined,
      batch_size:      1,
      subsets: [{
        image_dir:   `/workspace/datasets/${form.datasetRef}`,
        num_repeats: form.num_repeats,
        ...(form.class_tokens && { class_tokens: form.class_tokens }),
      }],
    }],
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ModelSelect — dropdown populated from scanned models API
// value = absolute path on disk (what sd-scripts receives)
// ─────────────────────────────────────────────────────────────────────────────

interface ModelSelectProps {
  label: string
  description?: string
  required?: boolean
  value: string
  onChange: (path: string) => void
  models: ModelFile[]
}

function ModelSelect({ label, description, required, value, onChange, models }: ModelSelectProps) {
  // absolutePath is what sd-scripts receives and what we store in form state.
  // Guard: Mantine throws "Each option must have value property" if any item
  // has value === undefined or value === null. Filter defensively.
  const data = models
    .filter(m => m.absolutePath != null && m.absolutePath !== '')
    .map(m => ({
      value: m.absolutePath,
      label: `${m.name}  ·  ${formatSize(m.sizeBytes)}`,
    }))

  // If the stored path isn't in the list (e.g. arch changed and old value
  // persisted briefly), keep it as an option so Select doesn't go blank.
  if (value && !data.some(d => d.value === value)) {
    data.unshift({ value, label: value })
  }

  return (
    <Select
      label={label}
      description={
        description ??
        (models.length === 0 ? 'No models scanned for this role — go to Models → Refresh' : undefined)
      }
      required={required}
      data={data}
      value={value || null}
      onChange={v => onChange(v ?? '')}
      searchable
      clearable={!required}
      placeholder={models.length === 0 ? 'No models found' : 'Select…'}
      size="sm"
      nothingFoundMessage="No matching models"
      styles={{ input: { fontFamily: 'monospace', fontSize: 12 } }}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionCard
// ─────────────────────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Text fw={600} size="xs" c="dimmed" tt="uppercase" style={{ letterSpacing: '0.06em' }}>
          {title}
        </Text>
        {children}
      </Stack>
    </Paper>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// NewJobPage
// ─────────────────────────────────────────────────────────────────────────────

export default function NewJobPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<NewJobForm>(DEFAULT_FORM)
  const [debouncedForm, setDebouncedForm] = useState<NewJobForm>(DEFAULT_FORM)

  // Debounce 400 ms → TOML preview
  useEffect(() => {
    const t = setTimeout(() => setDebouncedForm(form), 400)
    return () => clearTimeout(t)
  }, [form])

  const set = useCallback(
    <K extends keyof NewJobForm>(key: K, value: NewJobForm[K]) =>
      setForm(prev => ({ ...prev, [key]: value })),
    [],
  )

  const handleArchChange = useCallback((arch: string | null) => {
    if (!arch) return
    const defaults = ARCH_DEFAULTS[arch as Arch] ?? {}
    setForm(prev => ({
      ...prev,
      arch: arch as Arch,
      ...defaults,
      // Clear model paths so wrong-arch paths don't persist
      pretrained_model_name_or_path: '',
      clip_l: '', clip_g: '', t5xxl: '', ae: '',
      vae: '', qwen3: '', gemma2: '', text_encoder: '', byt5: '',
    }))
  }, [])

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: datasets = [] } = useDatasets()
  const { data: allModels = [] } = useModels()
  const { data: paths } = usePaths()

  // ── Arch flags ───────────────────────────────────────────────────────────────

  const arch       = form.arch
  const isFlux     = arch === 'flux'
  const isChroma   = arch === 'chroma'
  const isFluxLike = isFlux || isChroma
  const isSd3      = arch === 'sd3'
  const isAnima    = arch === 'anima'
  const isLumina   = arch === 'lumina'
  const isHunyuan  = arch === 'hunyuan'
  const isSd2      = arch === 'sd2'
  const isSdxl     = arch === 'sdxl'
  const isClassic  = arch === 'sd1' || isSd2 || isSdxl
  const hasFlowArgs = isFluxLike || isSd3 || isAnima || isLumina || isHunyuan

  // ── Model lists filtered by role (client-side) ───────────────────────────────

  const byRole = useCallback(
    (...roles: ModelRole[]) => allModels.filter(m => roles.includes(m.role)),
    [allModels],
  )

  /**
   * Like byRole but narrows to (targetArch | 'unknown').
   * Falls back to all-arch results if the arch-filtered list is empty —
   * handles the case where the user hasn't organised files into arch subdirs yet.
   */
  const byRoleForArch = useCallback(
    (targetArch: Arch, ...roles: ModelRole[]) => {
      const all = allModels.filter(m => roles.includes(m.role))
      const narrowed = all.filter(m => m.arch === targetArch || m.arch === 'unknown')
      return narrowed.length > 0 ? narrowed : all
    },
    [allModels],
  )

  // Main DiT / checkpoint.
  // We match by BOTH type and role so DiT models with type='unknown' (backend
  // classification gap) still surface.  Classic archs also accept arch='unknown'
  // since checkpoint scanners often can't distinguish SD1 from SD2 by filename alone.
  const mainModels = useMemo(() => {
    const isMain = (m: ModelFile) =>
      m.type === 'checkpoint' || MAIN_ROLES.includes(m.role)
    if (isClassic) {
      return allModels.filter(m => isMain(m) && (m.arch === arch || m.arch === 'unknown'))
    }
    return allModels.filter(m => m.arch === arch && isMain(m))
  }, [allModels, arch, isClassic])

  // ── Shared text-encoder / VAE models (same physical file reused across archs) ──
  // clip_l, clip_g, t5xxl, ae — intentionally NOT arch-filtered:
  // e.g. the same ae.safetensors ships with FLUX and is also used by Lumina.
  const clipLModels = useMemo(() => byRole('clip_l'), [byRole])
  const clipGModels = useMemo(() => byRole('clip_g'), [byRole])
  const t5xxlModels = useMemo(() => byRole('t5xxl'),  [byRole])
  const aeModels    = useMemo(() => byRole('ae'),      [byRole])

  // ── Arch-specific accessory models — filter by arch, fallback to all ──────────
  // VAE files differ between SD3, SDXL, Anima, HunyuanImage — filter by current arch.
  const vaeModels = useMemo(
    () => byRoleForArch(arch, 'vae'),
    [byRoleForArch, arch],
  )
  // Qwen3-0.6B — Anima only
  const qwen3Models = useMemo(
    () => byRoleForArch('anima', 'qwen3'),
    [byRoleForArch],
  )
  // Gemma2 — Lumina only
  const gemma2Models = useMemo(
    () => byRoleForArch('lumina', 'gemma2'),
    [byRoleForArch],
  )
  // Qwen2.5-VL — HunyuanImage only
  const qwen25VLModels = useMemo(
    () => byRoleForArch('hunyuan', 'qwen2_5_vl', 'text_encoder'),
    [byRoleForArch],
  )
  // byT5 — HunyuanImage only
  const byt5Models = useMemo(
    () => byRoleForArch('hunyuan', 'byt5'),
    [byRoleForArch],
  )

  // ── TOML preview ─────────────────────────────────────────────────────────────

  const trainPreviewDto = useMemo(() => buildTrainPreviewConfig(debouncedForm, paths?.outputs), [debouncedForm, paths?.outputs])
  const datasetDto      = useMemo(() => buildDatasetPreviewDto(debouncedForm),  [debouncedForm])

  const { data: trainPreview, error: trainPreviewError, isFetching: previewLoading } =
    useTrainTomlPreview(trainPreviewDto)
  const { data: datasetPreview } =
    useDatasetTomlPreview(datasetDto)

  // ── Submit ───────────────────────────────────────────────────────────────────

  const { mutate: createJob, isPending } = useCreateJob()

  const canSubmit =
    !!form.output_name.trim() &&
    !!form.datasetRef &&
    !!form.pretrained_model_name_or_path

  const handleSubmit = () => {
    createJob(
      {
        train: buildTrainConfig(form),
        datasetRef: form.datasetRef,
        datasetOptions: {
          resolution:      form.resolution,
          enable_bucket:   form.enable_bucket,
          min_bucket_reso: form.enable_bucket ? form.min_bucket_reso : undefined,
          max_bucket_reso: form.enable_bucket ? form.max_bucket_reso : undefined,
          num_repeats:     form.num_repeats   || undefined,
          class_tokens:    form.class_tokens  || undefined,
        },
      },
      { onSuccess: job => void navigate({ to: '/jobs/' + job.id }) },
    )
  }

  // ── TOML preview content ─────────────────────────────────────────────────────

  const trainTomlContent = useMemo(() => {
    if (trainPreviewError) {
      if (axios.isAxiosError(trainPreviewError)) {
        const errors = (trainPreviewError.response?.data as { errors?: { field: string; message: string }[] })?.errors
        if (errors?.length) {
          return `# Validation errors:\n${errors.map(e => `# ✗ ${e.field}: ${e.message}`).join('\n')}`
        }
        const msg = (trainPreviewError.response?.data as { message?: string })?.message
        return `# ${msg ?? trainPreviewError.message}`
      }
      return `# Error: ${String(trainPreviewError)}`
    }
    return trainPreview?.toml ?? '# Fill in Name, Model, and Dataset to preview…'
  }, [trainPreview, trainPreviewError])

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Stack gap={0} h="100%" style={{ overflow: 'hidden' }}>

      {/* Header */}
      <Box
        p="lg" pb="md"
        style={{ borderBottom: '1px solid var(--mantine-color-default-border)', flexShrink: 0 }}
      >
        <Group justify="space-between" align="center">
          <Group gap="md" align="center">
            <ActionIcon variant="subtle" size="sm"
              onClick={() => void navigate({ to: '/jobs' })} disabled={isPending}>
              <IconArrowLeft size={15} />
            </ActionIcon>
            <Stack gap={2}>
              <Group gap="xs" align="center">
                <Title order={3}>New Training Job</Title>
                <Badge color={archBadgeColor(form.arch)} variant="light" size="sm">
                  {ARCH_OPTIONS.find(o => o.value === form.arch)?.label ?? form.arch}
                </Badge>
                {trainPreview && (
                  <Badge variant="dot" color="green" size="xs">
                    {trainPreview.script}
                  </Badge>
                )}
              </Group>
              <Text size="xs" c="dimmed">Configure a LoRA training run and launch it on this pod</Text>
            </Stack>
          </Group>

          <Group gap="xs">
            <Button variant="subtle" color="gray" size="sm"
              onClick={() => void navigate({ to: '/jobs' })} disabled={isPending}>
              Cancel
            </Button>
            <Button leftSection={<IconPlayerPlay size={14} />}
              disabled={!canSubmit} loading={isPending} onClick={handleSubmit}>
              Launch job
            </Button>
          </Group>
        </Group>
      </Box>

      {/* Body */}
      <Box style={{ flex: 1, overflowY: 'auto' }}>
        <Group
          align="start" gap="lg" p="lg"
          style={{ maxWidth: 1400, margin: '0 auto', flexWrap: 'nowrap' }}
        >

          {/* ── Left: Form ─────────────────────────────────────────────────── */}
          <Stack style={{ flex: '1 1 0%', minWidth: 0 }}>

            {/* Run */}
            <SectionCard title="Run">
              <Group grow>
                <TextInput
                  label="Output name"
                  description="Used as filename of the saved LoRA"
                  value={form.output_name}
                  onChange={e => set('output_name', e.currentTarget.value)}
                  required placeholder="my_character_v1" size="sm"
                />
                <Select
                  label="Architecture"
                  data={ARCH_OPTIONS}
                  value={form.arch}
                  onChange={handleArchChange}
                  required size="sm" allowDeselect={false}
                />
              </Group>
            </SectionCard>

            {/* Dataset */}
            <SectionCard title="Dataset">
              <Group grow align="end">
                <Select
                  label="Dataset"
                  description="Managed dataset from /workspace/datasets/"
                  data={datasets.map(d => ({
                    value: d.name,
                    label: `${d.name}  (${d.imageCount} imgs, ${Math.round(d.captionCoverage * 100)}% captioned)`,
                  }))}
                  value={form.datasetRef}
                  onChange={v => set('datasetRef', v ?? '')}
                  required searchable placeholder="Select a dataset…" size="sm"
                />
                <NumberInput
                  label="Resolution"
                  value={form.resolution}
                  onChange={v => set('resolution', Number(v) || 1024)}
                  min={64} max={4096} step={64} size="sm" style={{ maxWidth: 130 }}
                />
              </Group>

              <Group grow align="end">
                <Switch
                  label="Aspect ratio bucketing"
                  description="Recommended for varied image sizes"
                  checked={form.enable_bucket}
                  onChange={e => set('enable_bucket', e.currentTarget.checked)} size="sm"
                />
                {form.enable_bucket && <>
                  <NumberInput label="Min bucket reso"
                    value={form.min_bucket_reso}
                    onChange={v => set('min_bucket_reso', Number(v) || 256)}
                    min={64} max={1024} step={64} size="sm" />
                  <NumberInput label="Max bucket reso"
                    value={form.max_bucket_reso}
                    onChange={v => set('max_bucket_reso', Number(v) || 2048)}
                    min={256} max={4096} step={64} size="sm" />
                </>}
              </Group>

              <Group grow align="end">
                <NumberInput
                  label="Num repeats" description="Dataset repeats per epoch"
                  value={form.num_repeats}
                  onChange={v => set('num_repeats', Number(v) || 1)}
                  min={1} max={100} size="sm" />
                <TextInput
                  label="Class tokens" description="Fallback when no caption file"
                  value={form.class_tokens}
                  onChange={e => set('class_tokens', e.currentTarget.value)}
                  placeholder="e.g. a woman" size="sm" />
              </Group>
            </SectionCard>

            {/* Model — all driven by ModelSelect from API */}
            <SectionCard title="Model">

              {/* Main checkpoint / DiT — present for all archs */}
              <ModelSelect
                label={
                  isFluxLike  ? 'FLUX / Chroma DiT'
                  : isSd3     ? 'SD3 / SD3.5 MMDiT'
                  : isAnima   ? 'Anima DiT'
                  : isLumina  ? 'Lumina DiT'
                  : isHunyuan ? 'HunyuanImage DiT'
                  : isSdxl    ? 'SDXL base checkpoint'
                  : 'Checkpoint'
                }
                required
                value={form.pretrained_model_name_or_path}
                onChange={v => set('pretrained_model_name_or_path', v)}
                models={mainModels}
              />

              {/* FLUX: CLIP-L, T5-XXL, AE */}
              {isFlux && <>
                <ModelSelect label="CLIP-L" required
                  value={form.clip_l} onChange={v => set('clip_l', v)} models={clipLModels} />
                <ModelSelect label="T5-XXL" required
                  value={form.t5xxl} onChange={v => set('t5xxl', v)} models={t5xxlModels} />
                <ModelSelect label="AutoEncoder (AE)" required
                  value={form.ae} onChange={v => set('ae', v)} models={aeModels} />
              </>}

              {/* Chroma: T5-XXL, AE (no CLIP-L) */}
              {isChroma && <>
                <ModelSelect label="T5-XXL" required
                  value={form.t5xxl} onChange={v => set('t5xxl', v)} models={t5xxlModels} />
                <ModelSelect label="AutoEncoder (AE)" required
                  value={form.ae} onChange={v => set('ae', v)} models={aeModels} />
              </>}

              {/* SD3: CLIP-L, CLIP-G, T5-XXL, VAE — all optional for single-file format */}
              {isSd3 && <>
                <ModelSelect label="CLIP-L (optional)"
                  value={form.clip_l} onChange={v => set('clip_l', v)} models={clipLModels} />
                <ModelSelect label="CLIP-G (optional)"
                  value={form.clip_g} onChange={v => set('clip_g', v)} models={clipGModels} />
                <ModelSelect label="T5-XXL (optional)"
                  value={form.t5xxl} onChange={v => set('t5xxl', v)} models={t5xxlModels} />
                <ModelSelect label="VAE (optional)"
                  value={form.vae} onChange={v => set('vae', v)} models={vaeModels} />
              </>}

              {/* SDXL: VAE optional */}
              {isSdxl && (
                <ModelSelect label="VAE (optional)"
                  description="Leave blank to use the VAE embedded in the checkpoint"
                  value={form.vae} onChange={v => set('vae', v)} models={vaeModels} />
              )}

              {/* Anima: Qwen3, VAE */}
              {isAnima && <>
                <ModelSelect label="Qwen3-0.6B" required
                  value={form.qwen3} onChange={v => set('qwen3', v)} models={qwen3Models} />
                <ModelSelect label="Qwen-Image VAE" required
                  value={form.vae} onChange={v => set('vae', v)} models={vaeModels} />
              </>}

              {/* Lumina: Gemma2, AE */}
              {isLumina && <>
                <ModelSelect label="Gemma2 text encoder" required
                  value={form.gemma2} onChange={v => set('gemma2', v)} models={gemma2Models} />
                <ModelSelect label="AutoEncoder (AE)" required
                  description="Lumina uses the same AE as FLUX"
                  value={form.ae} onChange={v => set('ae', v)} models={aeModels} />
              </>}

              {/* HunyuanImage: Qwen2.5-VL, byT5, VAE */}
              {isHunyuan && <>
                <ModelSelect label="Qwen2.5-VL text encoder" required
                  value={form.text_encoder} onChange={v => set('text_encoder', v)} models={qwen25VLModels} />
                <ModelSelect label="byT5 text encoder" required
                  value={form.byt5} onChange={v => set('byt5', v)} models={byt5Models} />
                <ModelSelect label="VAE" required
                  value={form.vae} onChange={v => set('vae', v)} models={vaeModels} />
              </>}

              {/* SD2: v_parameterization */}
              {isSd2 && (
                <Switch label="V-parameterization"
                  description="Enable for SD2 768-v and SD2.1-v models"
                  checked={form.v_parameterization}
                  onChange={e => set('v_parameterization', e.currentTarget.checked)} size="sm" />
              )}
            </SectionCard>

            {/* LoRA Network */}
            <SectionCard title="LoRA Network">
              <Group grow>
                <NumberInput label="Network dim (rank)" description="Higher = more capacity, more VRAM"
                  value={form.network_dim}
                  onChange={v => set('network_dim', Number(v) || 16)}
                  min={1} max={512} size="sm" />
                <NumberInput label="Network alpha" description="Scaling factor; commonly dim / 2"
                  value={form.network_alpha}
                  onChange={v => set('network_alpha', Number(v) || 1)}
                  min={0} max={512} step={0.5} decimalScale={2} size="sm" />
                <TextInput label="Network module"
                  value={trainPreview?.networkModule ?? '(auto from arch)'}
                  readOnly size="sm" c="dimmed"
                  styles={{ input: { fontSize: 12, fontFamily: 'monospace', cursor: 'not-allowed' } }} />
              </Group>
              {isHunyuan && (
                <Text size="xs" c="orange">
                  HunyuanImage: text encoder LoRA not supported — network_train_unet_only is locked to true.
                </Text>
              )}
            </SectionCard>

            {/* Training */}
            <SectionCard title="Training">
              <Group align="end">
                <Switch label="Train by steps instead of epochs"
                  checked={form.use_steps}
                  onChange={e => set('use_steps', e.currentTarget.checked)} size="sm" />
                {form.use_steps ? (
                  <NumberInput label="Max train steps"
                    value={form.max_train_steps}
                    onChange={v => set('max_train_steps', Number(v) || 1000)} min={1} size="sm" />
                ) : (
                  <NumberInput label="Max train epochs"
                    value={form.max_train_epochs}
                    onChange={v => set('max_train_epochs', Number(v) || 10)} min={1} size="sm" />
                )}
                <NumberInput label="Save every N epochs"
                  value={form.save_every_n_epochs}
                  onChange={v => set('save_every_n_epochs', Number(v) || 1)} min={1} size="sm" />
              </Group>

              <Divider label="Optimizer & LR" labelPosition="left" />

              <Group grow>
                <Select label="Optimizer" data={OPTIMIZERS} value={form.optimizer_type}
                  onChange={v => set('optimizer_type', v ?? 'AdamW8bit')} size="sm" allowDeselect={false} />
                <NumberInput label="Learning rate" value={form.learning_rate}
                  onChange={v => set('learning_rate', Number(v))}
                  min={0} step={1e-5} decimalScale={8} size="sm" />
              </Group>

              <Group grow>
                <NumberInput label="UNet / DiT LR" description="0 = uses learning_rate"
                  value={form.unet_lr} onChange={v => set('unet_lr', Number(v))}
                  min={0} step={1e-5} decimalScale={8} size="sm" />
                <NumberInput label="Text encoder LR" description="0 = uses learning_rate"
                  value={form.text_encoder_lr} onChange={v => set('text_encoder_lr', Number(v))}
                  min={0} step={1e-5} decimalScale={8} size="sm"
                  disabled={form.network_train_unet_only} />
              </Group>

              <Group grow>
                <Select label="LR scheduler" data={LR_SCHEDULERS} value={form.lr_scheduler}
                  onChange={v => set('lr_scheduler', v ?? 'cosine_with_restarts')} size="sm" allowDeselect={false} />
                <NumberInput label="Warmup steps" value={form.lr_warmup_steps}
                  onChange={v => set('lr_warmup_steps', Number(v))} min={0} size="sm" />
              </Group>
            </SectionCard>

            {/* Advanced */}
            <Accordion variant="separated" radius="md">
              <Accordion.Item value="advanced">
                <Accordion.Control icon={<IconChevronRight size={14} />}>
                  <Text size="sm" fw={500}>Advanced settings</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="sm">

                    <Group grow>
                      <Select label="Mixed precision"
                        data={[
                          { value: 'bf16', label: 'bf16 (recommended)' },
                          { value: 'fp16', label: 'fp16' },
                          { value: 'no',   label: 'fp32 (no mixed)' },
                        ]}
                        value={form.mixed_precision}
                        onChange={v => set('mixed_precision', (v ?? 'bf16') as NewJobForm['mixed_precision'])}
                        size="sm" allowDeselect={false} />
                      <Select label="Save precision"
                        data={[
                          { value: 'bf16',  label: 'bf16' },
                          { value: 'fp16',  label: 'fp16' },
                          { value: 'float', label: 'float32' },
                        ]}
                        value={form.save_precision}
                        onChange={v => set('save_precision', (v ?? 'bf16') as NewJobForm['save_precision'])}
                        size="sm" allowDeselect={false} />
                    </Group>

                    <Group wrap="wrap" gap="xs">
                      <Switch label="Gradient checkpointing"
                        checked={form.gradient_checkpointing}
                        onChange={e => set('gradient_checkpointing', e.currentTarget.checked)} size="sm" />
                      <Switch label="Cache latents"
                        checked={form.cache_latents}
                        onChange={e => set('cache_latents', e.currentTarget.checked)} size="sm" />
                      <Switch label="Cache latents to disk"
                        checked={form.cache_latents_to_disk}
                        onChange={e => set('cache_latents_to_disk', e.currentTarget.checked)} size="sm"
                        disabled={!form.cache_latents} />
                      <Switch label="Cache TE outputs"
                        checked={form.cache_text_encoder_outputs}
                        onChange={e => set('cache_text_encoder_outputs', e.currentTarget.checked)} size="sm" />
                      <Switch label="FP8 base"
                        checked={form.fp8_base}
                        onChange={e => set('fp8_base', e.currentTarget.checked)} size="sm"
                        disabled={isAnima || isHunyuan} />
                      <Tooltip label="Required for HunyuanImage" disabled={!isHunyuan}>
                        <Switch label="UNet / DiT only"
                          checked={form.network_train_unet_only}
                          onChange={e => set('network_train_unet_only', e.currentTarget.checked)} size="sm"
                          disabled={isHunyuan} />
                      </Tooltip>
                    </Group>

                    <Group grow>
                      <NumberInput label="Blocks to swap" description="CPU ↔ GPU block offload (0 = disabled)"
                        value={form.blocks_to_swap ?? 0}
                        onChange={v => set('blocks_to_swap', Number(v) > 0 ? Number(v) : null)}
                        min={0} max={40} size="sm" />
                      <NumberInput label="Seed" description="Leave blank for random"
                        value={form.seed ?? ''}
                        onChange={v => set('seed', v === '' ? null : Number(v))}
                        min={0} size="sm" placeholder="random" />
                    </Group>

                    {hasFlowArgs && <>
                      <Divider label="Flow matching" labelPosition="left" />
                      <Group grow>
                        <Select label="Timestep sampling"
                          data={TIMESTEP_SAMPLING_OPTIONS}
                          value={form.timestep_sampling}
                          onChange={v => set('timestep_sampling', v ?? 'sigmoid')}
                          size="sm" allowDeselect={false} />
                        {isFluxLike && (
                          <NumberInput label="Guidance scale"
                            description={isChroma ? 'Locked at 0.0 for Chroma' : 'Use 1.0 for training'}
                            value={form.guidance_scale}
                            onChange={v => set('guidance_scale', Number(v))}
                            min={0} max={20} step={0.5} decimalScale={2} size="sm"
                            disabled={isChroma} />
                        )}
                      </Group>
                      {isFlux && (
                        <Switch label="Apply T5 attention mask"
                          description="Not recommended for FLUX (limited inference support)"
                          checked={form.apply_t5_attn_mask}
                          onChange={e => set('apply_t5_attn_mask', e.currentTarget.checked)} size="sm" />
                      )}
                    </>}

                    <Divider label="Output" labelPosition="left" />
                    <TextInput label="Output directory override"
                      description="Leave blank to use /workspace/outputs"
                      value={form.output_dir}
                      onChange={e => set('output_dir', e.currentTarget.value)}
                      placeholder="/workspace/outputs"
                      size="sm" ff="monospace" styles={{ input: { fontSize: 12 } }} />

                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>

          </Stack>

          {/* ── Right: TOML Preview (sticky) ──────────────────────────────── */}
          <Box
            style={{
              flex: '0 0 400px', position: 'sticky',
              top: 'var(--mantine-spacing-lg)',
              maxHeight: 'calc(100vh - 120px)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            <Paper withBorder radius="md"
              style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Tabs defaultValue="train"
                style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Tabs.List px="sm" pt="xs">
                  <Tabs.Tab value="train" leftSection={<IconBolt size={12} />}>
                    Train TOML
                    {previewLoading && (
                      <Text span size="xs" c="dimmed" ml={4}>
                        <IconRefresh size={10} style={{ animation: 'spin 1s linear infinite' }} />
                      </Text>
                    )}
                  </Tabs.Tab>
                  <Tabs.Tab value="dataset">Dataset TOML</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="train"
                  style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <ScrollArea style={{ flex: 1 }} p="xs">
                    <Code block style={{
                      fontSize: 11, lineHeight: 1.55,
                      background: 'transparent', whiteSpace: 'pre',
                      color: trainPreviewError ? 'var(--mantine-color-red-6)' : undefined,
                    }}>
                      {trainTomlContent}
                    </Code>
                  </ScrollArea>
                </Tabs.Panel>

                <Tabs.Panel value="dataset"
                  style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <ScrollArea style={{ flex: 1 }} p="xs">
                    <Code block style={{ fontSize: 11, lineHeight: 1.55, background: 'transparent', whiteSpace: 'pre' }}>
                      {datasetPreview?.toml ?? '# Select a dataset to preview…'}
                    </Code>
                  </ScrollArea>
                </Tabs.Panel>
              </Tabs>
            </Paper>
          </Box>

        </Group>
      </Box>
    </Stack>
  )
}