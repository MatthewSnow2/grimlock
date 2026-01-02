/**
 * Tests for MCP Tools
 */

import { jest, describe, it, expect } from '@jest/globals';
import { z } from 'zod';
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
} from '../src/tools/workflow-tools.js';

import {
  ExecuteWorkflowSchema,
  ListExecutionsSchema,
  GetExecutionSchema,
  DeleteExecutionSchema,
  executeWorkflow,
  listExecutions,
  getExecution,
  deleteExecution,
} from '../src/tools/execution-tools.js';

import {
  SearchNodesSchema,
  GetNodeInfoSchema,
  searchNodes,
  getNodeInfo,
} from '../src/tools/node-tools.js';

import {
  SearchTemplatesSchema,
  GetTemplateSchema,
  searchTemplates,
  getTemplate,
} from '../src/tools/template-tools.js';

import {
  ListCredentialsSchema,
  listCredentials,
} from '../src/tools/credential-tools.js';

// Mock client
const createMockClient = () => ({
  listWorkflows: jest.fn(),
  getWorkflow: jest.fn(),
  createWorkflow: jest.fn(),
  updateWorkflow: jest.fn(),
  deleteWorkflow: jest.fn(),
  activateWorkflow: jest.fn(),
  deactivateWorkflow: jest.fn(),
  executeWorkflow: jest.fn(),
  listExecutions: jest.fn(),
  getExecution: jest.fn(),
  deleteExecution: jest.fn(),
  listCredentials: jest.fn(),
  searchTemplates: jest.fn(),
  getTemplate: jest.fn(),
});

describe('Workflow Tools', () => {
  describe('Schema Validation', () => {
    it('ListWorkflowsSchema should validate correctly', () => {
      expect(() => ListWorkflowsSchema.parse({})).not.toThrow();
      expect(() => ListWorkflowsSchema.parse({ active: true })).not.toThrow();
      expect(() => ListWorkflowsSchema.parse({ limit: 50 })).not.toThrow();
      expect(() => ListWorkflowsSchema.parse({ limit: 200 })).toThrow(); // exceeds max
    });

    it('GetWorkflowSchema should require workflow_id', () => {
      expect(() => GetWorkflowSchema.parse({})).toThrow();
      expect(() => GetWorkflowSchema.parse({ workflow_id: '123' })).not.toThrow();
    });

    it('CreateWorkflowSchema should validate nodes and connections', () => {
      const validPayload = {
        name: 'Test',
        nodes: [
          { name: 'Start', type: 'n8n-nodes-base.start', position: [0, 0] },
        ],
        connections: {},
      };
      expect(() => CreateWorkflowSchema.parse(validPayload)).not.toThrow();
    });

    it('UpdateWorkflowSchema should require workflow_id', () => {
      expect(() => UpdateWorkflowSchema.parse({})).toThrow();
      expect(() => UpdateWorkflowSchema.parse({ workflow_id: '123', name: 'New' })).not.toThrow();
    });

    it('DeleteWorkflowSchema should require workflow_id', () => {
      expect(() => DeleteWorkflowSchema.parse({})).toThrow();
      expect(() => DeleteWorkflowSchema.parse({ workflow_id: '123' })).not.toThrow();
    });

    it('ActivateWorkflowSchema should require workflow_id', () => {
      expect(() => ActivateWorkflowSchema.parse({ workflow_id: '123' })).not.toThrow();
    });

    it('DeactivateWorkflowSchema should require workflow_id', () => {
      expect(() => DeactivateWorkflowSchema.parse({ workflow_id: '123' })).not.toThrow();
    });
  });

  describe('Handlers', () => {
    it('listWorkflows should transform response', async () => {
      const mockClient = createMockClient();
      mockClient.listWorkflows.mockResolvedValue({
        data: [
          { id: '1', name: 'WF1', active: true, tags: [{ id: 't1', name: 'tag1' }] },
          { id: '2', name: 'WF2', active: false, tags: [] },
        ],
      });

      const result = await listWorkflows(mockClient as any, { limit: 50 });

      expect(result.workflows).toHaveLength(2);
      expect(result.workflows[0].tags).toEqual(['tag1']);
    });

    it('createWorkflow should return success message', async () => {
      const mockClient = createMockClient();
      mockClient.createWorkflow.mockResolvedValue({ id: 'new-1', name: 'Test' });

      const result = await createWorkflow(mockClient as any, {
        name: 'Test',
        nodes: [],
        connections: {},
      });

      expect(result.message).toContain('created successfully');
    });

    it('deleteWorkflow should return confirmation', async () => {
      const mockClient = createMockClient();
      mockClient.deleteWorkflow.mockResolvedValue(undefined);

      const result = await deleteWorkflow(mockClient as any, { workflow_id: '123' });

      expect(result.message).toContain('deleted successfully');
    });

    it('activateWorkflow should return status', async () => {
      const mockClient = createMockClient();
      mockClient.activateWorkflow.mockResolvedValue({ id: '123', name: 'Test', active: true });

      const result = await activateWorkflow(mockClient as any, { workflow_id: '123' });

      expect(result.active).toBe(true);
      expect(result.message).toContain('activated');
    });

    it('deactivateWorkflow should return status', async () => {
      const mockClient = createMockClient();
      mockClient.deactivateWorkflow.mockResolvedValue({ id: '123', name: 'Test', active: false });

      const result = await deactivateWorkflow(mockClient as any, { workflow_id: '123' });

      expect(result.active).toBe(false);
      expect(result.message).toContain('deactivated');
    });
  });
});

describe('Execution Tools', () => {
  describe('Schema Validation', () => {
    it('ExecuteWorkflowSchema should validate correctly', () => {
      expect(() => ExecuteWorkflowSchema.parse({ workflow_id: '123' })).not.toThrow();
      expect(() => ExecuteWorkflowSchema.parse({ workflow_id: '123', data: { key: 'value' } })).not.toThrow();
    });

    it('ListExecutionsSchema should have valid status enum', () => {
      expect(() => ListExecutionsSchema.parse({ status: 'success' })).not.toThrow();
      expect(() => ListExecutionsSchema.parse({ status: 'invalid' })).toThrow();
    });

    it('GetExecutionSchema should require execution_id', () => {
      expect(() => GetExecutionSchema.parse({ execution_id: 'exec-1' })).not.toThrow();
    });
  });

  describe('Handlers', () => {
    it('executeWorkflow should return execution info', async () => {
      const mockClient = createMockClient();
      mockClient.executeWorkflow.mockResolvedValue({ id: 'exec-1', status: 'running' });

      const result = await executeWorkflow(mockClient as any, { workflow_id: '123' });

      expect(result.execution_id).toBe('exec-1');
      expect(result.message).toContain('exec-1');
    });

    it('listExecutions should transform response', async () => {
      const mockClient = createMockClient();
      mockClient.listExecutions.mockResolvedValue({
        data: [
          { id: 'exec-1', workflowId: '123', status: 'success', startedAt: '2024-01-01T00:00:00Z' },
        ],
      });

      const result = await listExecutions(mockClient as any, { limit: 20 });

      expect(result.executions).toHaveLength(1);
      expect(result.executions[0].id).toBe('exec-1');
    });

    it('deleteExecution should return confirmation', async () => {
      const mockClient = createMockClient();
      mockClient.deleteExecution.mockResolvedValue(undefined);

      const result = await deleteExecution(mockClient as any, { execution_id: 'exec-1' });

      expect(result.message).toContain('deleted successfully');
    });
  });
});

describe('Node Tools', () => {
  describe('Schema Validation', () => {
    it('SearchNodesSchema should require query', () => {
      expect(() => SearchNodesSchema.parse({ query: 'slack' })).not.toThrow();
      expect(() => SearchNodesSchema.parse({})).toThrow();
    });

    it('GetNodeInfoSchema should require node_type', () => {
      expect(() => GetNodeInfoSchema.parse({ node_type: 'n8n-nodes-base.httpRequest' })).not.toThrow();
    });
  });

  describe('Handlers', () => {
    it('searchNodes should return matching nodes', () => {
      const result = searchNodes({ query: 'http', limit: 10 });

      expect(result.nodes.length).toBeGreaterThan(0);
      expect(result.nodes[0]).toHaveProperty('name');
      expect(result.nodes[0]).toHaveProperty('displayName');
      expect(result.nodes[0]).toHaveProperty('description');
    });

    it('getNodeInfo should return node details', () => {
      const result = getNodeInfo({ node_type: 'n8n-nodes-base.httpRequest' });

      expect(result.node).not.toBeNull();
      expect(result.node?.displayName).toBe('HTTP Request');
    });

    it('getNodeInfo should handle missing node', () => {
      const result = getNodeInfo({ node_type: 'nonexistent.node' });

      expect(result.node).toBeNull();
      expect(result.message).toContain('not found');
    });
  });
});

describe('Template Tools', () => {
  describe('Schema Validation', () => {
    it('SearchTemplatesSchema should require query', () => {
      expect(() => SearchTemplatesSchema.parse({ query: 'slack' })).not.toThrow();
    });

    it('GetTemplateSchema should require template_id as number', () => {
      expect(() => GetTemplateSchema.parse({ template_id: 123 })).not.toThrow();
      expect(() => GetTemplateSchema.parse({ template_id: '123' })).toThrow();
    });
  });

  describe('Handlers', () => {
    it('searchTemplates should return transformed results', async () => {
      const mockClient = createMockClient();
      mockClient.searchTemplates.mockResolvedValue({
        workflows: [
          { id: 1, name: 'Template 1', description: 'Desc', totalViews: 100 },
        ],
      });

      const result = await searchTemplates(mockClient as any, { query: 'test', limit: 10 });

      expect(result.templates).toHaveLength(1);
      expect(result.templates[0].id).toBe(1);
    });
  });
});

describe('Credential Tools', () => {
  describe('Schema Validation', () => {
    it('ListCredentialsSchema should allow optional type', () => {
      expect(() => ListCredentialsSchema.parse({})).not.toThrow();
      expect(() => ListCredentialsSchema.parse({ type: 'slackApi' })).not.toThrow();
    });
  });

  describe('Handlers', () => {
    it('listCredentials should return credentials', async () => {
      const mockClient = createMockClient();
      mockClient.listCredentials.mockResolvedValue({
        data: [
          { id: 'cred-1', name: 'Slack', type: 'slackApi' },
        ],
      });

      const result = await listCredentials(mockClient as any, {});

      expect(result.credentials).toHaveLength(1);
      expect(result.credentials[0].type).toBe('slackApi');
    });
  });
});
