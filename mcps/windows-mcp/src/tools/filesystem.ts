import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';

export interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modified: string;
  created: string;
}

export interface ListDirectoryResult {
  path: string;
  items: FileInfo[];
  totalItems: number;
}

/**
 * List contents of a directory with optional filtering
 */
export async function listDirectory(
  dirPath: string,
  filter?: string,
  recursive: boolean = false
): Promise<ListDirectoryResult> {
  const normalizedPath = path.normalize(dirPath);

  // Check if path exists
  try {
    await fs.access(normalizedPath);
  } catch {
    throw new Error(`Path not found: ${normalizedPath}`);
  }

  const stat = await fs.stat(normalizedPath);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${normalizedPath}`);
  }

  const items: FileInfo[] = [];

  async function scanDir(currentPath: string): Promise<void> {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      // Apply filter if provided
      if (filter) {
        const pattern = filter.replace(/\*/g, '.*').replace(/\?/g, '.');
        const regex = new RegExp(`^${pattern}$`, 'i');
        if (!regex.test(entry.name) && entry.isFile()) {
          continue;
        }
      }

      try {
        const stats = await fs.stat(fullPath);
        items.push({
          name: entry.name,
          path: fullPath,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime.toISOString(),
          created: stats.birthtime.toISOString(),
        });

        if (recursive && entry.isDirectory()) {
          await scanDir(fullPath);
        }
      } catch {
        // Skip files we can't access
      }
    }
  }

  await scanDir(normalizedPath);

  return {
    path: normalizedPath,
    items,
    totalItems: items.length,
  };
}

/**
 * Read contents of a text file
 */
export async function readFile(
  filePath: string,
  encoding: BufferEncoding = 'utf8'
): Promise<string> {
  const normalizedPath = path.normalize(filePath);

  try {
    await fs.access(normalizedPath);
  } catch {
    throw new Error(`File not found: ${normalizedPath}`);
  }

  const stat = await fs.stat(normalizedPath);
  if (stat.isDirectory()) {
    throw new Error(`Path is a directory, not a file: ${normalizedPath}`);
  }

  // Check if file might be binary (only for files larger than 0 bytes)
  if (stat.size > 0) {
    const buffer = Buffer.alloc(Math.min(512, stat.size));
    const fd = await fs.open(normalizedPath, 'r');
    try {
      const { bytesRead } = await fd.read(buffer, 0, buffer.length, 0);
      // Simple binary detection: check for null bytes in what we read
      if (bytesRead > 0 && buffer.subarray(0, bytesRead).includes(0)) {
        throw new Error(`File appears to be binary: ${normalizedPath}. Use a hex editor or appropriate tool.`);
      }
    } finally {
      await fd.close();
    }
  }

  return fs.readFile(normalizedPath, { encoding });
}

/**
 * Write or append content to a file
 */
export async function writeFile(
  filePath: string,
  content: string,
  append: boolean = false
): Promise<{ bytesWritten: number; path: string }> {
  const normalizedPath = path.normalize(filePath);

  // Ensure parent directory exists
  const dir = path.dirname(normalizedPath);
  await fs.mkdir(dir, { recursive: true });

  if (append) {
    await fs.appendFile(normalizedPath, content, 'utf8');
  } else {
    await fs.writeFile(normalizedPath, content, 'utf8');
  }

  const stat = await fs.stat(normalizedPath);

  return {
    bytesWritten: stat.size,
    path: normalizedPath,
  };
}

/**
 * Copy a file or directory to a new location
 */
export async function copyFile(
  source: string,
  destination: string,
  overwrite: boolean = false
): Promise<{ source: string; destination: string }> {
  const srcPath = path.normalize(source);
  const destPath = path.normalize(destination);

  try {
    await fs.access(srcPath);
  } catch {
    throw new Error(`Source not found: ${srcPath}`);
  }

  // Check if destination exists
  if (!overwrite) {
    try {
      await fs.access(destPath);
      throw new Error(`Destination already exists: ${destPath}. Use overwrite=true to replace.`);
    } catch (e) {
      if ((e as Error).message.includes('already exists')) {
        throw e;
      }
      // Destination doesn't exist, which is fine
    }
  }

  const srcStat = await fs.stat(srcPath);

  if (srcStat.isDirectory()) {
    await copyDirectory(srcPath, destPath);
  } else {
    // Ensure destination directory exists
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.copyFile(srcPath, destPath);
  }

  return { source: srcPath, destination: destPath };
}

async function copyDirectory(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Move or rename a file or directory
 */
export async function moveFile(
  source: string,
  destination: string
): Promise<{ source: string; destination: string }> {
  const srcPath = path.normalize(source);
  const destPath = path.normalize(destination);

  try {
    await fs.access(srcPath);
  } catch {
    throw new Error(`Source not found: ${srcPath}`);
  }

  // Ensure destination directory exists
  await fs.mkdir(path.dirname(destPath), { recursive: true });

  await fs.rename(srcPath, destPath);

  return { source: srcPath, destination: destPath };
}

/**
 * Delete a file or directory
 */
export async function deleteFile(
  filePath: string,
  recursive: boolean = false
): Promise<{ deleted: string }> {
  const normalizedPath = path.normalize(filePath);

  try {
    await fs.access(normalizedPath);
  } catch {
    throw new Error(`Path not found: ${normalizedPath}`);
  }

  const stat = await fs.stat(normalizedPath);

  if (stat.isDirectory()) {
    if (!recursive) {
      // Check if directory is empty
      const contents = await fs.readdir(normalizedPath);
      if (contents.length > 0) {
        throw new Error(`Directory is not empty: ${normalizedPath}. Use recursive=true to delete with contents (dangerous).`);
      }
      await fs.rmdir(normalizedPath);
    } else {
      await fs.rm(normalizedPath, { recursive: true, force: true });
    }
  } else {
    await fs.unlink(normalizedPath);
  }

  return { deleted: normalizedPath };
}
