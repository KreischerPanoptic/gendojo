import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { JobStatus } from './entities/jobs.types';
import { PathsConfig } from '../config/paths.config';
import { TomlService } from '../toml/toml.service';
import { DatasetsService } from '../datasets/datasets.service';
import { NotFoundException } from '@nestjs/common';
import type { CreateJobDto } from './entities/jobs.types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPathsConfig = {
  models: '/tmp/models',
  datasets: '/tmp/datasets',
  outputs: '/tmp/outputs',
  logs: '/tmp/logs',
  sdScripts: '/tmp/sd-scripts',
  accelerateConfig: '/tmp/accelerate.yaml',
  jobDir:      (id: string) => `/tmp/logs/jobs/${id}`,
  jobTempDir:  (id: string) => `/tmp/logs/jobs/${id}/tmp`,
  datasetToml: (id: string) => `/tmp/logs/jobs/${id}/dataset.toml`,
  trainToml:   (id: string) => `/tmp/logs/jobs/${id}/train.toml`,
};

const mockTomlService = {
  getTrainScript:        jest.fn().mockReturnValue('flux_train_network.py'),
  getDefaultNetworkModule: jest.fn().mockReturnValue('networks.lora_flux'),
  generateDatasetToml:   jest.fn().mockReturnValue('[general]\n'),
  generateTrainToml:     jest.fn().mockReturnValue('output_name = "test"\n'),
};

const mockDatasetsService = {
  getOne: jest.fn().mockResolvedValue({
    name: 'my_char',
    path: '/tmp/datasets/my_char',
    imageCount: 20,
    captionedCount: 20,
    captionCoverage: 1.0,
    updatedAt: new Date().toISOString(),
    images: [],
  }),
};

const mockSettingsService = {
  getTraining: jest.fn().mockReturnValue({
    maxConcurrentJobs: 1,
    logBufferSize: 2000,
    cpuThreadsPerProcess: 1,
  }),
};

jest.mock('../toml/train-config.validator', () => ({
  validateTrainConfig: jest.fn().mockReturnValue({ valid: true, errors: [] }),
}));

jest.mock('fs/promises', () => ({
  mkdir:     jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

const mockWriteStream = { write: jest.fn(), end: jest.fn() };
jest.mock('fs', () => ({
  createWriteStream: jest.fn().mockReturnValue(mockWriteStream),
}));

const mockStdout = { setEncoding: jest.fn(), on: jest.fn() };
const mockStderr = { setEncoding: jest.fn(), on: jest.fn() };
const mockProc: Partial<import('child_process').ChildProcess> & { pid: number } = {
  pid:    12345,
  stdout: mockStdout as unknown as import('child_process').ChildProcess['stdout'],
  stderr: mockStderr as unknown as import('child_process').ChildProcess['stderr'],
  kill:   jest.fn(),
  on:     jest.fn(),
};
jest.mock('child_process', () => ({ spawn: jest.fn().mockReturnValue(mockProc) }));

// ─── DTO factories ────────────────────────────────────────────────────────────

const makeRefDto = (overrides: Partial<{ datasetRef: string; class_tokens: string }> = {}): CreateJobDto => ({
  train: {
    arch: 'flux',
    pretrained_model_name_or_path: '/models/flux.safetensors',
    clip_l:  '/models/clip_l.safetensors',
    t5xxl:   '/models/t5xxl.safetensors',
    ae:      '/models/ae.safetensors',
    dataset_config: '',
    output_dir:  '/workspace/outputs',
    output_name: 'test_lora',
    network_dim: 16,
    learning_rate: 1e-4,
    optimizer_type: 'AdamW8bit',
    max_train_epochs: 10,
    guidance_scale: 1.0,
    network_train_unet_only: true,
  },
  datasetRef: overrides.datasetRef ?? 'my_char',
  datasetOptions: {
    resolution: 1024,
    enable_bucket: true,
  },
});

const makeFullDto = (): CreateJobDto => ({
  train: {
    arch: 'flux',
    pretrained_model_name_or_path: '/models/flux.safetensors',
    clip_l:  '/models/clip_l.safetensors',
    t5xxl:   '/models/t5xxl.safetensors',
    ae:      '/models/ae.safetensors',
    dataset_config: '',
    output_dir:  '/workspace/outputs',
    output_name: 'test_lora',
    network_dim: 16,
    learning_rate: 1e-4,
    optimizer_type: 'AdamW8bit',
    max_train_epochs: 10,
    guidance_scale: 1.0,
    network_train_unet_only: true,
  },
  dataset: {
    datasets: [
      {
        resolution: 1024,
        batch_size: 1,
        subsets: [{ image_dir: '/datasets/mychar', num_repeats: 10 }],
      },
    ],
  },
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('JobsService', () => {
  let service: JobsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: PathsConfig,      useValue: mockPathsConfig },
        { provide: TomlService,      useValue: mockTomlService },
        { provide: DatasetsService,  useValue: mockDatasetsService },
        { provide: 'SettingsService', useValue: mockSettingsService },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ── datasetRef mode ──────────────────────────────────────────────────────────

  describe('create (datasetRef mode)', () => {
    it('resolves dataset by name and starts the job', async () => {
      const job = await service.create(makeRefDto());
      expect(job.status).toBe(JobStatus.Running);
      expect(job.datasetName).toBe('my_char');
      expect(mockDatasetsService.getOne).toHaveBeenCalledWith('my_char');
    });

    it('calls generateDatasetToml with auto-built DTO containing resolved image_dir', async () => {
      await service.create(makeRefDto());
      const dtoCalled = (mockTomlService.generateDatasetToml as jest.Mock).mock.calls[0][0];
      expect(dtoCalled.datasets[0].subsets[0].image_dir).toBe('/tmp/datasets/my_char');
    });

    it('applies resolution and enable_bucket from datasetOptions', async () => {
      await service.create(makeRefDto());
      const dto = (mockTomlService.generateDatasetToml as jest.Mock).mock.calls[0][0];
      expect(dto.datasets[0].resolution).toBe(1024);
      expect(dto.datasets[0].enable_bucket).toBe(true);
    });

    it('throws 422 when dataset does not exist', async () => {
      mockDatasetsService.getOne.mockRejectedValueOnce(
        new NotFoundException('Dataset "ghost" not found'),
      );
      await expect(service.create(makeRefDto({ datasetRef: 'ghost' }))).rejects.toMatchObject({
        statusCode: 422,
      });
    });

    it('throws 422 when dataset has no images', async () => {
      mockDatasetsService.getOne.mockResolvedValueOnce({
        name: 'empty',
        path: '/tmp/datasets/empty',
        imageCount: 0,
        captionedCount: 0,
        captionCoverage: 0,
        updatedAt: new Date().toISOString(),
        images: [],
      });
      await expect(service.create(makeRefDto({ datasetRef: 'empty' }))).rejects.toMatchObject({
        statusCode: 422,
      });
    });

    it('logs a warning when caption coverage < 100%', async () => {
      mockDatasetsService.getOne.mockResolvedValueOnce({
        name: 'partial',
        path: '/tmp/datasets/partial',
        imageCount: 10,
        captionedCount: 7,
        captionCoverage: 0.7,
        updatedAt: new Date().toISOString(),
        images: [],
      });
      const warnSpy = jest.spyOn(service['logger'], 'warn');
      await service.create(makeRefDto({ datasetRef: 'partial' }));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('3/10 images have no caption'));
    });
  });

  // ── full dataset DTO mode ────────────────────────────────────────────────────

  describe('create (full dataset mode)', () => {
    it('passes dataset DTO through without calling DatasetsService', async () => {
      const job = await service.create(makeFullDto());
      expect(job.status).toBe(JobStatus.Running);
      expect(job.datasetName).toBeUndefined();
      expect(mockDatasetsService.getOne).not.toHaveBeenCalled();
    });

    it('passes the provided dataset DTO unchanged to generateDatasetToml', async () => {
      const dto = makeFullDto();
      await service.create(dto);
      const called = (mockTomlService.generateDatasetToml as jest.Mock).mock.calls[0][0];
      expect(called).toEqual((dto as Extract<typeof dto, { dataset: unknown }>).dataset);
    });
  });

  // ── shared create behaviour ──────────────────────────────────────────────────

  describe('create (shared)', () => {
    it('throws 409 when max concurrent jobs reached', async () => {
      await service.create(makeRefDto());
      await expect(service.create(makeRefDto())).rejects.toMatchObject({ statusCode: 409 });
    });

    it('throws 422 when train config validation fails', async () => {
      const { validateTrainConfig } = await import('../toml/train-config.validator');
      (validateTrainConfig as jest.Mock).mockReturnValueOnce({
        valid: false,
        errors: [{ field: 'clip_l', message: 'required for FLUX' }],
      });
      await expect(service.create(makeRefDto())).rejects.toMatchObject({ statusCode: 422 });
    });

    it('writes dataset.toml and train.toml', async () => {
      const fsMock = await import('fs/promises');
      await service.create(makeRefDto());
      const calls = (fsMock.writeFile as jest.Mock).mock.calls as [string, string][];
      expect(calls.some(c => c[0].includes('dataset.toml'))).toBe(true);
      expect(calls.some(c => c[0].includes('train.toml'))).toBe(true);
    });

    it('command includes accelerate launch and train.toml path', async () => {
      const job = await service.create(makeRefDto());
      expect(job.command).toContain('accelerate launch');
      expect(job.command).toContain(mockPathsConfig.accelerateConfig);
      expect(job.command).toContain('train.toml');
    });
  });

  // ── list / getById / getLogs / kill ──────────────────────────────────────────

  describe('list', () => {
    it('returns empty array initially', () => expect(service.list()).toEqual([]));

    it('lists jobs without logBuffer', async () => {
      await service.create(makeRefDto());
      const jobs = service.list();
      expect(jobs).toHaveLength(1);
      expect((jobs[0] as unknown as { logBuffer?: unknown }).logBuffer).toBeUndefined();
    });
  });

  describe('getById', () => {
    it('returns undefined for unknown id', () => expect(service.getById('x')).toBeUndefined());

    it('returns detail with logBuffer', async () => {
      const created = await service.create(makeRefDto());
      const found = service.getById(created.id);
      expect(Array.isArray(found!.logBuffer)).toBe(true);
    });
  });

  describe('kill', () => {
    it('returns false for unknown id', async () => expect(await service.kill('x')).toBe(false));

    it('sends SIGTERM to running process', async () => {
      const created = await service.create(makeRefDto());
      jest.useFakeTimers();
      const p = service.kill(created.id);
      jest.runAllTimers();
      jest.useRealTimers();
      await p;
      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');
    });
  });
});