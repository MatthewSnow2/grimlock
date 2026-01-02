# test-mcp

A test MCP server for workflow validation.

## Installation

```bash
npm install
npm run build
```

## Usage

### With Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "test-mcp": {
      "command": "node",
      "args": ["/path/to/test-mcp/dist/index.js"]
    }
  }
}
```

### Development

```bash
npm run dev
```

## Tools

### hello_world

Returns a greeting message.

**Parameters:** None

**Returns:** `Hello, World! This is a test MCP server.`

## Testing

```bash
npm test
```

## License

MIT
