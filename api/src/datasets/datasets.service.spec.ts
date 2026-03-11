import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DatasetsService } from './datasets.service';
import { PathsConfig } from '../config/paths.config';
import { CAPTION_LENGTH_THRESHOLDS } from './types/dataset-info.types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPathsConfig = { datasets: '/tmp/test-datasets' };

const mockFs = {
  readdir: jest.fn(),
  stat: jest.fn(),
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn(),
  unlink: jest.fn().mockResolvedValue(undefined),
  rm: jest.fn().mockResolvedValue(undefined),
  access: jest.fn().mockResolvedValue(undefined),
};
jest.mock('fs/promises', () => mockFs);

const mockFsSync = {
  existsSync: jest.fn().mockReturnValue(false),
  createWriteStream: jest.fn(),
};
jest.mock('fs', () => mockFsSync);

jest.mock('unzipper', () => ({
  Open: {
    buffer: jest.fn().mockResolvedValue({
      files: [
        {
          type: 'File',
          path: 'img_001.jpg',
          stream: jest.fn().mockReturnValue({ pipe: jest.fn(), on: jest.fn() }),
        },
        {
          type: 'File',
          path: 'img_001.txt',
          stream: jest.fn().mockReturnValue({ pipe: jest.fn(), on: jest.fn() }),
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

jest.mock('stream/promises', () => ({
  pipeline: jest.fn().mockResolvedValue(undefined),
}));

// archiver is only used by exportZip — not tested here (requires live stream)
jest.mock('archiver', () => () => ({
  pipe: jest.fn(),
  directory: jest.fn(),
  finalize: jest.fn().mockResolvedValue(undefined),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockExistingDataset(files: string[] = ['cat.jpg', 'cat.txt', 'dog.png']) {
  mockFs.stat.mockResolvedValue({
    isDirectory: () => true,
    mtime: new Date('2025-06-01'),
    size: 1024,
  });
  mockFs.readdir.mockResolvedValue(files);
  // readFile for captions and meta
  mockFs.readFile.mockImplementation((p: string) => {
    if (p.endsWith('cat.txt')) return Promise.resolve('fluffy cat');
    if (p.endsWith('dataset.meta.json')) return Promise.reject({ code: 'ENOENT' });
    return Promise.reject({ code: 'ENOENT' });
  });
}

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
      expect(await service.list()).toEqual([]);
    });

    it('returns summaries for dataset directories', async () => {
      mockFs.readdir
        .mockResolvedValueOnce(['my_char'])
        .mockResolvedValueOnce(['img_001.jpg', 'img_001.txt']);
      mockFs.stat.mockResolvedValue({
        isDirectory: () => true,
        mtime: new Date('2025-01-01'),
      });
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' }); // no meta

      const result = await service.list();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('my_char');
      expect(result[0].imageCount).toBe(1);
      expect(result[0].captionedCount).toBe(1);
      expect(result[0].captionCoverage).toBe(1);
      expect(result[0].meta).toBeNull();
    });

    it('skips non-directory entries', async () => {
      mockFs.readdir.mockResolvedValue(['some_file.txt']);
      mockFs.stat.mockResolvedValue({ isDirectory: () => false, mtime: new Date() });
      expect(await service.list()).toEqual([]);
    });
  });

  // ── getOne ──────────────────────────────────────────────────────────────────

  describe('getOne', () => {
    it('throws NotFoundException for missing dataset', async () => {
      mockFs.stat.mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }));
      await expect(service.getOne('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('returns dataset detail with image list and captionStats', async () => {
      mockExistingDataset();

      const detail = await service.getOne('pets');
      expect(detail.name).toBe('pets');
      expect(detail.imageCount).toBe(2);
      expect(detail.captionedCount).toBe(1);
      expect(detail.captionCoverage).toBeCloseTo(0.5);
      expect(detail.images).toHaveLength(2);
      expect(detail.captionLengthSummary).not.toBeNull();

      const catImage = detail.images.find(i => i.filename === 'cat.jpg')!;
      expect(catImage.hasCaption).toBe(true);
      expect(catImage.captionStats).not.toBeNull();
      expect(catImage.captionStats!.charCount).toBe('fluffy cat'.length);

      const dogImage = detail.images.find(i => i.filename === 'dog.png')!;
      expect(dogImage.hasCaption).toBe(false);
      expect(dogImage.captionStats).toBeNull();
    });

    it('captionLengthSummary is null when no captions present', async () => {
      mockFs.stat.mockResolvedValue({
        isDirectory: () => true,
        mtime: new Date(),
        size: 0,
      });
      mockFs.readdir.mockResolvedValue(['img.jpg']);
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });

      const detail = await service.getOne('empty');
      expect(detail.captionLengthSummary).toBeNull();
    });
  });

  // ── computeCaptionStats ──────────────────────────────────────────────────────

  describe('computeCaptionStats', () => {
    it('returns correct counts for a short caption', () => {
      const stats = service.computeCaptionStats('fluffy cat');
      expect(stats.charCount).toBe(10);
      expect(stats.wordCount).toBe(2);
      expect(stats.isLongForClip).toBe(false);
      expect(stats.isLongForT5).toBe(false);
    });

    it('flags isLongForClip when charCount exceeds threshold', () => {
      const longText = 'a'.repeat(CAPTION_LENGTH_THRESHOLDS.CLIP + 1);
      const stats = service.computeCaptionStats(longText);
      expect(stats.isLongForClip).toBe(true);
      expect(stats.isLongForT5).toBe(false);
    });

    it('flags both when charCount exceeds T5 threshold', () => {
      const longText = 'a'.repeat(CAPTION_LENGTH_THRESHOLDS.T5 + 1);
      const stats = service.computeCaptionStats(longText);
      expect(stats.isLongForClip).toBe(true);
      expect(stats.isLongForT5).toBe(true);
    });

    it('returns zero counts for empty string', () => {
      const stats = service.computeCaptionStats('');
      expect(stats.charCount).toBe(0);
      expect(stats.wordCount).toBe(0);
    });
  });

  // ── uploadZip ───────────────────────────────────────────────────────────────

  describe('uploadZip', () => {
    it('throws ConflictException if dir exists and overwrite=false', async () => {
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
      mockFsSync.createWriteStream.mockReturnValue({
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      });
      mockFs.stat.mockResolvedValue({
        isDirectory: () => true,
        mtime: new Date(),
        size: 512,
      });
      mockFs.readdir.mockResolvedValue(['img_001.jpg', 'img_001.txt']);
      mockFs.readFile.mockImplementation((p: string) => {
        if (p.endsWith('img_001.txt')) return Promise.resolve('a cat');
        return Promise.reject({ code: 'ENOENT' });
      });

      const result = await service.uploadZip('my_char', Buffer.from('fake-zip'));
      expect(result.name).toBe('my_char');
      expect(result.imageCount).toBe(1);
      expect(result.captionCount).toBe(1);
    });
  });

  // ── upsertCaption ────────────────────────────────────────────────────────────

  describe('upsertCaption', () => {
    it('throws NotFoundException for unknown dataset', async () => {
      mockFs.stat.mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }));
      await expect(
        service.upsertCaption('missing', 'img.jpg', 'text'),
      ).rejects.toThrow(NotFoundException);
    });

    it('writes caption file and returns captionStats', async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => true, mtime: new Date() });
      mockFs.access.mockResolvedValue(undefined);

      const result = await service.upsertCaption('my_char', 'cat.jpg', 'a fluffy cat');
      expect(result.captionPath).toContain('cat.txt');
      expect(result.captionStats.charCount).toBe('a fluffy cat'.length);
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

  // ── deleteCaption ────────────────────────────────────────────────────────────

  describe('deleteCaption', () => {
    it('deletes the caption file and returns deleted: true', async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => true, mtime: new Date() });
      const result = await service.deleteCaption('my_char', 'cat.jpg');
      expect(result.deleted).toBe(true);
      expect(mockFs.unlink).toHaveBeenCalledWith(
        expect.stringContaining('cat.txt'),
      );
    });

    it('returns deleted: false when caption is already absent', async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => true, mtime: new Date() });
      mockFs.unlink.mockRejectedValueOnce(
        Object.assign(new Error(), { code: 'ENOENT' }),
      );
      const result = await service.deleteCaption('my_char', 'cat.jpg');
      expect(result.deleted).toBe(false);
    });
  });

  // ── deleteImage ──────────────────────────────────────────────────────────────

  describe('deleteImage', () => {
    it('deletes image and companion caption', async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => true, mtime: new Date() });
      mockFs.access.mockResolvedValue(undefined);

      const result = await service.deleteImage('my_char', 'cat.jpg');
      expect(result.deleted).toContain('cat.jpg');
      expect(result.captionDeleted).toBe(true);
    });

    it('throws NotFoundException for unknown image', async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => true, mtime: new Date() });
      mockFs.access.mockRejectedValue(
        Object.assign(new Error(), { code: 'ENOENT' }),
      );
      await expect(
        service.deleteImage('my_char', 'ghost.jpg'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for non-image filename', async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => true, mtime: new Date() });
      await expect(
        service.deleteImage('my_char', 'readme.pdf'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── prependToken ────────────────────────────────────────────────────────────

  describe('prependToken', () => {
    it('prepends token in tag_list mode', async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => true, mtime: new Date() });
      mockFs.readdir.mockResolvedValue(['cat.jpg', 'dog.png']);
      mockFs.readFile.mockResolvedValue('fluffy animal');

      const result = await service.prependToken(
        'my_char',
        'my_token',
        'tag_list',
        false,
      );

      expect(result.updated).toBe(2);
      expect(result.missing).toBe(0);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        'my_token, fluffy animal',
        'utf8',
      );
    });

    it('skips captions already starting with token when skipExisting=true', async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => true, mtime: new Date() });
      mockFs.readdir.mockResolvedValue(['cat.jpg']);
      mockFs.readFile.mockResolvedValue('my_token, existing caption');

      const result = await service.prependToken(
        'my_char',
        'my_token',
        'tag_list',
        true,
      );

      expect(result.skipped).toBe(1);
      expect(result.updated).toBe(0);
    });

    it('counts missing when no caption file exists', async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => true, mtime: new Date() });
      mockFs.readdir.mockResolvedValue(['cat.jpg']);
      mockFs.readFile.mockRejectedValue(
        Object.assign(new Error(), { code: 'ENOENT' }),
      );

      const result = await service.prependToken(
        'my_char',
        'my_token',
        'tag_list',
        true,
      );

      expect(result.missing).toBe(1);
      expect(result.updated).toBe(0);
    });

    it('throws BadRequestException for empty token', async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => true, mtime: new Date() });
      await expect(
        service.prependToken('my_char', '  ', 'tag_list', true),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── updateMeta ───────────────────────────────────────────────────────────────

  describe('updateMeta', () => {
    it('creates meta with defaults when meta file absent', async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => true, mtime: new Date() });
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' }); // no existing meta

      const result = await service.updateMeta('my_char', {
        activationToken: 'tok',
      });

      expect(result.activationToken).toBe('tok');
      expect(result.captionType).toBe('unknown');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('dataset.meta.json'),
        expect.stringContaining('"activationToken": "tok"'),
        'utf8',
      );
    });

    it('merges into existing meta', async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => true, mtime: new Date() });
      mockFs.readFile.mockResolvedValue(
        JSON.stringify({
          activationToken: 'old_tok',
          captionType: 'tag_list',
          notes: '',
          createdAt: '2025-01-01T00:00:00.000Z',
        }),
      );

      const result = await service.updateMeta('my_char', { notes: 'updated' });
      expect(result.activationToken).toBe('old_tok');
      expect(result.notes).toBe('updated');
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('throws NotFoundException for unknown dataset', async () => {
      mockFs.stat.mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }));
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