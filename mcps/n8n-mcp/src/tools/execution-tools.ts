/**
 * Execution Management Tools
 */

import { z } from 'zod';
import type { N8nClient, Execution } from '../n8n-client.js';

// Schema definitions
export const ExecuteWorkflowSchema = z.object({
  workflow_id: z.string().describe('Workflow ID to execute'),
  data: z.record(z.unknown()).optional().describe('Input data for the workflow'),
});

export const ListExecutionsSchema = z.object({
  workflow_id: z.string().optional().describe('Filter by workflow ID'),
  status: z.enum(['success', 'error', 'running', 'waiting']).optional().describe('Filter by status'),
  limit: z.number().min(1).max(100).optional().default(20).describe('Max executions to return'),
});

export const GetExecutionSchema = z.object({
  execution_id: z.string().describe('Execution ID'),
  include_data: z.boolean().optional().default(true).describe('Include full node data in response'),
});

export const DeleteExecutionSchema = z.object({
  execution_id: z.string().describe('Execution ID to delete'),
});

// Tool handlers
export async function executeWorkflow(
  client: N8nClient,
  args: z.infer<typeof ExecuteWorkflowSchema>
): Promise<{ execution_id: string; status: string; message: string }> {
  const execution = await client.executeWorkflow(args.workflow_id, args.data);
  return {
    execution_id: execution.id,
    status: execution.status,
    message: `Workflow execution started with ID: ${execution.id}`,
  };
}

export async function listExecutions(
  client: N8nClient,
  args: z.infer<typeof ListExecutionsSchema>
): Promise<{ executions: Array<{ id: string; workflowId: string; status: string; startedAt: string; stoppedAt?: string }> }> {
  const result = await client.listExecutions({
    workflowId: args.workflow_id,
    status: args.status,
    limit: args.limit,
  });

  return {
    executions: result.data.map((e) => ({
      id: e.id,
      workflowId: e.workflowId,
      status: e.status,
      startedAt: e.startedAt,
      stoppedAt: e.stoppedAt,
    })),
  };
}

export async function getExecution(
  client: N8nClient,
  args: z.infer<typeof GetExecutionSchema>
): Promise<Execution> {
  return client.getExecution(args.execution_id, args.include_data);
}

export async function deleteExecution(
  client: N8nClient,
  args: z.infer<typeof DeleteExecutionSchema>
): Promise<{ message: string }> {
  await client.deleteExecution(args.execution_id);
  return { message: `Execution ${args.execution_id} deleted successfully` };
}
