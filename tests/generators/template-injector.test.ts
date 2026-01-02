/**
 * Unit Tests for GRIMLOCK Template Injector
 *
 * Comprehensive test suite covering:
 * - Template loading and caching
 * - Context building for all pattern types
 * - Handlebars helper functions
 * - Error handling
 * - Case conversion utilities
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import Handlebars from 'handlebars';
import {
  TemplateInjector,
  TemplateInjectionError,
  InjectorOptions,
  createTemplateInjector,
} from '../../src/generators/template-injector';
import {
  NormalizedPRD,
  ToolDefinition,
  ErrorScenario,
  GlobalPatternSelection,
  ToolPatternSelection,
} from '../../src/types/patterns';

// Mock fs/promises
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('TemplateInjector', () => {
  let injector: TemplateInjector;
  const mockTemplateDir = '/mock/templates';

  const defaultOptions: InjectorOptions = {
    templateDir: mockTemplateDir,
    language: 'typescript',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    injector = new TemplateInjector(defaultOptions);
  });

  afterEach(() => {
    injector.clearCache();
  });

  // ============================================================================
  // Test Fixtures
  // ============================================================================

  const createMockPRD = (overrides?: Partial<NormalizedPRD>): NormalizedPRD => ({
    metadata: {
      name: 'test-mcp',
      version: '1.0.0',
      description: 'Test MCP server',
      language: 'typescript',
    },
    patterns: {
      global: {
        errorHandling: {
          enabled: true,
          scenarios: ['invalid_input', 'api_unavailable', 'rate_limiting'],
          customErrorTypes: true,
        },
        logging: {
          enabled: true,
          level: 'info',
          structured: true,
        },
        validation: {
          enabled: true,
          strict: false,
        },
      },
      tools: new Map([
        ['get_customer', {
          longRunning: false,
          progressNotifications: false,
          retryable: true,
          retryConfig: {
            maxAttempts: 3,
            backoffStrategy: 'exponential',
            retryableErrors: ['NetworkTimeoutError'],
          },
          timeout: 10000,
        }],
      ]),
    },
    dependencies: {
      external: [{
        enabled: true,
        primaryUrl: 'https://api.example.com',
        fallbackUrl: 'https://backup.example.com',
        timeoutSeconds: 15,
      }],
      internal: [],
    },
    tools: [{
      name: 'get_customer',
      description: 'Get customer by ID',
      longRunning: false,
      progressNotifications: false,
      parameters: [
        {
          name: 'customer_id',
          type: 'string',
          required: true,
          description: 'The customer ID',
          validation: {
            pattern: '^[a-zA-Z0-9]+$',
            minLength: 1,
            maxLength: 50,
          },
        },
      ],
      returns: 'Customer',
    }],
    configuration: {
      environmentVariables: [
        { name: 'API_KEY', description: 'API key', required: true },
      ],
      runtimeConfig: {},
    },
    ...overrides,
  });

  const createMockTool = (overrides?: Partial<ToolDefinition>): ToolDefinition => ({
    name: 'test_tool',
    description: 'A test tool',
    longRunning: false,
    progressNotifications: false,
    parameters: [
      {
        name: 'input',
        type: 'string',
        required: true,
        description: 'Input parameter',
      },
    ],
    returns: 'TestResult',
    ...overrides,
  });

  // ============================================================================
  // Constructor Tests
  // ============================================================================

  describe('constructor', () => {
    it('should create instance with default options', () => {
      const injector = new TemplateInjector(defaultOptions);
      expect(injector).toBeInstanceOf(TemplateInjector);
    });

    it('should register custom helpers when provided', () => {
      const customHelper = jest.fn(() => 'custom result');
      const options: InjectorOptions = {
        ...defaultOptions,
        helpers: { customHelper },
      };

      const injector = new TemplateInjector(options);
      expect(injector).toBeInstanceOf(TemplateInjector);
    });

    it('should support both typescript and python languages', () => {
      const tsInjector = new TemplateInjector({ ...defaultOptions, language: 'typescript' });
      const pyInjector = new TemplateInjector({ ...defaultOptions, language: 'python' });

      expect(tsInjector).toBeInstanceOf(TemplateInjector);
      expect(pyInjector).toBeInstanceOf(TemplateInjector);
    });
  });

  // ============================================================================
  // Template Loading Tests
  // ============================================================================

  describe('loadTemplate', () => {
    it('should load and compile a template from file', async () => {
      const templateSource = '{{name}} - {{description}}';
      mockFs.readFile.mockResolvedValue(templateSource);

      const compiled = await injector.loadTemplate('test-template');

      expect(compiled.name).toBe('test-template');
      expect(compiled.path).toBe(path.join(mockTemplateDir, 'typescript', 'test-template.hbs'));
      expect(typeof compiled.template).toBe('function');
    });

    it('should cache templates after first load', async () => {
      const templateSource = '{{name}}';
      mockFs.readFile.mockResolvedValue(templateSource);

      await injector.loadTemplate('cached-template');
      await injector.loadTemplate('cached-template');

      expect(mockFs.readFile).toHaveBeenCalledTimes(1);
    });

    it('should throw TemplateInjectionError when file not found', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT: file not found'));

      await expect(injector.loadTemplate('nonexistent')).rejects.toThrow(TemplateInjectionError);
    });

    it('should include template path in error', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Read error'));

      try {
        await injector.loadTemplate('error-template');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TemplateInjectionError);
        expect((error as TemplateInjectionError).templatePath).toContain('error-template.hbs');
      }
    });
  });

  // ============================================================================
  // Template Rendering Tests
  // ============================================================================

  describe('render', () => {
    it('should render template with provided context', async () => {
      const templateSource = 'Hello, {{name}}!';
      mockFs.readFile.mockResolvedValue(templateSource);

      const result = await injector.render('greeting', { name: 'World' });

      expect(result).toBe('Hello, World!');
    });

    it('should render template with nested context', async () => {
      const templateSource = '{{user.name}} - {{user.email}}';
      mockFs.readFile.mockResolvedValue(templateSource);

      const result = await injector.render('user-info', {
        user: { name: 'John', email: 'john@example.com' },
      });

      expect(result).toBe('John - john@example.com');
    });

    it('should render template with arrays using each helper', async () => {
      const templateSource = '{{#each items}}{{this}},{{/each}}';
      mockFs.readFile.mockResolvedValue(templateSource);

      const result = await injector.render('list', { items: ['a', 'b', 'c'] });

      expect(result).toBe('a,b,c,');
    });

    it('should throw TemplateInjectionError on render failure', async () => {
      const templateSource = '{{#if}}invalid{{/if}}';
      mockFs.readFile.mockResolvedValue(templateSource);

      await expect(injector.render('invalid', {})).rejects.toThrow(TemplateInjectionError);
    });
  });

  // ============================================================================
  // Handlebars Helper Tests
  // ============================================================================

  describe('Handlebars helpers', () => {
    describe('case conversion helpers', () => {
      it('should convert to camelCase', async () => {
        mockFs.readFile.mockResolvedValue('{{camelCase input}}');

        const result = await injector.render('test', { input: 'hello_world' });
        expect(result).toBe('helloWorld');
      });

      it('should convert to PascalCase', async () => {
        mockFs.readFile.mockResolvedValue('{{pascalCase input}}');

        const result = await injector.render('test', { input: 'hello_world' });
        expect(result).toBe('HelloWorld');
      });

      it('should convert to snake_case', async () => {
        mockFs.readFile.mockResolvedValue('{{snakeCase input}}');

        const result = await injector.render('test', { input: 'helloWorld' });
        expect(result).toBe('hello_world');
      });

      it('should convert to SCREAMING_SNAKE_CASE', async () => {
        mockFs.readFile.mockResolvedValue('{{screamingSnakeCase input}}');

        const result = await injector.render('test', { input: 'helloWorld' });
        expect(result).toBe('HELLO_WORLD');
      });

      it('should convert to kebab-case', async () => {
        mockFs.readFile.mockResolvedValue('{{kebabCase input}}');

        const result = await injector.render('test', { input: 'helloWorld' });
        expect(result).toBe('hello-world');
      });
    });

    describe('conditional helpers', () => {
      it('should handle eq helper', async () => {
        mockFs.readFile.mockResolvedValue('{{#if (eq a b)}}equal{{else}}not equal{{/if}}');

        expect(await injector.render('test', { a: 1, b: 1 })).toBe('equal');
        expect(await injector.render('test', { a: 1, b: 2 })).toBe('not equal');
      });

      it('should handle neq helper', async () => {
        mockFs.readFile.mockResolvedValue('{{#if (neq a b)}}different{{else}}same{{/if}}');

        expect(await injector.render('test', { a: 1, b: 2 })).toBe('different');
        expect(await injector.render('test', { a: 1, b: 1 })).toBe('same');
      });

      it('should handle gt/gte/lt/lte helpers', async () => {
        mockFs.readFile.mockResolvedValue('{{#if (gt a b)}}yes{{else}}no{{/if}}');
        expect(await injector.render('test', { a: 5, b: 3 })).toBe('yes');
        expect(await injector.render('test', { a: 3, b: 5 })).toBe('no');
      });

      it('should handle and helper', async () => {
        mockFs.readFile.mockResolvedValue('{{#if (and a b)}}both{{else}}not both{{/if}}');

        expect(await injector.render('test', { a: true, b: true })).toBe('both');
        expect(await injector.render('test', { a: true, b: false })).toBe('not both');
      });

      it('should handle or helper', async () => {
        mockFs.readFile.mockResolvedValue('{{#if (or a b)}}one{{else}}none{{/if}}');

        expect(await injector.render('test', { a: false, b: true })).toBe('one');
        expect(await injector.render('test', { a: false, b: false })).toBe('none');
      });

      it('should handle not helper', async () => {
        mockFs.readFile.mockResolvedValue('{{#if (not a)}}falsy{{else}}truthy{{/if}}');

        expect(await injector.render('test', { a: false })).toBe('falsy');
        expect(await injector.render('test', { a: true })).toBe('truthy');
      });
    });

    describe('array helpers', () => {
      it('should handle includes helper', async () => {
        mockFs.readFile.mockResolvedValue('{{#if (includes arr item)}}found{{else}}not found{{/if}}');

        expect(await injector.render('test', { arr: [1, 2, 3], item: 2 })).toBe('found');
        expect(await injector.render('test', { arr: [1, 2, 3], item: 5 })).toBe('not found');
      });

      it('should handle length helper', async () => {
        mockFs.readFile.mockResolvedValue('{{length arr}}');

        expect(await injector.render('test', { arr: [1, 2, 3] })).toBe('3');
        expect(await injector.render('test', { arr: [] })).toBe('0');
      });

      it('should handle join helper', async () => {
        mockFs.readFile.mockResolvedValue('{{join arr ", "}}');

        const result = await injector.render('test', { arr: ['a', 'b', 'c'] });
        expect(result).toBe('a, b, c');
      });

      it('should handle first and last helpers', async () => {
        mockFs.readFile.mockResolvedValue('{{first arr}}-{{last arr}}');

        const result = await injector.render('test', { arr: [1, 2, 3] });
        expect(result).toBe('1-3');
      });
    });

    describe('string helpers', () => {
      it('should handle trim helper', async () => {
        mockFs.readFile.mockResolvedValue('|{{trim str}}|');

        const result = await injector.render('test', { str: '  hello  ' });
        expect(result).toBe('|hello|');
      });

      it('should handle uppercase and lowercase helpers', async () => {
        mockFs.readFile.mockResolvedValue('{{uppercase str}}-{{lowercase str}}');

        const result = await injector.render('test', { str: 'Hello' });
        expect(result).toBe('HELLO-hello');
      });

      it('should handle replace helper', async () => {
        mockFs.readFile.mockResolvedValue('{{replace str "world" "universe"}}');

        const result = await injector.render('test', { str: 'hello world' });
        expect(result).toBe('hello universe');
      });
    });

    describe('json helper', () => {
      it('should serialize object to JSON', async () => {
        mockFs.readFile.mockResolvedValue('{{{json obj}}}');

        const result = await injector.render('test', { obj: { a: 1 } });
        expect(JSON.parse(result)).toEqual({ a: 1 });
      });
    });

    describe('mapType helper', () => {
      it('should map types for TypeScript', async () => {
        mockFs.readFile.mockResolvedValue('{{mapType type "typescript"}}');

        expect(await injector.render('test', { type: 'string' })).toBe('string');
        expect(await injector.render('test', { type: 'number' })).toBe('number');
        expect(await injector.render('test', { type: 'boolean' })).toBe('boolean');
        expect(await injector.render('test', { type: 'array' })).toBe('unknown[]');
        expect(await injector.render('test', { type: 'object' })).toBe('Record<string, unknown>');
      });

      it('should map types for Python', async () => {
        mockFs.readFile.mockResolvedValue('{{mapType type "python"}}');

        expect(await injector.render('test', { type: 'string' })).toBe('str');
        expect(await injector.render('test', { type: 'number' })).toBe('float');
        expect(await injector.render('test', { type: 'boolean' })).toBe('bool');
        expect(await injector.render('test', { type: 'array' })).toBe('List[Any]');
        expect(await injector.render('test', { type: 'object' })).toBe('Dict[str, Any]');
      });
    });

    describe('indent helper', () => {
      it('should indent multiline string', async () => {
        mockFs.readFile.mockResolvedValue('{{{indent str 4}}}');

        const result = await injector.render('test', { str: 'line1\nline2' });
        expect(result).toBe('    line1\n    line2');
      });
    });
  });

  // ============================================================================
  // Context Building Tests
  // ============================================================================

  describe('buildErrorTypesContext', () => {
    it('should build context with error classes for all scenarios', () => {
      const prd = createMockPRD();
      const context = injector.buildErrorTypesContext(prd);

      expect(context.serverName).toBe('test-mcp');
      expect(context.errorClasses).toHaveLength(3);
      expect(context.includeBaseClass).toBe(true);
      expect(context.includeErrorCodes).toBe(true);
    });

    it('should map scenarios to correct class names', () => {
      const prd = createMockPRD();
      const context = injector.buildErrorTypesContext(prd);
      const classes = context.errorClasses as any[];

      expect(classes[0].className).toBe('InvalidInputError');
      expect(classes[1].className).toBe('ApiUnavailableError');
      expect(classes[2].className).toBe('RateLimitError');
    });

    it('should map scenarios to correct HTTP status codes', () => {
      const prd = createMockPRD();
      const context = injector.buildErrorTypesContext(prd);
      const classes = context.errorClasses as any[];

      expect(classes[0].httpStatus).toBe(400);
      expect(classes[1].httpStatus).toBe(503);
      expect(classes[2].httpStatus).toBe(429);
    });

    it('should correctly identify retryable scenarios', () => {
      const prd = createMockPRD();
      const context = injector.buildErrorTypesContext(prd);
      const classes = context.errorClasses as any[];

      expect(classes[0].retryable).toBe(false); // invalid_input
      expect(classes[1].retryable).toBe(true);  // api_unavailable
      expect(classes[2].retryable).toBe(true);  // rate_limiting
    });
  });

  describe('buildErrorHandlerContext', () => {
    it('should build context with logging configuration', () => {
      const prd = createMockPRD();
      const context = injector.buildErrorHandlerContext(prd);

      expect(context.serverName).toBe('test-mcp');
      expect(context.includeLogging).toBe(true);
      expect(context.logLevel).toBe('info');
      expect(context.structuredLogging).toBe(true);
    });

    it('should include scenarios from PRD', () => {
      const prd = createMockPRD();
      const context = injector.buildErrorHandlerContext(prd);

      expect(context.scenarios).toEqual(['invalid_input', 'api_unavailable', 'rate_limiting']);
    });
  });

  describe('buildToolContext', () => {
    it('should build context with tool name and description', () => {
      const prd = createMockPRD();
      const tool = prd.tools[0];
      const context = injector.buildToolContext(tool, prd);

      expect(context.TOOL_NAME).toBe('get_customer');
      expect(context.TOOL_DESCRIPTION).toBe('Get customer by ID');
      expect(context.RETURN_TYPE).toBe('Customer');
    });

    it('should generate correct schema name', () => {
      const prd = createMockPRD();
      const tool = prd.tools[0];
      const context = injector.buildToolContext(tool, prd);

      expect(context.SCHEMA_NAME).toBe('GetCustomerSchema');
    });

    it('should include parameter information', () => {
      const prd = createMockPRD();
      const tool = prd.tools[0];
      const context = injector.buildToolContext(tool, prd);

      expect(context.parameters).toHaveLength(1);
      const param = (context.parameters as any[])[0];
      expect(param.name).toBe('customer_id');
      expect(param.type).toBe('string');
      expect(param.required).toBe(true);
    });

    it('should include tool pattern configuration', () => {
      const prd = createMockPRD();
      const tool = prd.tools[0];
      const context = injector.buildToolContext(tool, prd);

      expect(context.retryable).toBe(true);
      expect(context.timeout).toBe(10000);
    });

    it('should detect validation presence', () => {
      const prd = createMockPRD();
      const tool = prd.tools[0];
      const context = injector.buildToolContext(tool, prd);

      expect(context.hasValidation).toBe(true);
    });
  });

  describe('buildValidatedToolContext', () => {
    it('should extend base tool context with validation settings', () => {
      const prd = createMockPRD();
      const tool = prd.tools[0];
      const context = injector.buildValidatedToolContext(tool, prd);

      expect(context.TOOL_NAME).toBe('get_customer');
      expect(context.validationEnabled).toBe(true);
      expect(context.strictValidation).toBe(false);
    });

    it('should include validation rules for parameters', () => {
      const prd = createMockPRD();
      const tool = prd.tools[0];
      const context = injector.buildValidatedToolContext(tool, prd);

      expect(context.validationRules).toHaveLength(1);
      const rule = (context.validationRules as any[])[0];
      expect(rule.paramName).toBe('customer_id');
      expect(rule.rules).toHaveProperty('pattern');
    });
  });

  describe('buildRetryToolContext', () => {
    it('should build context with retry configuration', () => {
      const prd = createMockPRD();
      const tool = prd.tools[0];
      const context = injector.buildRetryToolContext(tool, prd);

      expect(context.TOOL_NAME).toBe('get_customer');
      expect(context.MAX_RETRIES).toBe(3);
      expect(context.backoffStrategy).toBe('exponential');
    });

    it('should include fallback configuration when available', () => {
      const prd = createMockPRD();
      const tool = prd.tools[0];
      const context = injector.buildRetryToolContext(tool, prd);

      expect(context.fallbackEnabled).toBe(true);
      expect(context.fallbackUrl).toBe('https://backup.example.com');
      expect(context.timeoutMs).toBe(15000);
    });

    it('should use default values when config not provided', () => {
      const prd = createMockPRD({
        patterns: {
          ...createMockPRD().patterns,
          tools: new Map(),
        },
        dependencies: {
          external: [],
          internal: [],
        },
      });
      const tool = createMockTool();
      const context = injector.buildRetryToolContext(tool, prd);

      expect(context.MAX_RETRIES).toBe(3);
      expect(context.backoffStrategy).toBe('exponential');
      expect(context.fallbackEnabled).toBe(false);
    });
  });

  describe('buildProgressToolContext', () => {
    it('should build context for progress notifications', () => {
      const tool = createMockTool({
        name: 'sync_data',
        progressNotifications: true,
        longRunning: true,
      });
      const context = injector.buildProgressToolContext(tool);

      expect(context.TOOL_NAME).toBe('sync_data');
      expect(context.progressEnabled).toBe(true);
      expect(context.estimatedDuration).toBe(30000);
    });

    it('should use shorter duration for non-long-running tools', () => {
      const tool = createMockTool({
        progressNotifications: true,
        longRunning: false,
      });
      const context = injector.buildProgressToolContext(tool);

      expect(context.estimatedDuration).toBe(5000);
    });

    it('should include default progress steps', () => {
      const tool = createMockTool();
      const context = injector.buildProgressToolContext(tool);

      expect(context.progressSteps).toEqual(['initializing', 'processing', 'finalizing']);
    });
  });

  // ============================================================================
  // Pattern Rendering Tests
  // ============================================================================

  describe('renderGlobalPattern', () => {
    it('should render error-types pattern', async () => {
      const templateSource = 'Errors: {{#each errorClasses}}{{className}},{{/each}}';
      mockFs.readFile.mockResolvedValue(templateSource);

      const prd = createMockPRD();
      const selection: GlobalPatternSelection = {
        pattern: 'error-types',
        template: 'error-types.hbs',
        outputPath: 'src/errors/types.ts',
        context: {},
        priority: 1,
      };

      const fragment = await injector.renderGlobalPattern(selection, prd);

      expect(fragment.pattern).toBe('error-types');
      expect(fragment.code).toContain('InvalidInputError');
      expect(fragment.outputFile).toBe('src/errors/types.ts');
      expect(fragment.section).toBe('classes');
    });

    it('should extract imports from rendered code', async () => {
      const templateSource = "import { z } from 'zod';\nimport { McpError } from './base';\n\nexport class Test {}";
      mockFs.readFile.mockResolvedValue(templateSource);

      const prd = createMockPRD();
      const selection: GlobalPatternSelection = {
        pattern: 'error-types',
        template: 'error-types.hbs',
        outputPath: 'src/errors/types.ts',
        context: {},
        priority: 1,
      };

      const fragment = await injector.renderGlobalPattern(selection, prd);

      expect(fragment.imports).toHaveLength(2);
      expect(fragment.imports[0]).toContain('zod');
      expect(fragment.imports[1]).toContain('McpError');
    });
  });

  describe('renderToolPattern', () => {
    it('should render tool pattern with correct context', async () => {
      const templateSource = 'Tool: {{TOOL_NAME}}, Returns: {{RETURN_TYPE}}';
      mockFs.readFile.mockResolvedValue(templateSource);

      const prd = createMockPRD();
      const tool = prd.tools[0];
      const selection: ToolPatternSelection = {
        pattern: 'basic-tool',
        template: 'basic-tool.hbs',
        context: {},
        compositionStrategy: 'extend',
      };

      const fragment = await injector.renderToolPattern(selection, tool, prd);

      expect(fragment.code).toContain('get_customer');
      expect(fragment.code).toContain('Customer');
      expect(fragment.outputFile).toBe('src/tools/get_customer.ts');
    });
  });

  // ============================================================================
  // Error Scenario Mapping Tests
  // ============================================================================

  describe('scenarioToClassName', () => {
    it.each<[ErrorScenario, string]>([
      ['invalid_input', 'InvalidInputError'],
      ['api_unavailable', 'ApiUnavailableError'],
      ['rate_limiting', 'RateLimitError'],
      ['auth_failure', 'AuthenticationError'],
      ['network_timeout', 'NetworkTimeoutError'],
      ['resource_not_found', 'ResourceNotFoundError'],
      ['validation_error', 'ValidationError'],
      ['internal_error', 'InternalServerError'],
    ])('should map %s to %s', (scenario, expected) => {
      expect(injector.scenarioToClassName(scenario)).toBe(expected);
    });
  });

  describe('scenarioToHttpStatus', () => {
    it.each<[ErrorScenario, number]>([
      ['invalid_input', 400],
      ['api_unavailable', 503],
      ['rate_limiting', 429],
      ['auth_failure', 401],
      ['network_timeout', 504],
      ['resource_not_found', 404],
      ['validation_error', 422],
      ['internal_error', 500],
    ])('should map %s to status %d', (scenario, expected) => {
      expect(injector.scenarioToHttpStatus(scenario)).toBe(expected);
    });
  });

  describe('isRetryableScenario', () => {
    it('should return true for retryable scenarios', () => {
      expect(injector.isRetryableScenario('api_unavailable')).toBe(true);
      expect(injector.isRetryableScenario('rate_limiting')).toBe(true);
      expect(injector.isRetryableScenario('network_timeout')).toBe(true);
    });

    it('should return false for non-retryable scenarios', () => {
      expect(injector.isRetryableScenario('invalid_input')).toBe(false);
      expect(injector.isRetryableScenario('auth_failure')).toBe(false);
      expect(injector.isRetryableScenario('resource_not_found')).toBe(false);
      expect(injector.isRetryableScenario('validation_error')).toBe(false);
      expect(injector.isRetryableScenario('internal_error')).toBe(false);
    });
  });

  // ============================================================================
  // Case Conversion Utility Tests
  // ============================================================================

  describe('case conversion utilities', () => {
    describe('toCamelCase', () => {
      it.each([
        ['hello_world', 'helloWorld'],
        ['hello-world', 'helloWorld'],
        ['hello world', 'helloWorld'],
        ['HelloWorld', 'helloWorld'],
        ['HELLO_WORLD', 'helloWorld'],
        ['get_customer_by_id', 'getCustomerById'],
      ])('should convert "%s" to "%s"', (input, expected) => {
        expect(injector.toCamelCase(input)).toBe(expected);
      });
    });

    describe('toPascalCase', () => {
      it.each([
        ['hello_world', 'HelloWorld'],
        ['hello-world', 'HelloWorld'],
        ['helloWorld', 'HelloWorld'],
        ['get_customer', 'GetCustomer'],
      ])('should convert "%s" to "%s"', (input, expected) => {
        expect(injector.toPascalCase(input)).toBe(expected);
      });
    });

    describe('toSnakeCase', () => {
      it.each([
        ['helloWorld', 'hello_world'],
        ['HelloWorld', 'hello_world'],
        ['hello-world', 'hello_world'],
        ['GetCustomerById', 'get_customer_by_id'],
      ])('should convert "%s" to "%s"', (input, expected) => {
        expect(injector.toSnakeCase(input)).toBe(expected);
      });
    });

    describe('toScreamingSnakeCase', () => {
      it.each([
        ['helloWorld', 'HELLO_WORLD'],
        ['hello_world', 'HELLO_WORLD'],
        ['ErrorCode', 'ERROR_CODE'],
      ])('should convert "%s" to "%s"', (input, expected) => {
        expect(injector.toScreamingSnakeCase(input)).toBe(expected);
      });
    });

    describe('toKebabCase', () => {
      it.each([
        ['helloWorld', 'hello-world'],
        ['hello_world', 'hello-world'],
        ['HelloWorld', 'hello-world'],
        ['GetCustomer', 'get-customer'],
      ])('should convert "%s" to "%s"', (input, expected) => {
        expect(injector.toKebabCase(input)).toBe(expected);
      });
    });
  });

  // ============================================================================
  // Cache Management Tests
  // ============================================================================

  describe('cache management', () => {
    it('should clear cache', async () => {
      mockFs.readFile.mockResolvedValue('{{name}}');

      await injector.loadTemplate('test');
      expect(injector.getCacheStats().size).toBe(1);

      injector.clearCache();
      expect(injector.getCacheStats().size).toBe(0);
    });

    it('should report cache statistics', async () => {
      mockFs.readFile.mockResolvedValue('{{name}}');

      await injector.loadTemplate('template1');
      await injector.loadTemplate('template2');

      const stats = injector.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.templates).toContain('typescript/template1');
      expect(stats.templates).toContain('typescript/template2');
    });
  });

  // ============================================================================
  // Factory Function Tests
  // ============================================================================

  describe('createTemplateInjector', () => {
    it('should create injector with default language', () => {
      const injector = createTemplateInjector('/templates');
      expect(injector).toBeInstanceOf(TemplateInjector);
    });

    it('should create injector with specified language', () => {
      const injector = createTemplateInjector('/templates', 'python');
      expect(injector).toBeInstanceOf(TemplateInjector);
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================

  describe('edge cases', () => {
    it('should handle empty parameters array', () => {
      const prd = createMockPRD();
      const tool = createMockTool({ parameters: [] });
      const context = injector.buildToolContext(tool, prd);

      expect(context.parameters).toEqual([]);
      expect(context.hasValidation).toBe(false);
    });

    it('should handle missing tool in patterns map', () => {
      const prd = createMockPRD();
      const tool = createMockTool({ name: 'unknown_tool' });
      const context = injector.buildToolContext(tool, prd);

      expect(context.retryable).toBe(false);
      expect(context.timeout).toBe(30000);
    });

    it('should handle empty external dependencies', () => {
      const prd = createMockPRD({
        dependencies: { external: [], internal: [] },
      });
      const tool = createMockTool();
      const context = injector.buildRetryToolContext(tool, prd);

      expect(context.fallbackEnabled).toBe(false);
      expect(context.timeoutMs).toBe(10000);
    });

    it('should handle arrays passed to non-array helpers gracefully', async () => {
      mockFs.readFile.mockResolvedValue('{{length notArray}}');

      const result = await injector.render('test', { notArray: 'string' });
      expect(result).toBe('0');
    });

    it('should handle non-string passed to string helpers', async () => {
      mockFs.readFile.mockResolvedValue('{{trim notString}}');

      const result = await injector.render('test', { notString: 123 });
      expect(result).toBe('');
    });
  });
});
