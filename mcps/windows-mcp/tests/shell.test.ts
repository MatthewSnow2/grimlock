import { jest, describe, it, expect } from '@jest/globals';
import { runPowerShell, runCmd } from '../src/tools/shell.js';

const isWindows = process.platform === 'win32';

describe('Shell Tools', () => {
  describe('runPowerShell', () => {
    (isWindows ? it : it.skip)('should execute a simple PowerShell command', async () => {
      const result = await runPowerShell('echo "Hello from PowerShell"');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Hello from PowerShell');
    });

    (isWindows ? it : it.skip)('should return error for invalid command', async () => {
      const result = await runPowerShell('NonExistentCommand-12345');
      expect(result.exitCode).not.toBe(0);
    });

    it('should throw error for empty command', async () => {
      await expect(runPowerShell('')).rejects.toThrow('Command is required');
    });

    (isWindows ? it : it.skip)('should handle command with output', async () => {
      const result = await runPowerShell('Get-Date -Format "yyyy-MM-dd"');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    (isWindows ? it : it.skip)('should respect timeout', async () => {
      await expect(
        runPowerShell('Start-Sleep -Seconds 5', 100)
      ).rejects.toThrow('timed out');
    }, 10000);
  });

  describe('runCmd', () => {
    (isWindows ? it : it.skip)('should execute a simple CMD command', async () => {
      const result = await runCmd('echo Hello from CMD');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Hello from CMD');
    });

    (isWindows ? it : it.skip)('should return error for invalid command', async () => {
      const result = await runCmd('nonexistentcommand12345');
      expect(result.exitCode).not.toBe(0);
    });

    it('should throw error for empty command', async () => {
      await expect(runCmd('')).rejects.toThrow('Command is required');
    });

    (isWindows ? it : it.skip)('should handle command with output', async () => {
      const result = await runCmd('date /t');
      expect(result.exitCode).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });
  });
});
