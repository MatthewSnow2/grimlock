# Philips Hue MCP Server

An MCP (Model Context Protocol) server for controlling Philips Hue smart lights. This server allows AI assistants to turn lights on/off, toggle states, and control all lights at once.

## Features

- **Toggle individual lights** - Turn specific lights on, off, or toggle their state
- **Control all lights** - Turn all lights on/off or toggle all at once
- **List available lights** - Discover all lights connected to your Hue Bridge
- **Full state reporting** - Get current light states and reachability info

## Prerequisites

- Node.js 18 or higher
- Philips Hue Bridge on your local network
- Hue Bridge API key (username)

## Installation

```bash
npm install
npm run build
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:

| Variable | Description |
|----------|-------------|
| `HUE_BRIDGE_IP` | IP address of your Hue Bridge (e.g., `192.168.1.100`) |
| `HUE_API_KEY` | API key (username) for authentication |

### Finding Your Bridge IP

1. Visit https://discovery.meethue.com/ in your browser
2. Or check the Hue mobile app under Settings > Hue Bridges

### Getting an API Key

1. Press the link button on your Hue Bridge
2. Within 30 seconds, send this request:

```bash
curl -X POST http://<bridge-ip>/api \
  -H "Content-Type: application/json" \
  -d '{"devicetype":"philips-hue-mcp#mydevice"}'
```

3. Copy the `username` from the response - this is your API key

## Usage

### With Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "philips-hue": {
      "command": "node",
      "args": ["/path/to/philips-hue-mcp/dist/index.js"],
      "env": {
        "HUE_BRIDGE_IP": "192.168.1.100",
        "HUE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Standalone

```bash
HUE_BRIDGE_IP=192.168.1.100 HUE_API_KEY=your-key npm start
```

## Available Tools

### toggle_light

Turn light on or off for individual or all lights.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | Yes | Action to perform: `on`, `off`, or `toggle` |
| `light_id` | string | No | Light ID to control. Use `all` for all lights. Omit to list available lights. |

**Examples:**

```
# List all available lights
action: "on" (light_id omitted)

# Turn on light 1
action: "on", light_id: "1"

# Turn off all lights
action: "off", light_id: "all"

# Toggle light 3
action: "toggle", light_id: "3"

# Toggle all lights
action: "toggle", light_id: "all"
```

**Response format:**

```json
{
  "success": true,
  "action": "on",
  "light_id": "1",
  "light_name": "Living Room",
  "message": "Light \"Living Room\" turned on",
  "response": [{"success": {"/lights/1/state/on": true}}]
}
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint
```

## Testing

The project includes comprehensive tests using Vitest:

```bash
npm test          # Run tests once
npm run test:watch # Run tests in watch mode
```

## Project Structure

```
philips-hue-mcp/
├── src/
│   ├── index.ts          # MCP server entry point
│   ├── hue-client.ts     # Philips Hue API client
│   ├── index.test.ts     # Server integration tests
│   └── hue-client.test.ts # Client unit tests
├── dist/                  # Compiled JavaScript
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .env.example
└── README.md
```

## License

MIT

## Author

Me, Myself Plus AI LLC
