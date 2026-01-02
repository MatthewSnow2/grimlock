import * as os from 'os';
import si from 'systeminformation';

export interface SystemInfo {
  os: {
    platform: string;
    distro: string;
    release: string;
    arch: string;
    hostname: string;
  };
  cpu: {
    manufacturer: string;
    brand: string;
    cores: number;
    physicalCores: number;
    speed: number;
  };
  memory: {
    total: number;
    totalGB: number;
    free: number;
    freeGB: number;
    used: number;
    usedGB: number;
    usedPercent: number;
  };
  uptime: {
    seconds: number;
    formatted: string;
  };
}

export interface DiskInfo {
  drive: string;
  type: string;
  total: number;
  totalGB: number;
  used: number;
  usedGB: number;
  free: number;
  freeGB: number;
  usedPercent: number;
}

/**
 * Get detailed system information including OS, CPU, memory
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  const [osInfo, cpuInfo, memInfo] = await Promise.all([
    si.osInfo(),
    si.cpu(),
    si.mem(),
  ]);

  const uptime = os.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);

  return {
    os: {
      platform: osInfo.platform,
      distro: osInfo.distro,
      release: osInfo.release,
      arch: osInfo.arch,
      hostname: os.hostname(),
    },
    cpu: {
      manufacturer: cpuInfo.manufacturer,
      brand: cpuInfo.brand,
      cores: cpuInfo.cores,
      physicalCores: cpuInfo.physicalCores,
      speed: cpuInfo.speed,
    },
    memory: {
      total: memInfo.total,
      totalGB: Math.round((memInfo.total / (1024 * 1024 * 1024)) * 100) / 100,
      free: memInfo.free,
      freeGB: Math.round((memInfo.free / (1024 * 1024 * 1024)) * 100) / 100,
      used: memInfo.used,
      usedGB: Math.round((memInfo.used / (1024 * 1024 * 1024)) * 100) / 100,
      usedPercent: Math.round((memInfo.used / memInfo.total) * 100 * 100) / 100,
    },
    uptime: {
      seconds: uptime,
      formatted: `${days}d ${hours}h ${minutes}m`,
    },
  };
}

/**
 * Get disk space information for all drives
 */
export async function getDiskUsage(drive?: string): Promise<DiskInfo[]> {
  const fsSize = await si.fsSize();

  let disks = fsSize.map((disk) => ({
    drive: disk.mount,
    type: disk.type,
    total: disk.size,
    totalGB: Math.round((disk.size / (1024 * 1024 * 1024)) * 100) / 100,
    used: disk.used,
    usedGB: Math.round((disk.used / (1024 * 1024 * 1024)) * 100) / 100,
    free: disk.available,
    freeGB: Math.round((disk.available / (1024 * 1024 * 1024)) * 100) / 100,
    usedPercent: disk.use,
  }));

  // Filter by specific drive if requested
  if (drive) {
    const normalizedDrive = drive.toUpperCase();
    disks = disks.filter(
      (d) =>
        d.drive.toUpperCase() === normalizedDrive ||
        d.drive.toUpperCase().startsWith(normalizedDrive)
    );

    if (disks.length === 0) {
      throw new Error(`Drive not found: ${drive}`);
    }
  }

  return disks;
}
