import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  memoryMB: number;
}

export interface ListProcessesResult {
  processes: ProcessInfo[];
  total: number;
}

/**
 * List running processes with CPU and memory usage
 */
export async function listProcesses(
  filter?: string,
  sortBy: 'memory' | 'cpu' | 'name' | 'pid' = 'memory'
): Promise<ListProcessesResult> {
  // Use PowerShell to get process info on Windows
  const psCommand = `Get-Process | Select-Object Id, ProcessName, CPU, @{Name='MemoryMB';Expression={[math]::Round($_.WorkingSet64/1MB,2)}} | ConvertTo-Json`;

  try {
    const { stdout } = await execAsync(`powershell -Command "${psCommand}"`, {
      maxBuffer: 10 * 1024 * 1024,
    });

    let processes: ProcessInfo[] = [];

    try {
      const rawData = JSON.parse(stdout);
      const data = Array.isArray(rawData) ? rawData : [rawData];

      processes = data.map((p: any) => ({
        pid: p.Id,
        name: p.ProcessName || 'Unknown',
        cpu: p.CPU || 0,
        memory: p.MemoryMB ? p.MemoryMB * 1024 * 1024 : 0,
        memoryMB: p.MemoryMB || 0,
      }));
    } catch {
      throw new Error('Failed to parse process list');
    }

    // Apply filter
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      processes = processes.filter((p) =>
        p.name.toLowerCase().includes(lowerFilter)
      );
    }

    // Sort processes
    switch (sortBy) {
      case 'cpu':
        processes.sort((a, b) => b.cpu - a.cpu);
        break;
      case 'name':
        processes.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'pid':
        processes.sort((a, b) => a.pid - b.pid);
        break;
      case 'memory':
      default:
        processes.sort((a, b) => b.memoryMB - a.memoryMB);
        break;
    }

    return {
      processes,
      total: processes.length,
    };
  } catch (error) {
    // Fallback for non-Windows or if PowerShell fails
    throw new Error(`Failed to list processes: ${(error as Error).message}`);
  }
}

/**
 * Terminate a running process by PID or name
 */
export async function killProcess(
  identifier: string,
  force: boolean = false
): Promise<{ killed: string; pid?: number }> {
  const isNumeric = /^\d+$/.test(identifier);

  if (isNumeric) {
    // Kill by PID
    const pid = parseInt(identifier, 10);
    const forceFlag = force ? '/F' : '';
    const command = `taskkill ${forceFlag} /PID ${pid}`;

    try {
      await execAsync(command);
      return { killed: `Process with PID ${pid}`, pid };
    } catch (error) {
      throw new Error(`Failed to kill process ${pid}: ${(error as Error).message}`);
    }
  } else {
    // Kill by name
    const forceFlag = force ? '/F' : '';
    const command = `taskkill ${forceFlag} /IM "${identifier}"`;

    try {
      await execAsync(command);
      return { killed: `Process(es) named ${identifier}` };
    } catch (error) {
      throw new Error(`Failed to kill process ${identifier}: ${(error as Error).message}`);
    }
  }
}

/**
 * Launch an application or open a file with default program
 */
export async function startApplication(
  appPath: string,
  args?: string,
  wait: boolean = false
): Promise<{ pid: number | null; path: string }> {
  return new Promise((resolve, reject) => {
    try {
      const cmdArgs = args ? args.split(' ') : [];

      if (wait) {
        // Wait for process to complete
        const child = spawn(appPath, cmdArgs, {
          shell: true,
          windowsHide: false,
        });

        child.on('close', (code) => {
          resolve({
            pid: child.pid || null,
            path: appPath,
          });
        });

        child.on('error', (error) => {
          reject(new Error(`Failed to start application: ${error.message}`));
        });
      } else {
        // Use 'start' command on Windows to detach process
        const startCmd = `start "" "${appPath}"${args ? ' ' + args : ''}`;
        exec(startCmd, { shell: 'cmd.exe' }, (error) => {
          if (error) {
            reject(new Error(`Failed to start application: ${error.message}`));
          } else {
            // When using 'start', we don't get the PID of the launched app
            resolve({
              pid: null,
              path: appPath,
            });
          }
        });
      }
    } catch (error) {
      reject(new Error(`Failed to start application: ${(error as Error).message}`));
    }
  });
}
