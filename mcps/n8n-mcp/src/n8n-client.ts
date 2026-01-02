/**
 * n8n API Client
 * Handles all HTTP communication with the n8n instance
 */

export interface N8nConfig {
  baseUrl: string;
  apiKey: string;
}

export interface Workflow {
  id: string;
  name: string;
  active: boolean;
  tags?: Array<{ id: string; name: string }>;
  nodes?: WorkflowNode[];
  connections?: Record<string, NodeConnections>;
  settings?: WorkflowSettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, { id: string; name: string }>;
}

export interface NodeConnections {
  main?: Array<Array<{ node: string; type: string; index: number }>>;
}

export interface WorkflowSettings {
  timezone?: string;
  saveManualExecutions?: boolean;
  callerPolicy?: string;
  errorWorkflow?: string;
}

export interface Execution {
  id: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  status: 'success' | 'error' | 'running' | 'waiting';
  data?: ExecutionData;
}

export interface ExecutionData {
  resultData?: {
    runData?: Record<string, NodeExecutionData[]>;
  };
}

export interface NodeExecutionData {
  startTime: number;
  executionTime: number;
  data: {
    main?: Array<Array<{ json: Record<string, unknown> }>>;
  };
}

export interface Credential {
  id: string;
  name: string;
  type: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Template {
  id: number;
  name: string;
  description: string;
  totalViews: number;
  createdAt: string;
  workflow?: Workflow;
}

export interface N8nNode {
  name: string;
  displayName: string;
  description: string;
  group: string[];
  version: number;
  defaults: Record<string, unknown>;
  properties: NodeProperty[];
}

export interface NodeProperty {
  displayName: string;
  name: string;
  type: string;
  default?: unknown;
  description?: string;
  required?: boolean;
  options?: Array<{ name: string; value: string }>;
}

export class N8nApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'N8nApiError';
  }
}

export class N8nClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: N8nConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    isExternal = false
  ): Promise<T> {
    const url = isExternal ? endpoint : `${this.baseUrl}/api/v1${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Only add API key for n8n instance requests
    if (!isExternal) {
      headers['X-N8N-API-KEY'] = this.apiKey;
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      let errorMessage = `n8n API error: ${response.status} ${response.statusText}`;
      try {
        const errorBody = await response.json() as { message?: string };
        if (errorBody.message) {
          errorMessage = errorBody.message;
        }
      } catch {
        // Ignore JSON parse errors
      }
      throw new N8nApiError(errorMessage, response.status);
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  // Workflow Management
  async listWorkflows(options?: {
    active?: boolean;
    tags?: string[];
    limit?: number;
  }): Promise<{ data: Workflow[] }> {
    const params = new URLSearchParams();
    if (options?.active !== undefined) {
      params.append('active', String(options.active));
    }
    if (options?.tags?.length) {
      params.append('tags', options.tags.join(','));
    }
    if (options?.limit) {
      params.append('limit', String(options.limit));
    }

    const query = params.toString();
    const endpoint = `/workflows${query ? `?${query}` : ''}`;
    return this.request<{ data: Workflow[] }>('GET', endpoint);
  }

  async getWorkflow(workflowId: string): Promise<Workflow> {
    return this.request<Workflow>('GET', `/workflows/${workflowId}`);
  }

  async createWorkflow(workflow: {
    name: string;
    nodes: WorkflowNode[];
    connections: Record<string, NodeConnections>;
    settings?: WorkflowSettings;
  }): Promise<Workflow> {
    return this.request<Workflow>('POST', '/workflows', workflow);
  }

  async updateWorkflow(
    workflowId: string,
    updates: Partial<{
      name: string;
      nodes: WorkflowNode[];
      connections: Record<string, NodeConnections>;
      settings: WorkflowSettings;
    }>
  ): Promise<Workflow> {
    // First get the existing workflow to merge updates
    const existing = await this.getWorkflow(workflowId);
    const merged = { ...existing, ...updates };
    return this.request<Workflow>('PUT', `/workflows/${workflowId}`, merged);
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    await this.request<void>('DELETE', `/workflows/${workflowId}`);
  }

  async activateWorkflow(workflowId: string): Promise<Workflow> {
    return this.request<Workflow>('POST', `/workflows/${workflowId}/activate`);
  }

  async deactivateWorkflow(workflowId: string): Promise<Workflow> {
    return this.request<Workflow>('POST', `/workflows/${workflowId}/deactivate`);
  }

  // Execution Management
  async executeWorkflow(
    workflowId: string,
    data?: Record<string, unknown>
  ): Promise<Execution> {
    const body = data ? { data } : undefined;
    return this.request<Execution>('POST', `/workflows/${workflowId}/run`, body);
  }

  async listExecutions(options?: {
    workflowId?: string;
    status?: 'success' | 'error' | 'running' | 'waiting';
    limit?: number;
  }): Promise<{ data: Execution[] }> {
    const params = new URLSearchParams();
    if (options?.workflowId) {
      params.append('workflowId', options.workflowId);
    }
    if (options?.status) {
      params.append('status', options.status);
    }
    if (options?.limit) {
      params.append('limit', String(options.limit));
    }

    const query = params.toString();
    const endpoint = `/executions${query ? `?${query}` : ''}`;
    return this.request<{ data: Execution[] }>('GET', endpoint);
  }

  async getExecution(
    executionId: string,
    includeData = true
  ): Promise<Execution> {
    const params = includeData ? '?includeData=true' : '';
    return this.request<Execution>('GET', `/executions/${executionId}${params}`);
  }

  async deleteExecution(executionId: string): Promise<void> {
    await this.request<void>('DELETE', `/executions/${executionId}`);
  }

  // Credentials
  async listCredentials(type?: string): Promise<{ data: Credential[] }> {
    const params = type ? `?filter={"type":"${type}"}` : '';
    return this.request<{ data: Credential[] }>('GET', `/credentials${params}`);
  }

  // Templates (from n8n.io public API)
  async searchTemplates(
    query: string,
    limit = 10
  ): Promise<{ workflows: Template[] }> {
    const params = new URLSearchParams({
      search: query,
      limit: String(limit),
    });
    return this.request<{ workflows: Template[] }>(
      'GET',
      `https://api.n8n.io/api/templates?${params}`,
      undefined,
      true
    );
  }

  async getTemplate(templateId: number): Promise<Template> {
    return this.request<Template>(
      'GET',
      `https://api.n8n.io/api/templates/${templateId}`,
      undefined,
      true
    );
  }
}

// Built-in node information for search_nodes and get_node_info
export const COMMON_NODES: N8nNode[] = [
  {
    name: 'n8n-nodes-base.httpRequest',
    displayName: 'HTTP Request',
    description: 'Make HTTP requests to any API or URL',
    group: ['input'],
    version: 4,
    defaults: { name: 'HTTP Request' },
    properties: [
      { displayName: 'Method', name: 'method', type: 'options', default: 'GET', options: [{ name: 'GET', value: 'GET' }, { name: 'POST', value: 'POST' }, { name: 'PUT', value: 'PUT' }, { name: 'DELETE', value: 'DELETE' }] },
      { displayName: 'URL', name: 'url', type: 'string', required: true, description: 'The URL to make the request to' },
    ],
  },
  {
    name: 'n8n-nodes-base.webhook',
    displayName: 'Webhook',
    description: 'Starts the workflow when a webhook is called',
    group: ['trigger'],
    version: 2,
    defaults: { name: 'Webhook' },
    properties: [
      { displayName: 'HTTP Method', name: 'httpMethod', type: 'options', default: 'GET', options: [{ name: 'GET', value: 'GET' }, { name: 'POST', value: 'POST' }] },
      { displayName: 'Path', name: 'path', type: 'string', required: true, description: 'The path to listen on' },
    ],
  },
  {
    name: 'n8n-nodes-base.schedule',
    displayName: 'Schedule Trigger',
    description: 'Triggers the workflow on a schedule',
    group: ['trigger'],
    version: 1,
    defaults: { name: 'Schedule Trigger' },
    properties: [
      { displayName: 'Trigger Times', name: 'triggerTimes', type: 'fixedCollection', description: 'When to trigger the workflow' },
    ],
  },
  {
    name: 'n8n-nodes-base.code',
    displayName: 'Code',
    description: 'Execute custom JavaScript or Python code',
    group: ['transform'],
    version: 2,
    defaults: { name: 'Code' },
    properties: [
      { displayName: 'Language', name: 'language', type: 'options', default: 'javaScript', options: [{ name: 'JavaScript', value: 'javaScript' }, { name: 'Python', value: 'python' }] },
      { displayName: 'Code', name: 'jsCode', type: 'string', description: 'The code to execute' },
    ],
  },
  {
    name: 'n8n-nodes-base.set',
    displayName: 'Set',
    description: 'Sets values on items and optionally remove other values',
    group: ['transform'],
    version: 3,
    defaults: { name: 'Set' },
    properties: [
      { displayName: 'Values to Set', name: 'values', type: 'fixedCollection', description: 'The values to set' },
    ],
  },
  {
    name: 'n8n-nodes-base.if',
    displayName: 'IF',
    description: 'Route items to different branches based on conditions',
    group: ['transform'],
    version: 2,
    defaults: { name: 'IF' },
    properties: [
      { displayName: 'Conditions', name: 'conditions', type: 'filter', description: 'The conditions to check' },
    ],
  },
  {
    name: 'n8n-nodes-base.switch',
    displayName: 'Switch',
    description: 'Route items to different branches based on rules',
    group: ['transform'],
    version: 3,
    defaults: { name: 'Switch' },
    properties: [
      { displayName: 'Rules', name: 'rules', type: 'fixedCollection', description: 'The routing rules' },
    ],
  },
  {
    name: 'n8n-nodes-base.merge',
    displayName: 'Merge',
    description: 'Merge data from multiple sources',
    group: ['transform'],
    version: 2,
    defaults: { name: 'Merge' },
    properties: [
      { displayName: 'Mode', name: 'mode', type: 'options', default: 'append', options: [{ name: 'Append', value: 'append' }, { name: 'Combine', value: 'combine' }] },
    ],
  },
  {
    name: 'n8n-nodes-base.splitInBatches',
    displayName: 'Split In Batches',
    description: 'Split items into batches for processing',
    group: ['transform'],
    version: 3,
    defaults: { name: 'Split In Batches' },
    properties: [
      { displayName: 'Batch Size', name: 'batchSize', type: 'number', default: 10, description: 'The number of items per batch' },
    ],
  },
  {
    name: 'n8n-nodes-base.wait',
    displayName: 'Wait',
    description: 'Wait for a specified time or webhook',
    group: ['flow'],
    version: 1,
    defaults: { name: 'Wait' },
    properties: [
      { displayName: 'Resume', name: 'resume', type: 'options', default: 'timeInterval', options: [{ name: 'After Time Interval', value: 'timeInterval' }, { name: 'On Webhook Call', value: 'webhook' }] },
    ],
  },
  {
    name: 'n8n-nodes-base.noOp',
    displayName: 'No Operation',
    description: 'Does nothing - useful for organization',
    group: ['organization'],
    version: 1,
    defaults: { name: 'No Operation' },
    properties: [],
  },
  {
    name: 'n8n-nodes-base.slack',
    displayName: 'Slack',
    description: 'Send messages and interact with Slack',
    group: ['output'],
    version: 2,
    defaults: { name: 'Slack' },
    properties: [
      { displayName: 'Resource', name: 'resource', type: 'options', default: 'message', options: [{ name: 'Message', value: 'message' }, { name: 'Channel', value: 'channel' }] },
      { displayName: 'Operation', name: 'operation', type: 'options', default: 'post', options: [{ name: 'Send', value: 'post' }] },
    ],
  },
  {
    name: 'n8n-nodes-base.gmail',
    displayName: 'Gmail',
    description: 'Send and receive emails with Gmail',
    group: ['output'],
    version: 2,
    defaults: { name: 'Gmail' },
    properties: [
      { displayName: 'Resource', name: 'resource', type: 'options', default: 'message', options: [{ name: 'Message', value: 'message' }] },
      { displayName: 'Operation', name: 'operation', type: 'options', default: 'send', options: [{ name: 'Send', value: 'send' }] },
    ],
  },
  {
    name: 'n8n-nodes-base.googleSheets',
    displayName: 'Google Sheets',
    description: 'Read and write data to Google Sheets',
    group: ['input', 'output'],
    version: 4,
    defaults: { name: 'Google Sheets' },
    properties: [
      { displayName: 'Operation', name: 'operation', type: 'options', default: 'read', options: [{ name: 'Read Rows', value: 'read' }, { name: 'Append Row', value: 'append' }] },
    ],
  },
  {
    name: 'n8n-nodes-base.notion',
    displayName: 'Notion',
    description: 'Interact with Notion databases and pages',
    group: ['input', 'output'],
    version: 2,
    defaults: { name: 'Notion' },
    properties: [
      { displayName: 'Resource', name: 'resource', type: 'options', default: 'page', options: [{ name: 'Page', value: 'page' }, { name: 'Database', value: 'database' }] },
    ],
  },
  {
    name: 'n8n-nodes-base.airtable',
    displayName: 'Airtable',
    description: 'Read and write data to Airtable',
    group: ['input', 'output'],
    version: 2,
    defaults: { name: 'Airtable' },
    properties: [
      { displayName: 'Operation', name: 'operation', type: 'options', default: 'list', options: [{ name: 'List', value: 'list' }, { name: 'Create', value: 'create' }] },
    ],
  },
  {
    name: 'n8n-nodes-base.postgres',
    displayName: 'Postgres',
    description: 'Execute queries on a PostgreSQL database',
    group: ['input', 'output'],
    version: 2,
    defaults: { name: 'Postgres' },
    properties: [
      { displayName: 'Operation', name: 'operation', type: 'options', default: 'executeQuery', options: [{ name: 'Execute Query', value: 'executeQuery' }] },
    ],
  },
  {
    name: 'n8n-nodes-base.mysql',
    displayName: 'MySQL',
    description: 'Execute queries on a MySQL database',
    group: ['input', 'output'],
    version: 2,
    defaults: { name: 'MySQL' },
    properties: [
      { displayName: 'Operation', name: 'operation', type: 'options', default: 'executeQuery', options: [{ name: 'Execute Query', value: 'executeQuery' }] },
    ],
  },
  {
    name: 'n8n-nodes-base.mongodb',
    displayName: 'MongoDB',
    description: 'Interact with MongoDB collections',
    group: ['input', 'output'],
    version: 1,
    defaults: { name: 'MongoDB' },
    properties: [
      { displayName: 'Operation', name: 'operation', type: 'options', default: 'find', options: [{ name: 'Find', value: 'find' }, { name: 'Insert', value: 'insert' }] },
    ],
  },
  {
    name: 'n8n-nodes-base.openAi',
    displayName: 'OpenAI',
    description: 'Interact with OpenAI models',
    group: ['transform'],
    version: 1,
    defaults: { name: 'OpenAI' },
    properties: [
      { displayName: 'Resource', name: 'resource', type: 'options', default: 'chat', options: [{ name: 'Chat', value: 'chat' }, { name: 'Image', value: 'image' }] },
    ],
  },
];

export function searchNodes(query: string, limit = 10): N8nNode[] {
  const lowerQuery = query.toLowerCase();
  const matches = COMMON_NODES.filter(
    (node) =>
      node.name.toLowerCase().includes(lowerQuery) ||
      node.displayName.toLowerCase().includes(lowerQuery) ||
      node.description.toLowerCase().includes(lowerQuery)
  );
  return matches.slice(0, limit);
}

export function getNodeInfo(nodeType: string): N8nNode | undefined {
  return COMMON_NODES.find((node) => node.name === nodeType);
}
