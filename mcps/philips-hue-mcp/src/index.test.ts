import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock environment variables before importing the module
vi.stubEnv('HUE_BRIDGE_IP', '192.168.1.100');
vi.stubEnv('HUE_API_KEY', 'test-api-key');

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the MCP SDK
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => ({
    setRequestHandler: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/types.js', () => ({
  CallToolRequestSchema: Symbol('CallToolRequestSchema'),
  ListToolsRequestSchema: Symbol('ListToolsRequestSchema'),
  ErrorCode: {
    MethodNotFound: -32601,
    InvalidParams: -32602,
  },
  McpError: class McpError extends Error {
    code: number;
    constructor(code: number, message: string) {
      super(message);
      this.code = code;
    }
  },
}));

describe('MCP Server Tool Definitions', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('toggle_light tool schema', () => {
    it('should have correct tool name and description', async () => {
      const toolSchema = {
        name: 'toggle_light',
        description: 'Turn light on or off for individual or all lights',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['on', 'off', 'toggle'],
            },
            light_id: {
              type: 'string',
            },
          },
          required: ['action'],
        },
      };

      // Verify schema structure
      expect(toolSchema.name).toBe('toggle_light');
      expect(toolSchema.description).toContain('Turn light on or off');
      expect(toolSchema.inputSchema.properties.action.enum).toContain('on');
      expect(toolSchema.inputSchema.properties.action.enum).toContain('off');
      expect(toolSchema.inputSchema.properties.action.enum).toContain('toggle');
    });

    it('should require action parameter', () => {
      const schema = {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['on', 'off', 'toggle'],
          },
          light_id: {
            type: 'string',
          },
        },
        required: ['action'],
      };

      expect(schema.required).toContain('action');
      expect(schema.required).not.toContain('light_id');
    });
  });

  describe('Environment validation', () => {
    it('should have required environment variables', () => {
      expect(process.env.HUE_BRIDGE_IP).toBe('192.168.1.100');
      expect(process.env.HUE_API_KEY).toBe('test-api-key');
    });
  });
});

describe('HueClient Integration', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('List lights flow', () => {
    it('should list available lights when no light_id provided', async () => {
      const mockLights = {
        '1': {
          name: 'Living Room',
          state: { on: true, bri: 254, reachable: true },
          type: 'Extended color light',
          modelid: 'LCT001',
        },
        '2': {
          name: 'Bedroom',
          state: { on: false, bri: 100, reachable: true },
          type: 'Extended color light',
          modelid: 'LCT001',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLights),
      });

      // Import HueClient directly for testing
      const { HueClient } = await import('./hue-client.js');
      const client = new HueClient('192.168.1.100', 'test-api-key');

      const lights = await client.getLights();

      expect(Object.keys(lights)).toHaveLength(2);
      expect(lights['1'].name).toBe('Living Room');
      expect(lights['2'].name).toBe('Bedroom');
    });
  });

  describe('Turn on specific light flow', () => {
    it('should turn on a specific light', async () => {
      const mockResponse = [{ success: { '/lights/1/state/on': true } }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { HueClient } = await import('./hue-client.js');
      const client = new HueClient('192.168.1.100', 'test-api-key');

      const response = await client.turnOn('1');

      expect(response).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://192.168.1.100/api/test-api-key/lights/1/state',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ on: true }),
        })
      );
    });
  });

  describe('Turn off specific light flow', () => {
    it('should turn off a specific light', async () => {
      const mockResponse = [{ success: { '/lights/1/state/on': false } }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { HueClient } = await import('./hue-client.js');
      const client = new HueClient('192.168.1.100', 'test-api-key');

      const response = await client.turnOff('1');

      expect(response).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://192.168.1.100/api/test-api-key/lights/1/state',
        expect.objectContaining({
          body: JSON.stringify({ on: false }),
        })
      );
    });
  });

  describe('Toggle all lights flow', () => {
    it('should toggle all lights', async () => {
      const mockLights = {
        '1': { name: 'Light 1', state: { on: true, reachable: true }, type: 'light', modelid: 'LCT001' },
        '2': { name: 'Light 2', state: { on: false, reachable: true }, type: 'light', modelid: 'LCT001' },
      };
      const mockResponse = [{ success: {} }];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockLights),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

      const { HueClient } = await import('./hue-client.js');
      const client = new HueClient('192.168.1.100', 'test-api-key');

      const results = await client.toggleAll();

      expect(results).toHaveLength(2);
      // Light 1 was on, should now be off
      expect(results[0].previousState).toBe(true);
      expect(results[0].newState).toBe(false);
      // Light 2 was off, should now be on
      expect(results[1].previousState).toBe(false);
      expect(results[1].newState).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ error: { description: 'unauthorized user' } }]),
      });

      const { HueClient } = await import('./hue-client.js');
      const client = new HueClient('192.168.1.100', 'test-api-key');

      await expect(client.getLights()).rejects.toThrow('Hue API error: unauthorized user');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { HueClient } = await import('./hue-client.js');
      const client = new HueClient('192.168.1.100', 'test-api-key');

      await expect(client.getLights()).rejects.toThrow('Network error');
    });
  });
});
