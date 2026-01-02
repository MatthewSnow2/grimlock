#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

import {
  listDirectory,
  readFile,
  writeFile,
  copyFile,
  moveFile,
  deleteFile,
  listProcesses,
  killProcess,
  startApplication,
  getSystemInfo,
  getDiskUsage,
  getClipboard,
  setClipboard,
  runPowerShell,
  runCmd,
} from './tools/index.js';

// Tool definitions
const TOOLS: Tool[] = [
  // File System Tools
  {
    name: 'list_directory',
    description:
      'List contents of a directory with optional filtering. Use when user wants to see files in a folder or search for specific file types.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: "Directory path to list (e.g., 'C:\\Users\\Name\\Documents')",
        },
        filter: {
          type: 'string',
          description: "File extension filter (e.g., '*.txt', '*.pdf')",
        },
        recursive: {
          type: 'boolean',
          description: 'Include subdirectories',
          default: false,
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'read_file',
    description:
      'Read contents of a text file. Use when user wants to view file contents or analyze text data.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Full path to the file',
        },
        encoding: {
          type: 'string',
          description: 'File encoding (utf8, ascii, utf16le)',
          default: 'utf8',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description:
      'Write or append content to a file. Use when user wants to create or modify text files.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Full path for the file',
        },
        content: {
          type: 'string',
          description: 'Content to write',
        },
        append: {
          type: 'boolean',
          description: 'Append to existing file instead of overwrite',
          default: false,
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'copy_file',
    description:
      'Copy a file or directory to a new location. Use when user wants to duplicate or backup files.',
    inputSchema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'Source file or directory path',
        },
        destination: {
          type: 'string',
          description: 'Destination path',
        },
        overwrite: {
          type: 'boolean',
          description: 'Overwrite if destination exists',
          default: false,
        },
      },
      required: ['source', 'destination'],
    },
  },
  {
    name: 'move_file',
    description:
      'Move or rename a file or directory. Use when user wants to relocate or rename items.',
    inputSchema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'Source path',
        },
        destination: {
          type: 'string',
          description: 'Destination path',
        },
      },
      required: ['source', 'destination'],
    },
  },
  {
    name: 'delete_file',
    description:
      'Delete a file or empty directory. Use with caution - always confirm with user first.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to delete',
        },
        recursive: {
          type: 'boolean',
          description: 'Delete directory and all contents (dangerous)',
          default: false,
        },
      },
      required: ['path'],
    },
  },

  // Process Management Tools
  {
    name: 'list_processes',
    description:
      "List running processes with CPU and memory usage. Use when user wants to see what's running or find resource-heavy apps.",
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'Filter by process name (partial match)',
        },
        sort_by: {
          type: 'string',
          description: 'Sort by: memory, cpu, name, pid',
          enum: ['memory', 'cpu', 'name', 'pid'],
          default: 'memory',
        },
      },
    },
  },
  {
    name: 'kill_process',
    description:
      'Terminate a running process by PID or name. Use when user wants to force-close an application.',
    inputSchema: {
      type: 'object',
      properties: {
        identifier: {
          type: 'string',
          description: 'Process ID (number) or process name',
        },
        force: {
          type: 'boolean',
          description: 'Force termination without cleanup',
          default: false,
        },
      },
      required: ['identifier'],
    },
  },
  {
    name: 'start_application',
    description:
      'Launch an application or open a file with default program. Use when user wants to open apps or files.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Application path or file to open',
        },
        arguments: {
          type: 'string',
          description: 'Command-line arguments',
        },
        wait: {
          type: 'boolean',
          description: 'Wait for application to close',
          default: false,
        },
      },
      required: ['path'],
    },
  },

  // System Information Tools
  {
    name: 'get_system_info',
    description:
      'Get detailed system information including OS, CPU, memory, disk. Use when user asks about their system specs or available resources.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_disk_usage',
    description:
      'Get disk space information for all drives. Use when user wants to check available storage.',
    inputSchema: {
      type: 'object',
      properties: {
        drive: {
          type: 'string',
          description: "Specific drive letter (e.g., 'C:')",
        },
      },
    },
  },

  // Clipboard Tools
  {
    name: 'get_clipboard',
    description:
      'Read current clipboard contents (text only). Use when user wants to work with copied text.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'set_clipboard',
    description:
      'Copy text to clipboard. Use when user wants to copy generated content.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text to copy to clipboard',
        },
      },
      required: ['text'],
    },
  },

  // Shell Execution Tools
  {
    name: 'run_powershell',
    description:
      'Execute a PowerShell command and return output. Use for advanced Windows automation tasks.',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'PowerShell command to execute',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds',
          default: 30000,
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'run_cmd',
    description:
      'Execute a CMD command and return output. Use for simple command-line operations.',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'CMD command to execute',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds',
          default: 30000,
        },
      },
      required: ['command'],
    },
  },
];

// Create server
const server = new Server(
  {
    name: 'windows-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: unknown;

    switch (name) {
      // File System Tools
      case 'list_directory':
        result = await listDirectory(
          args?.path as string,
          args?.filter as string | undefined,
          args?.recursive as boolean | undefined
        );
        break;

      case 'read_file':
        result = await readFile(
          args?.path as string,
          args?.encoding as BufferEncoding | undefined
        );
        break;

      case 'write_file':
        result = await writeFile(
          args?.path as string,
          args?.content as string,
          args?.append as boolean | undefined
        );
        break;

      case 'copy_file':
        result = await copyFile(
          args?.source as string,
          args?.destination as string,
          args?.overwrite as boolean | undefined
        );
        break;

      case 'move_file':
        result = await moveFile(
          args?.source as string,
          args?.destination as string
        );
        break;

      case 'delete_file':
        result = await deleteFile(
          args?.path as string,
          args?.recursive as boolean | undefined
        );
        break;

      // Process Management Tools
      case 'list_processes':
        result = await listProcesses(
          args?.filter as string | undefined,
          args?.sort_by as 'memory' | 'cpu' | 'name' | 'pid' | undefined
        );
        break;

      case 'kill_process':
        result = await killProcess(
          args?.identifier as string,
          args?.force as boolean | undefined
        );
        break;

      case 'start_application':
        result = await startApplication(
          args?.path as string,
          args?.arguments as string | undefined,
          args?.wait as boolean | undefined
        );
        break;

      // System Information Tools
      case 'get_system_info':
        result = await getSystemInfo();
        break;

      case 'get_disk_usage':
        result = await getDiskUsage(args?.drive as string | undefined);
        break;

      // Clipboard Tools
      case 'get_clipboard':
        result = await getClipboard();
        break;

      case 'set_clipboard':
        result = await setClipboard(args?.text as string);
        break;

      // Shell Execution Tools
      case 'run_powershell':
        result = await runPowerShell(
          args?.command as string,
          args?.timeout as number | undefined
        );
        break;

      case 'run_cmd':
        result = await runCmd(
          args?.command as string,
          args?.timeout as number | undefined
        );
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Windows MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
