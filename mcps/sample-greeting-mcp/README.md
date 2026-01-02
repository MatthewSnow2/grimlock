# Sample Greeting MCP

A simple MCP (Model Context Protocol) server that provides greeting tools for testing GRIMLOCK.

## Installation

```bash
npm install
```

## Usage

### Running the Server

```bash
npm start
```

Or for development:

```bash
npm run dev
```

### Claude Desktop Configuration

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "sample-greeting": {
      "command": "node",
      "args": ["/path/to/sample-greeting-mcp/dist/index.js"]
    }
  }
}
```

## Available Tools

### say_hello

Returns a friendly greeting with the provided name.

**Parameters:**
- `name` (string, required): The name to greet

**Example:**
```
Input: { "name": "Alice" }
Output: "Hello, Alice! Welcome!"
```

### say_goodbye

Returns a farewell message.

**Parameters:**
- `name` (string, required): The name to bid farewell

**Example:**
```
Input: { "name": "Bob" }
Output: "Goodbye, Bob! Have a great day!"
```

### get_time_greeting

Returns a time-appropriate greeting (good morning, afternoon, evening).

**Parameters:** None

**Example:**
```
Input: {}
Output: "Good morning! Hope you have a wonderful day ahead."
```

Time-based responses:
- 5am - 12pm: "Good morning! Hope you have a wonderful day ahead."
- 12pm - 5pm: "Good afternoon! Hope your day is going well."
- 5pm - 9pm: "Good evening! Hope you had a productive day."
- 9pm - 5am: "Good night! Rest well."

## Development

### Build

```bash
npm run build
```

### Run Tests

```bash
npm test
```

## License

MIT

## Author

GRIMLOCK Test
