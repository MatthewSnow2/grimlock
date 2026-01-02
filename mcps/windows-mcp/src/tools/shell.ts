import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Execute a PowerShell command and return output
 */
export async function runPowerShell(
  command: string,
  timeout: number = 30000
): Promise<ShellResult> {
  if (!command || command.trim() === '') {
    throw new Error('Command is required');
  }

  // Escape the command for PowerShell
  const escapedCommand = command.replace(/"/g, '\\"');

  try {
    const { stdout, stderr } = await execAsync(
      `powershell -NoProfile -NonInteractive -Command "${escapedCommand}"`,
      {
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        windowsHide: true,
      }
    );

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
    };
  } catch (error: any) {
    // Check for timeout
    if (error.killed) {
      throw new Error(`Command execution timed out after ${timeout}ms`);
    }

    // Return the error output
    return {
      stdout: error.stdout?.trim() || '',
      stderr: error.stderr?.trim() || error.message,
      exitCode: error.code || 1,
    };
  }
}

/**
 * Execute a CMD command and return output
 */
export async function runCmd(
  command: string,
  timeout: number = 30000
): Promise<ShellResult> {
  if (!command || command.trim() === '') {
    throw new Error('Command is required');
  }

  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      shell: 'cmd.exe',
      windowsHide: true,
    });

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
    };
  } catch (error: any) {
    // Check for timeout
    if (error.killed) {
      throw new Error(`Command execution timed out after ${timeout}ms`);
    }

    // Return the error output
    return {
      stdout: error.stdout?.trim() || '',
      stderr: error.stderr?.trim() || error.message,
      exitCode: error.code || 1,
    };
  }
}
