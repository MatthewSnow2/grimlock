# GRIMLOCK Production Patterns Guide

A comprehensive reference for production-ready patterns in MCP server development. This guide explains **what** each pattern does, **why** it matters, and **how** to avoid common mistakes.

---

## Table of Contents

1. [Pattern Overview](#pattern-overview)
2. [Global Patterns](#global-patterns)
   - [Error Types](#error-types)
   - [Error Handler](#error-handler)
   - [Logger](#logger)
   - [Config Loader](#config-loader)
   - [Validation Schemas](#validation-schemas)
   - [Health Check](#health-check)
3. [Tool Patterns](#tool-patterns)
   - [Basic Tool](#basic-tool)
   - [Validated Tool](#validated-tool)
   - [Progress Tool](#progress-tool)
   - [Retry Tool](#retry-tool)
   - [Cached Tool](#cached-tool)
   - [Long-Running Tool](#long-running-tool)
4. [Error Scenarios](#error-scenarios)
5. [Pattern Composition](#pattern-composition)
6. [Common Mistakes](#common-mistakes)
7. [Quick Reference](#quick-reference)

---

## Pattern Overview

GRIMLOCK patterns are categorized into two types:

| Category | Purpose | Generated As |
|----------|---------|--------------|
| **Global Patterns** | Infrastructure shared across all tools | Standalone files |
| **Tool Patterns** | Behavior wrappers for individual tools | Decorators/wrappers |

### When Patterns Are Activated

```
PRD Configuration                    Generated Code
─────────────────                    ──────────────
production_patterns.enabled: []  →   Selects global patterns
tool.long_running: true          →   Adds progress/retry wrappers
error_handling.expected_scenarios →   Configures error types
external_dependencies.enabled    →   Adds fallback/retry logic
```

---

## Global Patterns

### Error Types

**What it does:** Defines structured error classes with MCP-compliant error codes.

**Why it matters:**

- MCP clients (Claude Desktop, etc.) expect specific error formats
- Structured errors enable programmatic error handling by AI
- Consistent error codes allow clients to distinguish transient from permanent failures

**Generated artifacts:**

```typescript
// src/errors/error-types.ts
export enum McpErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  AUTH_FAILURE = 'AUTH_FAILURE',
  TIMEOUT = 'TIMEOUT',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class McpError extends Error {
  code: McpErrorCode;
  details: {
    retryable: boolean;
    retryAfterMs?: number;
    context?: Record<string, unknown>;
  };
}
```

**PRD trigger:**

```yaml
production_patterns:
  enabled:
    - error_handling

error_handling:
  expected_scenarios:
    - invalid_input
    - api_unavailable
    - rate_limiting
```

---

### Error Handler

**What it does:** Centralizes error handling with logging, classification, and MCP response formatting.

**Why it matters:**

- Single place to update error handling logic
- Consistent error messages across all tools
- Automatic retry guidance in error responses

**Generated artifacts:**

```typescript
// src/errors/error-handler.ts
export function handleMcpError(
  error: unknown,
  options: ErrorHandlerOptions
): CallToolResult {
  const mcpError = normalizeError(error);

  options.logger?.error(mcpError.message, {
    code: mcpError.code,
    toolName: options.toolName,
  });

  return {
    content: [{
      type: 'text',
      text: formatErrorMessage(mcpError, options),
    }],
    isError: true,
  };
}
```

**Key features:**

| Feature | Purpose |
|---------|---------|
| Error normalization | Converts any thrown value to `McpError` |
| Retry guidance | Adds "try again in X seconds" for rate limits |
| Context enrichment | Includes tool name, timestamp, request ID |
| Structured logging | Consistent log format for observability |

---

### Logger

**What it does:** Provides structured, leveled logging with context propagation.

**Why it matters:**

- Debugging distributed MCP calls requires correlated logs
- Structured logs enable filtering and alerting
- Log levels prevent noise in production

**Generated artifacts:**

```typescript
// src/utils/logger.ts
export interface LogContext {
  toolName?: string;
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

export const logger = {
  debug: (msg: string, ctx?: LogContext) => void,
  info: (msg: string, ctx?: LogContext) => void,
  warn: (msg: string, ctx?: LogContext) => void,
  error: (msg: string, ctx?: LogContext) => void,
};
```

**PRD trigger:**

```yaml
production_patterns:
  enabled:
    - logging
```

**Configuration options:**

```yaml
# In PRD configuration section
configuration:
  runtime_options:
    - name: "log_level"
      type: "string"
      default: "info"
      description: "Minimum log level (debug, info, warn, error)"
```

---

### Config Loader

**What it does:** Loads and validates configuration from environment variables with type safety.

**Why it matters:**

- Fails fast on missing required configuration
- Type-safe config access prevents runtime errors
- Single source of truth for all configuration

**Generated artifacts:**

```typescript
// src/config/config-loader.ts
const configSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url().default('https://api.example.com'),
  timeout: z.coerce.number().default(10000),
  retryEnabled: z.coerce.boolean().default(true),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  const result = configSchema.safeParse({
    apiKey: process.env.EXAMPLE_API_KEY,
    baseUrl: process.env.EXAMPLE_BASE_URL,
    timeout: process.env.EXAMPLE_TIMEOUT,
    retryEnabled: process.env.EXAMPLE_RETRY_ENABLED,
  });

  if (!result.success) {
    throw new ConfigurationError(
      `Invalid configuration: ${result.error.message}`
    );
  }

  return result.data;
}
```

**PRD trigger:**

```yaml
configuration:
  environment_variables:
    - name: "EXAMPLE_API_KEY"
      description: "API key for Example service"
      required: true
    - name: "EXAMPLE_TIMEOUT"
      description: "Request timeout in milliseconds"
      required: false
      default: "10000"
```

---

### Validation Schemas

**What it does:** Defines Zod schemas for all tool inputs, ensuring type safety at runtime.

**Why it matters:**

- Prevents invalid data from reaching business logic
- Provides clear error messages for invalid inputs
- Self-documenting input requirements

**Generated artifacts:**

```typescript
// src/schemas/tool-schemas.ts
export const getCustomerSchema = z.object({
  customerId: z.string().uuid({
    message: 'Customer ID must be a valid UUID',
  }),
  includeOrders: z.boolean().default(false),
});

export const createOrderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
  })).min(1, 'Order must have at least one item'),
});
```

**PRD trigger:**

```yaml
production_patterns:
  enabled:
    - input_validation

tools:
  - name: "get_customer"
    parameters:
      - name: "customer_id"
        type: "string"
        required: true
        validation:
          pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-..."  # UUID pattern
```

---

### Health Check

**What it does:** Exposes a health check endpoint for monitoring external dependencies.

**Why it matters:**

- Enables proactive monitoring of service health
- Distinguishes server issues from dependency issues
- Required for production deployment orchestrators

**Generated artifacts:**

```typescript
// src/health/health-check.ts
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    [name: string]: {
      status: 'pass' | 'fail';
      latencyMs?: number;
      message?: string;
    };
  };
  timestamp: string;
}

export async function checkHealth(): Promise<HealthStatus> {
  const checks = await Promise.all([
    checkDatabaseConnection(),
    checkExternalApi(),
    checkCacheConnection(),
  ]);
  // ...
}
```

**PRD trigger:**

```yaml
external_dependencies:
  enabled: true
  primary_url: "https://api.example.com"
```

---

## Tool Patterns

### Basic Tool

**What it does:** Minimal tool implementation with no additional wrappers.

**When to use:**

- Simple, synchronous operations
- No external dependencies
- Low failure rate expected

**Generated code:**

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'echo') {
    const { message } = request.params.arguments;
    return {
      content: [{ type: 'text', text: message }],
    };
  }
});
```

**PRD trigger:**

```yaml
tools:
  - name: "echo"
    description: "Returns the input message"
    long_running: false
    progress_notifications: false
```

---

### Validated Tool

**What it does:** Wraps tool with Zod schema validation before execution.

**When to use:**

- Any tool with user-provided input
- Tools where invalid input could cause errors

**Generated code:**

```typescript
const getCustomer = createValidatedToolWrapper({
  name: 'get_customer',
  description: 'Retrieve customer by ID',
  inputSchema: z.object({
    customerId: z.string().uuid(),
  }),
  handler: async (input) => {
    return await customerService.get(input.customerId);
  },
});
```

**Validation error response:**

```json
{
  "content": [{
    "type": "text",
    "text": "Invalid input for get_customer:\n- customerId: Invalid UUID format"
  }],
  "isError": true
}
```

---

### Progress Tool

**What it does:** Sends real-time progress notifications during execution.

**When to use:**

- Operations taking 5+ seconds
- Multi-step processes
- File uploads/downloads

**Generated code:**

```typescript
const processDocuments = createValidatedToolWrapper({
  name: 'process_documents',
  inputSchema: processDocumentsSchema,
  handler: async (input, context) => {
    const { documents } = input;

    for (let i = 0; i < documents.length; i++) {
      context.reportProgress(
        `Processing document ${i + 1}/${documents.length}`,
        ((i + 1) / documents.length) * 100
      );
      await processDocument(documents[i]);
    }

    return { processed: documents.length };
  },
  progress: {
    enabled: true,
    intervalMs: 2000,
  },
});
```

**PRD trigger:**

```yaml
tools:
  - name: "process_documents"
    long_running: true
    progress_notifications: true
    estimated_duration_seconds: 30
```

**MCP progress notification format:**

```json
{
  "method": "notifications/progress",
  "params": {
    "progressToken": "abc123",
    "progress": 50,
    "total": 100,
    "message": "Processing document 5/10"
  }
}
```

---

### Retry Tool

**What it does:** Automatically retries failed operations with configurable backoff.

**When to use:**

- External API calls (rate limits, transient failures)
- Network operations
- Any operation with known transient failure modes

**Generated code:**

```typescript
const fetchData = createValidatedToolWrapper({
  name: 'fetch_data',
  inputSchema: fetchDataSchema,
  handler: async (input, context) => {
    return await externalApi.fetch(input.query);
  },
  retry: {
    maxRetries: 3,
    baseDelayMs: 1000,
    exponentialBackoff: true,
    maxDelayMs: 30000,
    retryableErrorCodes: [
      McpErrorCode.RATE_LIMIT,
      McpErrorCode.TIMEOUT,
      McpErrorCode.SERVICE_UNAVAILABLE,
    ],
  },
});
```

**PRD trigger:**

```yaml
external_dependencies:
  enabled: true
  retry_config:
    max_retries: 3
    backoff_multiplier: 2
```

**Backoff calculation:**

| Attempt | Delay (exponential) | With jitter |
|---------|---------------------|-------------|
| 1 | 1000ms | 1000-1300ms |
| 2 | 2000ms | 2000-2600ms |
| 3 | 4000ms | 4000-5200ms |

---

### Cached Tool

**What it does:** Caches tool results to reduce redundant API calls.

**When to use:**

- Frequently requested, infrequently changing data
- Expensive external API calls
- High-latency operations

**Generated code:**

```typescript
const cache = new LRUCache<string, unknown>({
  max: 1000,
  ttl: 300000, // 5 minutes
});

const getConfiguration = createValidatedToolWrapper({
  name: 'get_configuration',
  inputSchema: getConfigSchema,
  handler: async (input) => {
    const cacheKey = `config:${input.key}`;

    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const result = await configService.get(input.key);
    cache.set(cacheKey, result);
    return result;
  },
});
```

**PRD trigger:**

```yaml
configuration:
  runtime_options:
    - name: "cache_ttl_seconds"
      type: "number"
      default: 300
      description: "Cache duration for read operations"
```

---

### Long-Running Tool

**What it does:** Combines progress notifications with retry logic for extended operations.

**When to use:**

- Operations taking 30+ seconds
- Multi-phase processes
- Operations that may need resumption

**Generated code:**

```typescript
const generateReport = createValidatedToolWrapper({
  name: 'generate_report',
  inputSchema: generateReportSchema,
  handler: async (input, context) => {
    context.reportProgress('Initializing report generation...', 0);

    // Phase 1: Data collection
    context.reportProgress('Collecting data...', 10);
    const data = await collectData(input.query);

    // Phase 2: Processing
    context.reportProgress('Processing data...', 40);
    const processed = await processData(data);

    // Phase 3: Formatting
    context.reportProgress('Formatting report...', 80);
    const report = await formatReport(processed);

    context.reportProgress('Complete!', 100);
    return report;
  },
  retry: {
    maxRetries: 2,
    baseDelayMs: 5000,
    exponentialBackoff: true,
    maxDelayMs: 60000,
    retryableErrorCodes: [McpErrorCode.TIMEOUT],
  },
  progress: {
    enabled: true,
    intervalMs: 5000,
  },
});
```

**PRD trigger:**

```yaml
tools:
  - name: "generate_report"
    long_running: true
    progress_notifications: true
    estimated_duration_seconds: 120

production_patterns:
  long_running_operations: true
```

---

## Error Scenarios

GRIMLOCK recognizes these standard error scenarios:

| Scenario | Error Code | Retryable | Typical Cause |
|----------|------------|-----------|---------------|
| `invalid_input` | VALIDATION_ERROR | No | User provided bad data |
| `api_unavailable` | SERVICE_UNAVAILABLE | Yes | External service down |
| `rate_limiting` | RATE_LIMIT | Yes | Too many requests |
| `auth_failure` | AUTH_FAILURE | No | Invalid credentials |
| `network_timeout` | TIMEOUT | Yes | Slow network/service |
| `resource_not_found` | RESOURCE_NOT_FOUND | No | Requested item doesn't exist |
| `validation_error` | VALIDATION_ERROR | No | Schema validation failed |
| `internal_error` | INTERNAL_ERROR | No | Unexpected server error |

### Error Response Format

```json
{
  "content": [{
    "type": "text",
    "text": "Error: Customer not found\n\nThe customer ID '12345' does not exist in the system.\n\n• Check that the customer ID is correct\n• The customer may have been deleted"
  }],
  "isError": true
}
```

---

## Pattern Composition

Patterns compose as decorators in a specific order:

```
Request → Validation → Retry → Progress → Cache → Business Logic
                                                        ↓
Response ← Error Handler ← Logging ← Format ←──────────┘
```

### Composition Rules

1. **Validation first** - Reject invalid input before any processing
2. **Retry wraps progress** - Retry the entire operation including progress tracking
3. **Cache after validation** - Cache validated inputs only
4. **Error handler last** - Catch all errors and format responses

### Example: Full-Stack Tool

```typescript
// This tool has ALL patterns enabled
const complexTool = createValidatedToolWrapper({
  name: 'complex_operation',
  inputSchema: complexSchema,          // Validation
  handler: async (input, context) => {
    // Cache check
    const cached = cache.get(input.id);
    if (cached) return cached;

    // Progress tracking
    context.reportProgress('Starting...', 0);

    // Business logic with potential for retry
    const result = await externalService.process(input);

    // Cache result
    cache.set(input.id, result);

    context.reportProgress('Complete', 100);
    return result;
  },
  retry: { ... },                       // Retry configuration
  progress: { enabled: true, ... },     // Progress configuration
  errorHandlerOptions: { ... },         // Error handling options
  logger: structuredLogger,             // Logging
});
```

---

## Common Mistakes

### 1. Catching Errors Without Re-throwing

**Wrong:**

```typescript
handler: async (input) => {
  try {
    return await api.fetch(input.id);
  } catch (error) {
    console.error('Failed:', error);
    return null;  // Swallows error!
  }
}
```

**Right:**

```typescript
handler: async (input) => {
  try {
    return await api.fetch(input.id);
  } catch (error) {
    throw new McpError(
      McpErrorCode.SERVICE_UNAVAILABLE,
      `Failed to fetch: ${error.message}`,
      { retryable: true }
    );
  }
}
```

**Why:** The error handler wrapper needs to catch errors to format them properly for MCP clients.

---

### 2. Not Setting retryable Flag

**Wrong:**

```typescript
throw new McpError(
  McpErrorCode.RATE_LIMIT,
  'Rate limit exceeded'
);
```

**Right:**

```typescript
throw new McpError(
  McpErrorCode.RATE_LIMIT,
  'Rate limit exceeded',
  {
    retryable: true,
    retryAfterMs: 60000
  }
);
```

**Why:** The retry wrapper uses the `retryable` flag to determine whether to retry.

---

### 3. Progress Without Long-Running Flag

**Wrong:**

```yaml
tools:
  - name: "quick_lookup"
    long_running: false
    progress_notifications: true  # Inconsistent!
```

**Right:**

```yaml
tools:
  - name: "quick_lookup"
    long_running: false
    progress_notifications: false

tools:
  - name: "slow_process"
    long_running: true
    progress_notifications: true  # Consistent
```

**Why:** Progress notifications add overhead (~450 tokens) and are only valuable for long operations.

---

### 4. Overly Broad Error Catching

**Wrong:**

```typescript
handler: async (input) => {
  try {
    const data = validateInput(input);
    const result = await api.fetch(data);
    return formatResult(result);
  } catch (error) {
    throw new McpError(McpErrorCode.INTERNAL_ERROR, error.message);
  }
}
```

**Right:**

```typescript
handler: async (input) => {
  // Validation errors handled by wrapper - don't catch here
  const data = validateInput(input);

  try {
    const result = await api.fetch(data);
    return formatResult(result);
  } catch (error) {
    if (error.status === 429) {
      throw new McpError(McpErrorCode.RATE_LIMIT, 'Rate limited', {
        retryable: true,
        retryAfterMs: error.retryAfter * 1000,
      });
    }
    if (error.status === 404) {
      throw new McpError(McpErrorCode.RESOURCE_NOT_FOUND, 'Not found', {
        retryable: false,
      });
    }
    throw error;  // Let wrapper handle unknown errors
  }
}
```

**Why:** Different errors need different handling. Validation errors shouldn't be retried, rate limits should.

---

### 5. Missing Environment Variable Validation

**Wrong:**

```typescript
const apiKey = process.env.API_KEY;
const response = await fetch(url, {
  headers: { Authorization: `Bearer ${apiKey}` },  // Might be undefined!
});
```

**Right:**

```typescript
// In config-loader.ts
const config = loadConfig();  // Throws if API_KEY missing

// In tool handler
const response = await fetch(url, {
  headers: { Authorization: `Bearer ${config.apiKey}` },  // Guaranteed
});
```

**Why:** Fail fast on startup rather than at runtime with a confusing auth error.

---

### 6. Infinite Retry Loops

**Wrong:**

```typescript
retry: {
  maxRetries: 10,
  retryableErrorCodes: [
    McpErrorCode.INTERNAL_ERROR,  // Could be permanent!
  ],
}
```

**Right:**

```typescript
retry: {
  maxRetries: 3,
  retryableErrorCodes: [
    McpErrorCode.RATE_LIMIT,
    McpErrorCode.TIMEOUT,
    McpErrorCode.SERVICE_UNAVAILABLE,
  ],
}
```

**Why:** Internal errors are often permanent (bugs, bad data). Only retry transient failures.

---

### 7. Cache Keys Without Isolation

**Wrong:**

```typescript
const cacheKey = input.customerId;  // Same key for different users!
```

**Right:**

```typescript
const cacheKey = `customer:${userId}:${input.customerId}`;
```

**Why:** Cache poisoning - one user could see another user's cached data.

---

### 8. Synchronous Progress Updates

**Wrong:**

```typescript
for (const item of items) {
  await processItem(item);
  console.log(`Processed ${item.name}`);  // Not visible to MCP client!
}
```

**Right:**

```typescript
for (let i = 0; i < items.length; i++) {
  context.reportProgress(
    `Processing ${items[i].name}`,
    ((i + 1) / items.length) * 100
  );
  await processItem(items[i]);
}
```

**Why:** `console.log` doesn't send progress notifications to MCP clients.

---

## Quick Reference

### Pattern Selection Matrix

| Scenario | Patterns to Enable |
|----------|-------------------|
| Simple read operation | `input_validation` |
| External API integration | `error_handling`, `input_validation`, `logging` |
| Long operations (5-30s) | Above + `progress_notifications` |
| Very long operations (30s+) | All above + `graceful_degradation` |
| High-frequency operations | Above + caching |

### PRD Pattern Checklist

```yaml
# Minimum recommended configuration
production_patterns:
  enabled:
    - error_handling
    - input_validation
    - logging

error_handling:
  expected_scenarios:
    - invalid_input
    - api_unavailable       # If calling external APIs
    - rate_limiting         # If external API has limits
    - auth_failure          # If using authentication

external_dependencies:
  enabled: true             # If calling external APIs
  timeout_seconds: 10
  retry_config:
    max_retries: 3
    backoff_multiplier: 2
```

### Generated File Structure

```
src/
├── config/
│   └── config-loader.ts    # [config_loader pattern]
├── errors/
│   ├── error-types.ts      # [error_types pattern]
│   └── error-handler.ts    # [error_handler pattern]
├── health/
│   └── health-check.ts     # [health_check pattern]
├── schemas/
│   └── tool-schemas.ts     # [validation_schemas pattern]
├── tools/
│   ├── validated-wrapper.ts
│   └── [tool-name].ts
├── utils/
│   └── logger.ts           # [logger pattern]
└── index.ts
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-02 | Initial comprehensive guide |

---

*Generated by GRIMLOCK MCP Server Factory*
