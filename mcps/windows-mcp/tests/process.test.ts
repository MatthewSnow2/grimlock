import { jest, describe, it, expect } from '@jest/globals';
import { listProcesses, killProcess, startApplication } from '../src/tools/process.js';

// Note: Process tests are tricky on non-Windows systems
// These tests are designed to work on Windows but will be skipped on Linux

const isWindows = process.platform === 'win32';

describe('Process Tools', () => {
  describe('listProcesses', () => {
    (isWindows ? it : it.skip)('should list running processes', async () => {
      const result = await listProcesses();

      expect(result.processes).toBeDefined();
      expect(Array.isArray(result.processes)).toBe(true);
      expect(result.total).toBeGreaterThan(0);

      // Check structure of first process
      const first = result.processes[0];
      expect(first.pid).toBeDefined();
      expect(first.name).toBeDefined();
      expect(typeof first.memoryMB).toBe('number');
    });

    (isWindows ? it : it.skip)('should filter processes by name', async () => {
      // Look for a common Windows process
      const result = await listProcesses('explorer');

      if (result.total > 0) {
        expect(result.processes.every(p =>
          p.name.toLowerCase().includes('explorer')
        )).toBe(true);
      }
    });

    (isWindows ? it : it.skip)('should sort by different criteria', async () => {
      const byMemory = await listProcesses(undefined, 'memory');
      const byName = await listProcesses(undefined, 'name');
      const byPid = await listProcesses(undefined, 'pid');

      // Verify sorting (at least first two elements)
      if (byMemory.processes.length >= 2) {
        expect(byMemory.processes[0].memoryMB).toBeGreaterThanOrEqual(byMemory.processes[1].memoryMB);
      }

      if (byPid.processes.length >= 2) {
        expect(byPid.processes[0].pid).toBeLessThanOrEqual(byPid.processes[1].pid);
      }
    });

    // For non-Windows systems, test that it throws appropriate error
    (!isWindows ? it : it.skip)('should throw error on non-Windows systems', async () => {
      await expect(listProcesses()).rejects.toThrow();
    });
  });

  describe('killProcess', () => {
    // Kill tests are dangerous and should only run in controlled environments
    // These tests are marked as skip by default

    it.skip('should kill a process by PID', async () => {
      // This would require starting a test process first
    });

    it.skip('should kill a process by name', async () => {
      // This would require starting a test process first
    });

    (isWindows ? it : it.skip)('should handle invalid PID', async () => {
      // Attempting to kill a non-existent PID should fail
      await expect(killProcess('999999999')).rejects.toThrow();
    });
  });

  describe('startApplication', () => {
    (isWindows ? it : it.skip)('should start an application', async () => {
      // Start notepad and immediately close it would be ideal
      // For now, just test that the function doesn't throw for valid path
      const result = await startApplication('notepad.exe', undefined, false);
      expect(result.path).toBe('notepad.exe');

      // Clean up: kill notepad
      try {
        await killProcess('notepad.exe', true);
      } catch {
        // Ignore if already closed
      }
    });

    (isWindows ? it : it.skip)('should throw error for non-existent application', async () => {
      await expect(
        startApplication('nonexistent_app_12345.exe', undefined, true)
      ).rejects.toThrow();
    });
  });
});
