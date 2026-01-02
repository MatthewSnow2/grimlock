# n8n MCP Server

An MCP (Model Context Protocol) server that provides AI assistants with the ability to manage n8n workflows. Enables Claude to list, create, update, execute, and monitor workflows, plus search templates and manage executions.

## Features

- **Workflow Management**: List, create, update, delete, activate, and deactivate workflows
- **Execution Management**: Execute workflows, list and inspect executions, delete execution records
- **Node Discovery**: Search available n8n nodes and get detailed node information
- **Template Discovery**: Search and retrieve workflow templates from n8n.io community
- **Credential Management**: List available credentials in the instance

## Installation

```bash
# Clone the repository
git clone https://github.com/m2ai-mcp-servers/mcp-n8n.git
cd mcp-n8n

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

Create a `.env` file based on `.env.example`:

```bash
# n8n Instance URL (required)
# Example: https://myinstance.app.n8n.cloud
N8N_BASE_URL=https://your-instance.app.n8n.cloud

# n8n API Key (required)
# Generate in n8n: Settings → n8n API
N8N_API_KEY=your-api-key-here
```

### Getting Your n8n API Key

1. Open your n8n instance
2. Go to **Settings** → **n8n API**
3. Click **Create API Key**
4. Copy the generated key

## Usage with Claude Desktop

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "n8n": {
      "command": "node",
      "args": ["/path/to/n8n-mcp/dist/index.js"],
      "env": {
        "N8N_BASE_URL": "https://your-instance.app.n8n.cloud",
        "N8N_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Available Tools

### Workflow Management

| Tool | Description |
|------|-------------|
| `list_workflows` | List all workflows with optional filters (active status, tags, limit) |
| `get_workflow` | Get full workflow details including nodes and connections |
| `create_workflow` | Create a new workflow from a specification |
| `update_workflow` | Update an existing workflow's configuration |
| `delete_workflow` | Delete a workflow permanently |
| `activate_workflow` | Activate a workflow to enable triggers |
| `deactivate_workflow` | Deactivate a workflow to disable triggers |

### Execution Management

| Tool | Description |
|------|-------------|
| `execute_workflow` | Manually trigger a workflow with optional input data |
| `list_executions` | List workflow executions with optional filters |
| `get_execution` | Get detailed execution data including node outputs |
| `delete_execution` | Delete an execution record |

### Node Discovery

| Tool | Description |
|------|-------------|
| `search_nodes` | Search available n8n nodes by keyword |
| `get_node_info` | Get detailed information about a specific node type |

### Template Discovery

| Tool | Description |
|------|-------------|
| `search_templates` | Search n8n workflow templates from the community |
| `get_template` | Get full template workflow definition |

### Credentials

| Tool | Description |
|------|-------------|
| `list_credentials` | List available credentials in the instance |

## Examples

### List Active Workflows

```
User: Show me all active workflows
Claude: [Uses list_workflows with active: true]
```

### Create a Simple Workflow

```
User: Create a webhook workflow that sends a Slack message
Claude: [Uses search_nodes to find webhook and slack nodes, then create_workflow]
```

### Execute a Workflow

```
User: Run the "Daily Report" workflow
Claude: [Uses list_workflows to find it, then execute_workflow]
```

### Debug an Execution

```
User: Why did my workflow fail?
Claude: [Uses list_executions with status: error, then get_execution for details]
```

### Find Templates

```
User: Find me a template for Google Sheets to Slack
Claude: [Uses search_templates with query "google sheets slack"]
```

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build
```

## Known Limitations

- Cannot create new credentials (only use existing)
- Some enterprise features may not be available via API
- Execution data may be truncated for large payloads
- Node search uses a curated list of common nodes

## Security

- API key is never logged
- Credentials are not exposed in responses
- Uses environment variables for sensitive configuration

## License

MIT

## Author

Built by GRIMLOCK MCP Factory
