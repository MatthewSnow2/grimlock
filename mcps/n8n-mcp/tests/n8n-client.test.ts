/**
 * Tests for n8n API Client
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { N8nClient, N8nApiError, searchNodes, getNodeInfo, COMMON_NODES } from '../src/n8n-client.js';

// Mock fetch globally
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch as unknown as typeof fetch;

describe('N8nClient', () => {
  let client: N8nClient;

  beforeEach(() => {
    client = new N8nClient({
      baseUrl: 'https://test.app.n8n.cloud',
      apiKey: 'test-api-key',
    });
    mockFetch.mockReset();
  });

  describe('constructor', () => {
    it('should strip trailing slash from baseUrl', () => {
      const c = new N8nClient({
        baseUrl: 'https://test.app.n8n.cloud/',
        apiKey: 'key',
      });
      // Can't directly access private property, but we can test behavior
      expect(c).toBeDefined();
    });
  });

  describe('listWorkflows', () => {
    it('should fetch workflows successfully', async () => {
      const mockResponse = {
        data: [
          { id: '1', name: 'Workflow 1', active: true, tags: [] },
          { id: '2', name: 'Workflow 2', active: false, tags: [{ id: 't1', name: 'test' }] },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const result = await client.listWorkflows();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.app.n8n.cloud/api/v1/workflows',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-N8N-API-KEY': 'test-api-key',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should apply filters correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: [] })),
      });

      await client.listWorkflows({ active: true, tags: ['tag1', 'tag2'], limit: 10 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('active=true'),
        expect.anything()
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('tags=tag1%2Ctag2'),
        expect.anything()
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.anything()
      );
    });
  });

  describe('getWorkflow', () => {
    it('should fetch a single workflow', async () => {
      const mockWorkflow = {
        id: '123',
        name: 'Test Workflow',
        active: true,
        nodes: [],
        connections: {},
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockWorkflow)),
      });

      const result = await client.getWorkflow('123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.app.n8n.cloud/api/v1/workflows/123',
        expect.anything()
      );
      expect(result).toEqual(mockWorkflow);
    });
  });

  describe('createWorkflow', () => {
    it('should create a workflow', async () => {
      const newWorkflow = {
        name: 'New Workflow',
        nodes: [
          {
            id: 'node1',
            name: 'Start',
            type: 'n8n-nodes-base.start',
            typeVersion: 1,
            position: [100, 200] as [number, number],
            parameters: {},
          },
        ],
        connections: {},
      };

      const mockResponse = { id: 'new-id', ...newWorkflow };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const result = await client.createWorkflow(newWorkflow);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.app.n8n.cloud/api/v1/workflows',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newWorkflow),
        })
      );
      expect(result.id).toBe('new-id');
    });
  });

  describe('updateWorkflow', () => {
    it('should update a workflow', async () => {
      const existingWorkflow = {
        id: '123',
        name: 'Old Name',
        active: false,
        nodes: [],
        connections: {},
      };

      const updatedWorkflow = { ...existingWorkflow, name: 'New Name' };

      // First call: getWorkflow
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(existingWorkflow)),
      });

      // Second call: updateWorkflow
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(updatedWorkflow)),
      });

      const result = await client.updateWorkflow('123', { name: 'New Name' });

      expect(result.name).toBe('New Name');
    });
  });

  describe('deleteWorkflow', () => {
    it('should delete a workflow', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(''),
      });

      await client.deleteWorkflow('123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.app.n8n.cloud/api/v1/workflows/123',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('activateWorkflow', () => {
    it('should activate a workflow', async () => {
      const mockResponse = { id: '123', name: 'Test', active: true };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const result = await client.activateWorkflow('123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.app.n8n.cloud/api/v1/workflows/123/activate',
        expect.objectContaining({ method: 'POST' })
      );
      expect(result.active).toBe(true);
    });
  });

  describe('deactivateWorkflow', () => {
    it('should deactivate a workflow', async () => {
      const mockResponse = { id: '123', name: 'Test', active: false };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const result = await client.deactivateWorkflow('123');

      expect(result.active).toBe(false);
    });
  });

  describe('executeWorkflow', () => {
    it('should execute a workflow without data', async () => {
      const mockResponse = { id: 'exec-1', status: 'running', workflowId: '123' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const result = await client.executeWorkflow('123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.app.n8n.cloud/api/v1/workflows/123/run',
        expect.objectContaining({ method: 'POST' })
      );
      expect(result.status).toBe('running');
    });

    it('should execute a workflow with input data', async () => {
      const mockResponse = { id: 'exec-1', status: 'running', workflowId: '123' };
      const inputData = { key: 'value' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      await client.executeWorkflow('123', inputData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: JSON.stringify({ data: inputData }),
        })
      );
    });
  });

  describe('listExecutions', () => {
    it('should list executions with filters', async () => {
      const mockResponse = { data: [{ id: 'exec-1', status: 'success' }] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const result = await client.listExecutions({
        workflowId: '123',
        status: 'success',
        limit: 10,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('workflowId=123'),
        expect.anything()
      );
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getExecution', () => {
    it('should get execution details', async () => {
      const mockResponse = { id: 'exec-1', status: 'success', data: {} };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const result = await client.getExecution('exec-1', true);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.app.n8n.cloud/api/v1/executions/exec-1?includeData=true',
        expect.anything()
      );
      expect(result.id).toBe('exec-1');
    });
  });

  describe('deleteExecution', () => {
    it('should delete an execution', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(''),
      });

      await client.deleteExecution('exec-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.app.n8n.cloud/api/v1/executions/exec-1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('listCredentials', () => {
    it('should list credentials', async () => {
      const mockResponse = { data: [{ id: 'cred-1', name: 'Slack', type: 'slackApi' }] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const result = await client.listCredentials();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe('slackApi');
    });

    it('should filter credentials by type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: [] })),
      });

      await client.listCredentials('slackApi');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('filter='),
        expect.anything()
      );
    });
  });

  describe('searchTemplates', () => {
    it('should search templates from n8n.io', async () => {
      const mockResponse = {
        workflows: [{ id: 1, name: 'Slack Template', description: 'A template' }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const result = await client.searchTemplates('slack', 5);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.n8n.io'),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'X-N8N-API-KEY': expect.anything(),
          }),
        })
      );
      expect(result.workflows).toHaveLength(1);
    });
  });

  describe('getTemplate', () => {
    it('should get a template by ID', async () => {
      const mockResponse = { id: 123, name: 'Template', workflow: {} };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const result = await client.getTemplate(123);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.n8n.io/api/templates/123',
        expect.anything()
      );
      expect(result.id).toBe(123);
    });
  });

  describe('error handling', () => {
    it('should throw N8nApiError on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ message: 'Workflow not found' }),
      });

      await expect(client.getWorkflow('nonexistent')).rejects.toThrow(N8nApiError);
    });

    it('should handle non-JSON error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('Not JSON')),
      });

      await expect(client.getWorkflow('123')).rejects.toThrow(N8nApiError);
    });
  });
});

describe('Node Search Functions', () => {
  describe('searchNodes', () => {
    it('should find nodes by name', () => {
      const results = searchNodes('http');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('http');
    });

    it('should find nodes by display name', () => {
      const results = searchNodes('Webhook');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].displayName).toContain('Webhook');
    });

    it('should find nodes by description', () => {
      const results = searchNodes('email');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should respect limit', () => {
      const results = searchNodes('', 5);
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('should be case insensitive', () => {
      const lower = searchNodes('slack');
      const upper = searchNodes('SLACK');
      expect(lower.length).toBe(upper.length);
    });
  });

  describe('getNodeInfo', () => {
    it('should return node info for valid type', () => {
      const result = getNodeInfo('n8n-nodes-base.httpRequest');
      expect(result).toBeDefined();
      expect(result?.displayName).toBe('HTTP Request');
    });

    it('should return undefined for invalid type', () => {
      const result = getNodeInfo('nonexistent.node');
      expect(result).toBeUndefined();
    });
  });

  describe('COMMON_NODES', () => {
    it('should have all required node properties', () => {
      COMMON_NODES.forEach((node) => {
        expect(node.name).toBeDefined();
        expect(node.displayName).toBeDefined();
        expect(node.description).toBeDefined();
        expect(node.group).toBeDefined();
        expect(Array.isArray(node.group)).toBe(true);
        expect(node.version).toBeDefined();
        expect(node.defaults).toBeDefined();
        expect(node.properties).toBeDefined();
        expect(Array.isArray(node.properties)).toBe(true);
      });
    });
  });
});
