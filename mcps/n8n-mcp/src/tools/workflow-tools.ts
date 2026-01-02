/**
 * Workflow Management Tools
 */

import { z } from 'zod';
import type { N8nClient, Workflow, WorkflowNode, NodeConnections, WorkflowSettings } from '../n8n-client.js';

// Schema definitions
export const ListWorkflowsSchema = z.object({
  active: z.boolean().optional().describe('Filter by active status'),
  tags: z.array(z.string()).optional().describe('Filter by tags'),
  limit: z.number().min(1).max(100).optional().default(50).describe('Max workflows to return'),
});

export const GetWorkflowSchema = z.object({
  workflow_id: z.string().describe('Workflow ID'),
});

export const CreateWorkflowSchema = z.object({
  name: z.string().describe('Workflow name'),
  nodes: z.array(z.object({
    id: z.string().optional(),
    name: z.string(),
    type: z.string(),
    typeVersion: z.number().optional().default(1),
    position: z.tuple([z.number(), z.number()]),
    parameters: z.record(z.unknown()).optional().default({}),
    credentials: z.record(z.object({ id: z.string(), name: z.string() })).optional(),
  })).describe('Array of node configurations'),
  connections: z.record(z.object({
    main: z.array(z.array(z.object({
      node: z.string(),
      type: z.string(),
      index: z.number(),
    }))).optional(),
  })).describe('Node connection mappings'),
  settings: z.object({
    timezone: z.string().optional(),
    saveManualExecutions: z.boolean().optional(),
    callerPolicy: z.string().optional(),
    errorWorkflow: z.string().optional(),
  }).optional().describe('Workflow settings'),
});

export const UpdateWorkflowSchema = z.object({
  workflow_id: z.string().describe('Workflow ID to update'),
  name: z.string().optional().describe('New workflow name'),
  nodes: z.array(z.object({
    id: z.string().optional(),
    name: z.string(),
    type: z.string(),
    typeVersion: z.number().optional().default(1),
    position: z.tuple([z.number(), z.number()]),
    parameters: z.record(z.unknown()).optional().default({}),
    credentials: z.record(z.object({ id: z.string(), name: z.string() })).optional(),
  })).optional().describe('Updated nodes array'),
  connections: z.record(z.object({
    main: z.array(z.array(z.object({
      node: z.string(),
      type: z.string(),
      index: z.number(),
    }))).optional(),
  })).optional().describe('Updated connections'),
  settings: z.object({
    timezone: z.string().optional(),
    saveManualExecutions: z.boolean().optional(),
    callerPolicy: z.string().optional(),
    errorWorkflow: z.string().optional(),
  }).optional().describe('Updated settings'),
});

export const DeleteWorkflowSchema = z.object({
  workflow_id: z.string().describe('Workflow ID to delete'),
});

export const ActivateWorkflowSchema = z.object({
  workflow_id: z.string().describe('Workflow ID to activate'),
});

export const DeactivateWorkflowSchema = z.object({
  workflow_id: z.string().describe('Workflow ID to deactivate'),
});

// Tool handlers
export async function listWorkflows(
  client: N8nClient,
  args: z.infer<typeof ListWorkflowsSchema>
): Promise<{ workflows: Array<{ id: string; name: string; active: boolean; tags: string[] }> }> {
  const result = await client.listWorkflows({
    active: args.active,
    tags: args.tags,
    limit: args.limit,
  });

  return {
    workflows: result.data.map((w) => ({
      id: w.id,
      name: w.name,
      active: w.active,
      tags: w.tags?.map((t) => t.name) || [],
    })),
  };
}

export async function getWorkflow(
  client: N8nClient,
  args: z.infer<typeof GetWorkflowSchema>
): Promise<Workflow> {
  return client.getWorkflow(args.workflow_id);
}

export async function createWorkflow(
  client: N8nClient,
  args: z.infer<typeof CreateWorkflowSchema>
): Promise<{ id: string; name: string; message: string }> {
  const workflow = await client.createWorkflow({
    name: args.name,
    nodes: args.nodes as WorkflowNode[],
    connections: args.connections as Record<string, NodeConnections>,
    settings: args.settings as WorkflowSettings,
  });

  return {
    id: workflow.id,
    name: workflow.name,
    message: `Workflow "${workflow.name}" created successfully`,
  };
}

export async function updateWorkflow(
  client: N8nClient,
  args: z.infer<typeof UpdateWorkflowSchema>
): Promise<{ id: string; name: string; message: string }> {
  const updates: Partial<{
    name: string;
    nodes: WorkflowNode[];
    connections: Record<string, NodeConnections>;
    settings: WorkflowSettings;
  }> = {};

  if (args.name) updates.name = args.name;
  if (args.nodes) updates.nodes = args.nodes as WorkflowNode[];
  if (args.connections) updates.connections = args.connections as Record<string, NodeConnections>;
  if (args.settings) updates.settings = args.settings as WorkflowSettings;

  const workflow = await client.updateWorkflow(args.workflow_id, updates);

  return {
    id: workflow.id,
    name: workflow.name,
    message: `Workflow "${workflow.name}" updated successfully`,
  };
}

export async function deleteWorkflow(
  client: N8nClient,
  args: z.infer<typeof DeleteWorkflowSchema>
): Promise<{ message: string }> {
  await client.deleteWorkflow(args.workflow_id);
  return { message: `Workflow ${args.workflow_id} deleted successfully` };
}

export async function activateWorkflow(
  client: N8nClient,
  args: z.infer<typeof ActivateWorkflowSchema>
): Promise<{ id: string; active: boolean; message: string }> {
  const workflow = await client.activateWorkflow(args.workflow_id);
  return {
    id: workflow.id,
    active: workflow.active,
    message: `Workflow "${workflow.name}" activated`,
  };
}

export async function deactivateWorkflow(
  client: N8nClient,
  args: z.infer<typeof DeactivateWorkflowSchema>
): Promise<{ id: string; active: boolean; message: string }> {
  const workflow = await client.deactivateWorkflow(args.workflow_id);
  return {
    id: workflow.id,
    active: workflow.active,
    message: `Workflow "${workflow.name}" deactivated`,
  };
}
