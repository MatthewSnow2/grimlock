import { jest, describe, it, expect } from '@jest/globals';
import { getSystemInfo, getDiskUsage } from '../src/tools/system.js';

describe('System Tools', () => {
  describe('getSystemInfo', () => {
    it('should return system information', async () => {
      const info = await getSystemInfo();

      // Check OS info
      expect(info.os).toBeDefined();
      expect(info.os.platform).toBeDefined();
      expect(info.os.hostname).toBeDefined();
      expect(info.os.arch).toBeDefined();

      // Check CPU info
      expect(info.cpu).toBeDefined();
      expect(info.cpu.cores).toBeGreaterThan(0);
      expect(info.cpu.physicalCores).toBeGreaterThan(0);

      // Check Memory info
      expect(info.memory).toBeDefined();
      expect(info.memory.total).toBeGreaterThan(0);
      expect(info.memory.totalGB).toBeGreaterThan(0);
      expect(info.memory.usedPercent).toBeGreaterThanOrEqual(0);
      expect(info.memory.usedPercent).toBeLessThanOrEqual(100);

      // Check Uptime
      expect(info.uptime).toBeDefined();
      expect(info.uptime.seconds).toBeGreaterThan(0);
      expect(info.uptime.formatted).toBeDefined();
    });
  });

  describe('getDiskUsage', () => {
    it('should return disk usage for all drives', async () => {
      const disks = await getDiskUsage();

      expect(Array.isArray(disks)).toBe(true);
      expect(disks.length).toBeGreaterThan(0);

      const firstDisk = disks[0];
      expect(firstDisk.drive).toBeDefined();
      expect(firstDisk.total).toBeGreaterThan(0);
      expect(firstDisk.totalGB).toBeGreaterThan(0);
      expect(firstDisk.usedPercent).toBeGreaterThanOrEqual(0);
      expect(firstDisk.usedPercent).toBeLessThanOrEqual(100);
    });

    it('should throw error for non-existent drive', async () => {
      await expect(getDiskUsage('Z:')).rejects.toThrow('Drive not found');
    });
  });
});
