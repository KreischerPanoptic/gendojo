import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DatasetsService } from './datasets.service';
import { PathsConfig } from '../config/paths.config';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPathsConfig = {
  datasets: '/tmp/test-datasets',
};

// Patch fs/promises
const mockFs = {
  readdir: jest.fn(),
  stat: jest.fn(),
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  rm: jest.fn().mockResolvedValue(undefined),
  access: jest.fn().mockResolvedValue(undefined),
};
jest.mock('fs/promises', () => mockFs);

// Patch fs (sync)
const mockFsSync = {
  existsSync: jest.fn().mockReturnValue(false),
  createWriteStream: jest.fn(),
};
jest.mock('fs', () => mockFsSync);

// Patch unzipper
jest.mock('unzipper', () => ({
  Open: {
    buffer: jest.fn().mockResolvedValue({
      files: [
        {
          type: 'File',
          path: 'img_001.jpg',
          stream: jest.fn().mockReturnValue({
            pipe: jest.fn(),
            on: jest.fn(),
          }),
        },
        {
          type: 'File',
          path: 'img_001.txt',
          stream: jest.fn().mockReturnValue({
            pipe: jest.fn(),
            on: jest.fn(),
          }),
        },
        {
          type: 'File',
          path: '__MACOSX/.DS_Store',
          stream: jest.fn(),
        },
      ],
    }),
  },
}));

// Patch stream/promises
jest.mock('stream/promises', () => ({
  pipeline: jest.fn().mockResolvedValue(undefined),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DatasetsService', () => {
  let service: DatasetsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatasetsService,
        { provide: PathsConfig, useValue: mockPathsConfig },
      ],
    }).compile();

    service = module.get<DatasetsService>(DatasetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── list ────────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns empty array when datasets root is empty', async () => {
      mockFs.readdir.mockResolvedValue([]);
      const result = await service.list();
      expect(result).toEqual([]);
    });

    it('returns summaries for dataset directories', async () => {
      mockFs.readdir
        .mockResolvedValueOnce(['my_char'])                      // root scan
        .mockResolvedValueOnce(['img_001.jpg', 'img_001.txt']);  // my_char scan

      mockFs.stat.mockResolvedValue({
        isDirectory: () => true,
        mtime: new Date('2025-01-01'),
      });

      const result = await service.list();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('my_char');
      expect(result[0].imageCount).toBe(1);
      expect(result[0].captionedCount).toBe(1);
      expect(result[0].captionCoverage).toBe(1);
    });

    it('skips non-directory entries', async () => {
      mockFs.readdir.mockResolvedValue(['some_file.txt']);
      mockFs.stat.mockResolvedValue({ isDirectory: () => false, mtime: new Date() });
      const result = await service.list();
      expect(result).toEqual([]);
    });
  });

  // ── getOne ──────────────────────────────────────────────────────────────────

  describe('getOne', () => {
    it('throws NotFoundException for missing dataset', async () => {
      const err = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      mockFs.stat.mockRejectedValue(err);

      await expect(service.getOne('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('returns dataset detail with image list', async () => {
      mockFs.stat.mockResolvedValue({
        isDirectory: () => true,
        mtime: new Date('2025-06-01'),
        size: 1024,
      });
      mockFs.readdir.mockResolvedValue(['cat.jpg', 'cat.txt', 'dog.png']);

      const detail = await service.getOne('pets');
      expect(detail.name).toBe('pets');
      expect(detail.imageCount).toBe(2);
      expect(detail.captionedCount).toBe(1); // only cat has a .txt
      expect(detail.captionCoverage).toBeCloseTo(0.5);
      expect(detail.images).toHaveLength(2);
    });
  });

  // ── uploadZip ───────────────────────────────────────────────────────────────

  describe('uploadZip', () => {
    it('throws ConflictException if dir exists and overwrite is false', async () => {
      mockFsSync.existsSync.mockReturnValue(true);
      await expect(
        service.uploadZip('existing', Buffer.from(''), false),
      ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException for invalid name', async () => {
      await expect(
        service.uploadZip('../hack', Buffer.from('')),
      ).rejects.toThrow(BadRequestException);
    });

    it('extracts images and captions, skips junk', async () => {
      mockFsSync.existsSync.mockReturnValue(false);
      mockFsSync.createWriteStream.mockReturnValue({ on: jest.fn(), write: jest.fn(), end: jest.fn() });

      // After extraction, getOne will be called — mock its reads
      mockFs.stat.mockResolvedValue({
        isDirectory: () => true,
        mtime: new Date(),
        size: 512,
      });
      mockFs.readdir.mockResolvedValue(['img_001.jpg', 'img_001.txt']);

      const result = await service.uploadZip('my_char', Buffer.from('fake-zip'));
      expect(result.name).toBe('my_char');
      expect(result.imageCount).toBe(1);
      expect(result.captionCount).toBe(1);
    });
  });

  // ── upsertCaption ────────────────────────────────────────────────────────────

  describe('upsertCaption', () => {
    it('throws NotFoundException for unknown dataset', async () => {
      const err = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      mockFs.stat.mockRejectedValue(err);

      await expect(
        service.upsertCaption('missing', 'img.jpg', 'text'),
      ).rejects.toThrow(NotFoundException);
    });

    it('writes caption file next to image', async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => true, mtime: new Date() });
      mockFs.access.mockResolvedValue(undefined);

      const result = await service.upsertCaption('my_char', 'cat.jpg', 'a fluffy cat');
      expect(result.captionPath).toContain('cat.txt');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('cat.txt'),
        'a fluffy cat',
        'utf8',
      );
    });

    it('throws BadRequestException for non-image filename', async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => true, mtime: new Date() });
      await expect(
        service.upsertCaption('my_char', 'readme.pdf', 'text'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('throws NotFoundException for unknown dataset', async () => {
      const err = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      mockFs.stat.mockRejectedValue(err);

      await expect(service.remove('ghost')).rejects.toThrow(NotFoundException);
    });

    it('calls fs.rm with recursive:true', async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => true, mtime: new Date() });
      const result = await service.remove('my_char');

      expect(result.deleted).toBe(true);
      expect(mockFs.rm).toHaveBeenCalledWith(
        expect.stringContaining('my_char'),
        { recursive: true, force: true },
      );
    });
  });
});