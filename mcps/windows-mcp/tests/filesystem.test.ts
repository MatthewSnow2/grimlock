import * as fs from 'fs/promises';
import * as path from 'path';
import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import {
  listDirectory,
  readFile,
  writeFile,
  copyFile,
  moveFile,
  deleteFile,
} from '../src/tools/filesystem.js';

const TEST_DIR = path.join(process.cwd(), 'test-temp');

describe('Filesystem Tools', () => {
  beforeAll(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  describe('listDirectory', () => {
    beforeEach(async () => {
      await fs.mkdir(path.join(TEST_DIR, 'listdir'), { recursive: true });
      await fs.writeFile(path.join(TEST_DIR, 'listdir', 'file1.txt'), 'content1');
      await fs.writeFile(path.join(TEST_DIR, 'listdir', 'file2.txt'), 'content2');
      await fs.writeFile(path.join(TEST_DIR, 'listdir', 'image.png'), 'fake image');
      await fs.mkdir(path.join(TEST_DIR, 'listdir', 'subdir'), { recursive: true });
      await fs.writeFile(path.join(TEST_DIR, 'listdir', 'subdir', 'nested.txt'), 'nested');
    });

    afterEach(async () => {
      await fs.rm(path.join(TEST_DIR, 'listdir'), { recursive: true, force: true });
    });

    it('should list all files in a directory', async () => {
      const result = await listDirectory(path.join(TEST_DIR, 'listdir'));
      expect(result.items.length).toBe(4);
      expect(result.items.map(i => i.name)).toContain('file1.txt');
      expect(result.items.map(i => i.name)).toContain('file2.txt');
      expect(result.items.map(i => i.name)).toContain('image.png');
      expect(result.items.map(i => i.name)).toContain('subdir');
    });

    it('should filter files by extension', async () => {
      const result = await listDirectory(path.join(TEST_DIR, 'listdir'), '*.txt');
      const files = result.items.filter(i => i.type === 'file');
      expect(files.every(f => f.name.endsWith('.txt'))).toBe(true);
    });

    it('should list recursively when requested', async () => {
      const result = await listDirectory(path.join(TEST_DIR, 'listdir'), undefined, true);
      expect(result.items.map(i => i.name)).toContain('nested.txt');
    });

    it('should throw error for non-existent path', async () => {
      await expect(listDirectory('/nonexistent/path')).rejects.toThrow('Path not found');
    });

    it('should throw error for file path', async () => {
      await expect(listDirectory(path.join(TEST_DIR, 'listdir', 'file1.txt'))).rejects.toThrow('not a directory');
    });
  });

  describe('readFile', () => {
    beforeEach(async () => {
      await fs.writeFile(path.join(TEST_DIR, 'readable.txt'), 'Hello, World!');
    });

    afterEach(async () => {
      await fs.rm(path.join(TEST_DIR, 'readable.txt'), { force: true });
    });

    it('should read file contents', async () => {
      const content = await readFile(path.join(TEST_DIR, 'readable.txt'));
      expect(content).toBe('Hello, World!');
    });

    it('should throw error for non-existent file', async () => {
      await expect(readFile('/nonexistent/file.txt')).rejects.toThrow('File not found');
    });

    it('should throw error for directory', async () => {
      await expect(readFile(TEST_DIR)).rejects.toThrow('directory');
    });
  });

  describe('writeFile', () => {
    afterEach(async () => {
      await fs.rm(path.join(TEST_DIR, 'writable.txt'), { force: true });
    });

    it('should write content to a new file', async () => {
      const result = await writeFile(path.join(TEST_DIR, 'writable.txt'), 'Test content');
      expect(result.bytesWritten).toBeGreaterThan(0);
      const content = await fs.readFile(path.join(TEST_DIR, 'writable.txt'), 'utf8');
      expect(content).toBe('Test content');
    });

    it('should overwrite existing file', async () => {
      await writeFile(path.join(TEST_DIR, 'writable.txt'), 'Original');
      await writeFile(path.join(TEST_DIR, 'writable.txt'), 'Overwritten');
      const content = await fs.readFile(path.join(TEST_DIR, 'writable.txt'), 'utf8');
      expect(content).toBe('Overwritten');
    });

    it('should append to file when append=true', async () => {
      await writeFile(path.join(TEST_DIR, 'writable.txt'), 'First');
      await writeFile(path.join(TEST_DIR, 'writable.txt'), ' Second', true);
      const content = await fs.readFile(path.join(TEST_DIR, 'writable.txt'), 'utf8');
      expect(content).toBe('First Second');
    });

    it('should create parent directories', async () => {
      const nestedPath = path.join(TEST_DIR, 'nested', 'deep', 'file.txt');
      await writeFile(nestedPath, 'Nested content');
      const content = await fs.readFile(nestedPath, 'utf8');
      expect(content).toBe('Nested content');
      await fs.rm(path.join(TEST_DIR, 'nested'), { recursive: true, force: true });
    });
  });

  describe('copyFile', () => {
    beforeEach(async () => {
      await fs.writeFile(path.join(TEST_DIR, 'source.txt'), 'Source content');
    });

    afterEach(async () => {
      await fs.rm(path.join(TEST_DIR, 'source.txt'), { force: true });
      await fs.rm(path.join(TEST_DIR, 'destination.txt'), { force: true });
      await fs.rm(path.join(TEST_DIR, 'sourcedir'), { recursive: true, force: true });
      await fs.rm(path.join(TEST_DIR, 'destdir'), { recursive: true, force: true });
    });

    it('should copy a file', async () => {
      await copyFile(path.join(TEST_DIR, 'source.txt'), path.join(TEST_DIR, 'destination.txt'));
      const content = await fs.readFile(path.join(TEST_DIR, 'destination.txt'), 'utf8');
      expect(content).toBe('Source content');
    });

    it('should throw error if destination exists and overwrite=false', async () => {
      await fs.writeFile(path.join(TEST_DIR, 'destination.txt'), 'Existing');
      await expect(copyFile(
        path.join(TEST_DIR, 'source.txt'),
        path.join(TEST_DIR, 'destination.txt')
      )).rejects.toThrow('already exists');
    });

    it('should overwrite when overwrite=true', async () => {
      await fs.writeFile(path.join(TEST_DIR, 'destination.txt'), 'Existing');
      await copyFile(
        path.join(TEST_DIR, 'source.txt'),
        path.join(TEST_DIR, 'destination.txt'),
        true
      );
      const content = await fs.readFile(path.join(TEST_DIR, 'destination.txt'), 'utf8');
      expect(content).toBe('Source content');
    });

    it('should copy a directory', async () => {
      await fs.mkdir(path.join(TEST_DIR, 'sourcedir'));
      await fs.writeFile(path.join(TEST_DIR, 'sourcedir', 'file.txt'), 'In dir');
      await copyFile(path.join(TEST_DIR, 'sourcedir'), path.join(TEST_DIR, 'destdir'));
      const content = await fs.readFile(path.join(TEST_DIR, 'destdir', 'file.txt'), 'utf8');
      expect(content).toBe('In dir');
    });
  });

  describe('moveFile', () => {
    beforeEach(async () => {
      await fs.writeFile(path.join(TEST_DIR, 'tomove.txt'), 'Move me');
    });

    afterEach(async () => {
      await fs.rm(path.join(TEST_DIR, 'tomove.txt'), { force: true });
      await fs.rm(path.join(TEST_DIR, 'moved.txt'), { force: true });
    });

    it('should move a file', async () => {
      await moveFile(path.join(TEST_DIR, 'tomove.txt'), path.join(TEST_DIR, 'moved.txt'));
      const content = await fs.readFile(path.join(TEST_DIR, 'moved.txt'), 'utf8');
      expect(content).toBe('Move me');
      await expect(fs.access(path.join(TEST_DIR, 'tomove.txt'))).rejects.toThrow();
    });

    it('should throw error for non-existent source', async () => {
      await expect(moveFile('/nonexistent/file.txt', '/somewhere')).rejects.toThrow('Source not found');
    });
  });

  describe('deleteFile', () => {
    it('should delete a file', async () => {
      await fs.writeFile(path.join(TEST_DIR, 'todelete.txt'), 'Delete me');
      await deleteFile(path.join(TEST_DIR, 'todelete.txt'));
      await expect(fs.access(path.join(TEST_DIR, 'todelete.txt'))).rejects.toThrow();
    });

    it('should delete an empty directory', async () => {
      await fs.mkdir(path.join(TEST_DIR, 'emptydir'));
      await deleteFile(path.join(TEST_DIR, 'emptydir'));
      await expect(fs.access(path.join(TEST_DIR, 'emptydir'))).rejects.toThrow();
    });

    it('should throw error for non-empty directory without recursive', async () => {
      await fs.mkdir(path.join(TEST_DIR, 'nonempty'));
      await fs.writeFile(path.join(TEST_DIR, 'nonempty', 'file.txt'), 'content');
      await expect(deleteFile(path.join(TEST_DIR, 'nonempty'))).rejects.toThrow('not empty');
      await fs.rm(path.join(TEST_DIR, 'nonempty'), { recursive: true, force: true });
    });

    it('should delete non-empty directory with recursive=true', async () => {
      await fs.mkdir(path.join(TEST_DIR, 'nonempty2'));
      await fs.writeFile(path.join(TEST_DIR, 'nonempty2', 'file.txt'), 'content');
      await deleteFile(path.join(TEST_DIR, 'nonempty2'), true);
      await expect(fs.access(path.join(TEST_DIR, 'nonempty2'))).rejects.toThrow();
    });

    it('should throw error for non-existent path', async () => {
      await expect(deleteFile('/nonexistent/file.txt')).rejects.toThrow('Path not found');
    });
  });
});
