#!/usr/bin/env node

/**
 * Philips Hue MCP Server
 * An MCP server for controlling Philips Hue lights
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { HueClient } from './hue-client.js';

// Environment variables
const HUE_BRIDGE_IP = process.env.HUE_BRIDGE_IP;
const HUE_API_KEY = process.env.HUE_API_KEY;

// Validate required environment variables
function validateConfig(): void {
  if (!HUE_BRIDGE_IP) {
    throw new Error('HUE_BRIDGE_IP environment variable is required');
  }
  if (!HUE_API_KEY) {
    throw new Error('HUE_API_KEY environment variable is required');
  }
}

// Create the MCP server
const server = new Server(
  {
    name: 'philips-hue-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize Hue client (lazily to allow config validation at runtime)
let hueClient: HueClient | null = null;

function getHueClient(): HueClient {
  if (!hueClient) {
    validateConfig();
    hueClient = new HueClient(HUE_BRIDGE_IP!, HUE_API_KEY!);
  }
  return hueClient;
}

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'toggle_light',
        description: 'Turn light on or off for individual or all lights. Can toggle a specific light by ID, turn all lights on, turn all lights off, or toggle all lights.',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['on', 'off', 'toggle'],
              description: 'The action to perform: "on" to turn on, "off" to turn off, "toggle" to switch current state',
            },
            light_id: {
              type: 'string',
              description: 'The ID of the light to control. Use "all" to control all lights, or omit to list available lights.',
            },
          },
          required: ['action'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name !== 'toggle_light') {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }

  try {
    const client = getHueClient();
    const action = args?.action as string;
    const lightId = args?.light_id as string | undefined;

    // If no light_id provided, list available lights
    if (!lightId) {
      const lights = await client.getLights();
      const lightList = Object.entries(lights).map(([id, light]) => ({
        id,
        name: light.name,
        type: light.type,
        on: light.state.on,
        reachable: light.state.reachable,
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                message: 'Available lights. Provide a light_id to control a specific light, or use "all" to control all lights.',
                lights: lightList,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Handle "all" lights
    if (lightId === 'all') {
      let result: unknown;

      switch (action) {
        case 'on':
          result = await client.turnAllOn();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: true,
                    action: 'on',
                    target: 'all',
                    message: 'All lights turned on',
                    details: result,
                  },
                  null,
                  2
                ),
              },
            ],
          };

        case 'off':
          result = await client.turnAllOff();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: true,
                    action: 'off',
                    target: 'all',
                    message: 'All lights turned off',
                    details: result,
                  },
                  null,
                  2
                ),
              },
            ],
          };

        case 'toggle':
          result = await client.toggleAll();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: true,
                    action: 'toggle',
                    target: 'all',
                    message: 'All lights toggled',
                    details: result,
                  },
                  null,
                  2
                ),
              },
            ],
          };

        default:
          throw new McpError(ErrorCode.InvalidParams, `Invalid action: ${action}. Use "on", "off", or "toggle".`);
      }
    }

    // Handle individual light
    switch (action) {
      case 'on': {
        const response = await client.turnOn(lightId);
        const light = await client.getLight(lightId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  action: 'on',
                  light_id: lightId,
                  light_name: light.name,
                  message: `Light "${light.name}" turned on`,
                  response,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'off': {
        const response = await client.turnOff(lightId);
        const light = await client.getLight(lightId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  action: 'off',
                  light_id: lightId,
                  light_name: light.name,
                  message: `Light "${light.name}" turned off`,
                  response,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'toggle': {
        const result = await client.toggle(lightId);
        const light = await client.getLight(lightId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  action: 'toggle',
                  light_id: lightId,
                  light_name: light.name,
                  previous_state: result.previousState ? 'on' : 'off',
                  new_state: result.newState ? 'on' : 'off',
                  message: `Light "${light.name}" toggled from ${result.previousState ? 'on' : 'off'} to ${result.newState ? 'on' : 'off'}`,
                  response: result.response,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.InvalidParams, `Invalid action: ${action}. Use "on", "off", or "toggle".`);
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Philips Hue MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
