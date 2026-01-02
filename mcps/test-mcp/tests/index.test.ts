import { describe, it, expect, beforeEach } from "vitest";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

describe("test-mcp", () => {
  let server: Server;
  let toolsHandler: Function;
  let callToolHandler: Function;

  beforeEach(() => {
    server = new Server(
      {
        name: "test-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Capture handlers when set
    const originalSetRequestHandler = server.setRequestHandler.bind(server);
    server.setRequestHandler = (schema: any, handler: any) => {
      if (schema === ListToolsRequestSchema) {
        toolsHandler = handler;
      } else if (schema === CallToolRequestSchema) {
        callToolHandler = handler;
      }
      return originalSetRequestHandler(schema, handler);
    };

    // Set up handlers
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "hello_world",
            description: "Returns a greeting",
            inputSchema: {
              type: "object",
              properties: {},
              required: [],
            },
          },
        ],
      };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name } = request.params;

      if (name === "hello_world") {
        return {
          content: [
            {
              type: "text",
              text: "Hello, World! This is a test MCP server.",
            },
          ],
        };
      }

      throw new Error(`Unknown tool: ${name}`);
    });
  });

  describe("ListTools", () => {
    it("should return hello_world tool", async () => {
      const result = await toolsHandler({});
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].name).toBe("hello_world");
      expect(result.tools[0].description).toBe("Returns a greeting");
    });

    it("should have correct input schema for hello_world", async () => {
      const result = await toolsHandler({});
      const tool = result.tools[0];
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.inputSchema.properties).toEqual({});
      expect(tool.inputSchema.required).toEqual([]);
    });
  });

  describe("CallTool", () => {
    it("should return greeting for hello_world", async () => {
      const result = await callToolHandler({
        params: { name: "hello_world", arguments: {} },
      });
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toBe(
        "Hello, World! This is a test MCP server."
      );
    });

    it("should throw error for unknown tool", async () => {
      await expect(
        callToolHandler({
          params: { name: "unknown_tool", arguments: {} },
        })
      ).rejects.toThrow("Unknown tool: unknown_tool");
    });
  });

  describe("Server instance", () => {
    it("should be a valid Server instance", () => {
      expect(server).toBeInstanceOf(Server);
    });
  });
});
