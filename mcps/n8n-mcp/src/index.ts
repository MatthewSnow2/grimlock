#!/usr/bin/env node

/**
 * n8n MCP Server
 * Provides AI assistants with the ability to manage n8n workflows
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { N8nClient, N8nApiError } from './n8n-client.js';

// Import tool schemas
import {
  ListWorkflowsSchema,
  GetWorkflowSchema,
  CreateWorkflowSchema,
  UpdateWorkflowSchema,
  DeleteWorkflowSchema,
  ActivateWorkflowSchema,
  DeactivateWorkflowSchema,
  listWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  activateWorkflow,
  deactivateWorkflow,
} from './tools/workflow-tools.js';

import {
  ExecuteWorkflowSchema,
  ListExecutionsSchema,
  GetExecutionSchema,
  DeleteExecutionSchema,
  executeWorkflow,
  listExecutions,
  getExecution,
  deleteExecution,
} from './tools/execution-tools.js';

import {
  SearchNodesSchema,
  GetNodeInfoSchema,
  searchNodes,
  getNodeInfo,
} from './tools/node-tools.js';

import {
  SearchTemplatesSchema,
  GetTemplateSchema,
  searchTemplates,
  getTemplate,
} from './tools/template-tools.js';

import {
  ListCredentialsSchema,
  listCredentials,
} from './tools/credential-tools.js';

// Validate environment variables
function validateEnvironment(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.N8N_BASE_URL;
  const apiKey = process.env.N8N_API_KEY;

  if (!baseUrl) {
    throw new Error('N8N_BASE_URL environment variable is required');
  }
  if (!apiKey) {
    throw new Error('N8N_API_KEY environment variable is required');
  }

  return { baseUrl, apiKey };
}

// Create the MCP server
async function main() {
  const config = validateEnvironment();
  const client = new N8nClient(config);

  const server = new McpServer({
    name: 'n8n-mcp',
    version: '0.1.0',
  });

  // Register all tools

  // --- Workflow Management Tools ---
  server.tool(
    'list_workflows',
    'List all workflows in the n8n instance. Use when user wants to see available workflows or find a specific one.',
    ListWorkflowsSchema.shape,
    async (args) => {
      try {
        const result = await listWorkflows(client, args);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleError(error);
      }
    }
  );

  server.tool(
    'get_workflow',
    'Get full details of a workflow including nodes and connections. Use when user wants to inspect or understand a workflow.',
    GetWorkflowSchema.shape,
    async (args) => {
      try {
        const result = await getWorkflow(client, args);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleError(error);
      }
    }
  );

  server.tool(
    'create_workflow',
    'Create a new workflow from a specification. Use when user wants to build a new automation.',
    CreateWorkflowSchema.shape,
    async (args) => {
      try {
        const result = await createWorkflow(client, args);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleError(error);
      }
    }
  );

  server.tool(
    'update_workflow',
    "Update an existing workflow's configuration. Use when user wants to modify nodes, connections, or settings.",
    UpdateWorkflowSchema.shape,
    async (args) => {
      try {
        const result = await updateWorkflow(client, args);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleError(error);
      }
    }
  );

  server.tool(
    'delete_workflow',
    'Delete a workflow permanently. Use with caution - confirm with user first.',
    DeleteWorkflowSchema.shape,
    async (args) => {
      try {
        const result = await deleteWorkflow(client, args);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleError(error);
      }
    }
  );

  server.tool(
    'activate_workflow',
    'Activate a workflow to enable triggers. Use when user wants to turn on a workflow.',
    ActivateWorkflowSchema.shape,
    async (args) => {
      try {
        const result = await activateWorkflow(client, args);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleError(error);
      }
    }
  );

  server.tool(
    'deactivate_workflow',
    'Deactivate a workflow to disable triggers. Use when user wants to pause or stop a workflow.',
    DeactivateWorkflowSchema.shape,
    async (args) => {
      try {
        const result = await deactivateWorkflow(client, args);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleError(error);
      }
    }
  );

  // --- Execution Management Tools ---
  server.tool(
    'execute_workflow',
    'Manually trigger a workflow execution with optional input data. Use when user wants to test or run a workflow.',
    ExecuteWorkflowSchema.shape,
    async (args) => {
      try {
        const result = await executeWorkflow(client, args);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleError(error);
      }
    }
  );

  server.tool(
    'list_executions',
    'List workflow executions with optional filters. Use when user wants to see execution history.',
    ListExecutionsSchema.shape,
    async (args) => {
      try {
        const result = await listExecutions(client, args);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleError(error);
      }
    }
  );

  server.tool(
    'get_execution',
    'Get detailed execution data including node outputs. Use when user wants to debug or inspect an execution.',
    GetExecutionSchema.shape,
    async (args) => {
      try {
        const result = await getExecution(client, args);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleError(error);
      }
    }
  );

  server.tool(
    'delete_execution',
    'Delete an execution record. Use when user wants to clean up execution history.',
    DeleteExecutionSchema.shape,
    async (args) => {
      try {
        const result = await deleteExecution(client, args);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleError(error);
      }
    }
  );

  // --- Node Discovery Tools ---
  server.tool(
    'search_nodes',
    'Search available n8n nodes by keyword. Use when user wants to find nodes for building workflows.',
    SearchNodesSchema.shape,
    async (args) => {
      try {
        const result = searchNodes(args);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleError(error);
      }
    }
  );

  server.tool(
    'get_node_info',
    'Get detailed information about a specific node type. Use when user needs to understand node parameters.',
    GetNodeInfoSchema.shape,
    async (args) => {
      try {
        const result = getNodeInfo(args);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleError(error);
      }
    }
  );

  // --- Template Discovery Tools ---
  server.tool(
    'search_templates',
    'Search n8n workflow templates from the community. Use when user wants inspiration or starting points.',
    SearchTemplatesSchema.shape,
    async (args) => {
      try {
        const result = await searchTemplates(client, args);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleError(error);
      }
    }
  );

  server.tool(
    'get_template',
    'Get full template workflow definition. Use when user wants to deploy a template.',
    GetTemplateSchema.shape,
    async (args) => {
      try {
        const result = await getTemplate(client, args);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleError(error);
      }
    }
  );

  // --- Credential Tools ---
  server.tool(
    'list_credentials',
    'List available credentials in the instance. Use when user needs to know what credentials are configured.',
    ListCredentialsSchema.shape,
    async (args) => {
      try {
        const result = await listCredentials(client, args);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleError(error);
      }
    }
  );

  // Start the server
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Error handler
function handleError(error: unknown): { content: Array<{ type: 'text'; text: string }>; isError: true } {
  let message: string;

  if (error instanceof N8nApiError) {
    message = `n8n API Error (${error.statusCode}): ${error.message}`;
  } else if (error instanceof z.ZodError) {
    message = `Validation Error: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
  } else if (error instanceof Error) {
    message = `Error: ${error.message}`;
  } else {
    message = 'An unknown error occurred';
  }

  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

main().catch((error) => {
  console.error('Failed to start n8n MCP server:', error);
  process.exit(1);
});
