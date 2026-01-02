#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Tool implementations
export function sayHello(name: string): string {
  return `Hello, ${name}! Welcome!`;
}

export function sayGoodbye(name: string): string {
  return `Goodbye, ${name}! Have a great day!`;
}

export function getTimeGreeting(): string {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return "Good morning! Hope you have a wonderful day ahead.";
  } else if (hour >= 12 && hour < 17) {
    return "Good afternoon! Hope your day is going well.";
  } else if (hour >= 17 && hour < 21) {
    return "Good evening! Hope you had a productive day.";
  } else {
    return "Good night! Rest well.";
  }
}

// Create MCP server
const server = new Server(
  {
    name: "sample-greeting-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "say_hello",
        description: "Returns a friendly greeting with the provided name",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The name to greet",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "say_goodbye",
        description: "Returns a farewell message",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The name to bid farewell",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "get_time_greeting",
        description: "Returns a time-appropriate greeting (good morning, afternoon, evening)",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "say_hello": {
      const nameArg = args?.name as string;
      if (!nameArg) {
        throw new Error("Missing required parameter: name");
      }
      return {
        content: [
          {
            type: "text",
            text: sayHello(nameArg),
          },
        ],
      };
    }

    case "say_goodbye": {
      const nameArg = args?.name as string;
      if (!nameArg) {
        throw new Error("Missing required parameter: name");
      }
      return {
        content: [
          {
            type: "text",
            text: sayGoodbye(nameArg),
          },
        ],
      };
    }

    case "get_time_greeting": {
      return {
        content: [
          {
            type: "text",
            text: getTimeGreeting(),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Sample Greeting MCP server running on stdio");
}

main().catch(console.error);
