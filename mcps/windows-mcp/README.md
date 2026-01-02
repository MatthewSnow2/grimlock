# Windows MCP Server

Windows System Integration MCP server providing AI assistants with the ability to interact with Windows operating system features including file management, process control, system information, clipboard operations, and shell execution.

## Features

- **File System Operations**: List, read, write, copy, move, and delete files and directories
- **Process Management**: List running processes, start applications, terminate processes
- **System Information**: Get CPU, memory, disk usage, and OS information
- **Clipboard Access**: Read and write to the Windows clipboard
- **Shell Execution**: Run PowerShell and CMD commands

## Installation

```bash
npm install
npm run build
```

## Usage with Claude Desktop

Add to your Claude Desktop configuration (`%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "windows": {
      "command": "node",
      "args": ["C:/path/to/windows-mcp/dist/index.js"]
    }
  }
}
```

## Available Tools

### File System Tools

| Tool | Description |
|------|-------------|
| `list_directory` | List contents of a directory with optional filtering |
| `read_file` | Read contents of a text file |
| `write_file` | Write or append content to a file |
| `copy_file` | Copy a file or directory to a new location |
| `move_file` | Move or rename a file or directory |
| `delete_file` | Delete a file or directory |

### Process Management Tools

| Tool | Description |
|------|-------------|
| `list_processes` | List running processes with CPU and memory usage |
| `kill_process` | Terminate a running process by PID or name |
| `start_application` | Launch an application or open a file |

### System Information Tools

| Tool | Description |
|------|-------------|
| `get_system_info` | Get detailed system information (OS, CPU, memory) |
| `get_disk_usage` | Get disk space information for all drives |

### Clipboard Tools

| Tool | Description |
|------|-------------|
| `get_clipboard` | Read current clipboard contents (text only) |
| `set_clipboard` | Copy text to clipboard |

### Shell Execution Tools

| Tool | Description |
|------|-------------|
| `run_powershell` | Execute a PowerShell command and return output |
| `run_cmd` | Execute a CMD command and return output |

## Example Usage

### List files in a directory
```
Use list_directory with path "C:\Users\YourName\Documents" and filter "*.pdf"
```

### Get system information
```
Use get_system_info to check available RAM and CPU info
```

### Run a PowerShell command
```
Use run_powershell with command "Get-Process | Sort-Object CPU -Descending | Select-Object -First 10"
```

### Copy files
```
Use copy_file to copy from "C:\source\file.txt" to "D:\backup\file.txt"
```

## Security Considerations

- **Shell Execution**: The `run_powershell` and `run_cmd` tools can execute arbitrary commands. Use with caution.
- **File Operations**: File deletion with `recursive=true` is dangerous. Always confirm before use.
- **Process Termination**: Killing processes may cause data loss. Confirm critical operations.
- **Clipboard Access**: Clipboard contents may contain sensitive information.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Development mode
npm run dev
```

## Requirements

- Node.js 18+
- Windows 10/11 (for full functionality)
- PowerShell (for shell execution features)

## Dependencies

- `@modelcontextprotocol/sdk` - MCP SDK
- `clipboardy` - Cross-platform clipboard access
- `systeminformation` - System information retrieval

## License

MIT
