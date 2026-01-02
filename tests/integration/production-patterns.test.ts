/**
 * Integration Tests for GRIMLOCK Production Patterns
 *
 * Tests the complete code generation pipeline from PRD to generated MCP server.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

import {
  McpGenerator,
  createMcpGenerator,
  RawPRD,
} from '../../src/generators/mcp-generator';

import {
  PatternSelector,
  createPatternSelector,
  analyzeToolRequirements,
} from '../../src/generators/pattern-selector';

import {
  NormalizedPRD,
  ToolDefinition,
  ErrorScenario,
} from '../../src/types/patterns';

// Sample PRD for testing
const samplePRD: RawPRD = {
  project: {
    name: 'test-greeting-mcp',
    version: '1.0.0',
    description: 'Test MCP server for integration testing',
    sdk: 'typescript',
    node_version: '18+',
  },
  production_patterns: {
    enabled: ['error_handling', 'input_validation', 'logging'],
    long_running_operations: false,
  },
  error_handling: {
    expected_scenarios: ['invalid_input', 'internal_error'],
    custom_errors: [],
  },
  external_dependencies: {
    enabled: false,
  },
  tools: [
    {
      name: 'say_hello',
      description: 'Returns a friendly greeting',
      long_running: false,
      progress_notifications: false,
      parameters: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'The name to greet',
          validation: {
            min_length: 1,
            max_length: 100,
          },
        },
        {
          name: 'formal',
          type: 'boolean',
          required: false,
          description: 'Use formal greeting',
        },
      ],
      behavior: {
        returns: 'string',
      },
    },
    {
      name: 'get_time_greeting',
      description: 'Returns time-appropriate greeting',
      long_running: false,
      progress_notifications: false,
      parameters: [],
      behavior: {
        returns: 'string',
      },
    },
  ],
  configuration: {
    environment_variables: [
      {
        name: 'GREETING_PREFIX',
        description: 'Prefix for all greetings',
        required: false,
        default: 'Hello',
      },
    ],
  },
};

// PRD with long-running operations and external deps
const complexPRD: RawPRD = {
  project: {
    name: 'test-complex-mcp',
    version: '1.0.0',
    description: 'Complex MCP with all patterns enabled',
    sdk: 'typescript',
  },
  production_patterns: {
    enabled: [
      'error_handling',
      'input_validation',
      'logging',
      'graceful_degradation',
      'progress_notifications',
    ],
    long_running_operations: true,
  },
  error_handling: {
    expected_scenarios: [
      'invalid_input',
      'api_unavailable',
      'rate_limiting',
      'network_timeout',
      'internal_error',
    ],
  },
  external_dependencies: {
    enabled: true,
    primary_url: 'https://api.example.com',
    fallback_url: 'https://backup.example.com',
    timeout_seconds: 30,
    retry_config: {
      max_retries: 3,
      backoff_multiplier: 2,
    },
  },
  tools: [
    {
      name: 'fetch_data',
      description: 'Fetches data from external API',
      long_running: true,
      progress_notifications: true,
      estimated_duration_seconds: 30,
      parameters: [
        {
          name: 'query',
          type: 'string',
          required: true,
          description: 'Search query',
        },
        {
          name: 'limit',
          type: 'number',
          required: false,
          description: 'Maximum results',
          validation: {
            minimum: 1,
            maximum: 100,
          },
        },
      ],
      behavior: {
        api_endpoint: 'GET /api/data',
        returns: 'object',
      },
    },
  ],
  configuration: {
    environment_variables: [
      {
        name: 'API_KEY',
        description: 'API authentication key',
        required: true,
      },
      {
        name: 'API_TIMEOUT',
        description: 'Request timeout in ms',
        required: false,
        default: '30000',
      },
    ],
  },
};

describe('PatternSelector', () => {
  let selector: PatternSelector;

  beforeEach(() => {
    selector = createPatternSelector();
  });

  describe('analyzeToolRequirements', () => {
    it('should always include error handling by default', () => {
      const generator = createMcpGenerator();
      const prd = (generator as any).normalizePRD(samplePRD);
      const tool = prd.tools[0];

      const requirements = selector.analyzeToolRequirements(tool, prd);

      expect(requirements.needsErrorHandling).toBe(true);
    });

    it('should always include validation by default', () => {
      const generator = createMcpGenerator();
      const prd = (generator as any).normalizePRD(samplePRD);
      const tool = prd.tools[0];

      const requirements = selector.analyzeToolRequirements(tool, prd);

      expect(requirements.needsInputValidation).toBe(true);
    });

    it('should detect progress notifications for long-running tools', () => {
      const generator = createMcpGenerator();
      const prd = (generator as any).normalizePRD(complexPRD);
      const tool = prd.tools[0];

      const requirements = selector.analyzeToolRequirements(tool, prd);

      expect(requirements.needsProgressNotifications).toBe(true);
    });

    it('should detect graceful degradation for external dependencies', () => {
      const generator = createMcpGenerator();
      const prd = (generator as any).normalizePRD(complexPRD);
      const tool = prd.tools[0];

      const requirements = selector.analyzeToolRequirements(tool, prd);

      expect(requirements.needsGracefulDegradation).toBe(true);
    });

    it('should detect retry requirements', () => {
      const generator = createMcpGenerator();
      const prd = (generator as any).normalizePRD(complexPRD);
      const tool = prd.tools[0];

      const requirements = selector.analyzeToolRequirements(tool, prd);

      expect(requirements.needsRetry).toBe(true);
    });
  });

  describe('analyzeGlobalRequirements', () => {
    it('should include error types when error handling enabled', () => {
      const generator = createMcpGenerator();
      const prd = (generator as any).normalizePRD(samplePRD);

      const requirements = selector.analyzeGlobalRequirements(prd);

      expect(requirements.errorTypes).toBe(true);
      expect(requirements.errorHandler).toBe(true);
    });

    it('should include config loader when env vars exist', () => {
      const generator = createMcpGenerator();
      const prd = (generator as any).normalizePRD(samplePRD);

      const requirements = selector.analyzeGlobalRequirements(prd);

      expect(requirements.configLoader).toBe(true);
    });

    it('should include health check for external dependencies', () => {
      const generator = createMcpGenerator();
      const prd = (generator as any).normalizePRD(complexPRD);

      const requirements = selector.analyzeGlobalRequirements(prd);

      expect(requirements.healthCheck).toBe(true);
    });
  });

  describe('selectGlobalPatterns', () => {
    it('should select appropriate global patterns', () => {
      const generator = createMcpGenerator();
      const prd = (generator as any).normalizePRD(samplePRD);

      const patterns = selector.selectGlobalPatterns(prd);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.some(p => p.pattern === 'error-types')).toBe(true);
      expect(patterns.some(p => p.pattern === 'error-handler')).toBe(true);
    });

    it('should order patterns by priority', () => {
      const generator = createMcpGenerator();
      const prd = (generator as any).normalizePRD(complexPRD);

      const patterns = selector.selectGlobalPatterns(prd);

      // Error types should come before error handler
      const errorTypesIndex = patterns.findIndex(p => p.pattern === 'error-types');
      const errorHandlerIndex = patterns.findIndex(p => p.pattern === 'error-handler');

      if (errorTypesIndex !== -1 && errorHandlerIndex !== -1) {
        expect(errorTypesIndex).toBeLessThan(errorHandlerIndex);
      }
    });
  });

  describe('selectToolPatterns', () => {
    it('should select validated-tool for simple tools', () => {
      const generator = createMcpGenerator();
      const prd = (generator as any).normalizePRD(samplePRD);
      const tool = prd.tools[0];

      const patterns = selector.selectToolPatterns(tool, prd);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].pattern).toBe('validated-tool');
    });

    it('should select long-running-tool for complex tools', () => {
      const generator = createMcpGenerator();
      const prd = (generator as any).normalizePRD(complexPRD);
      const tool = prd.tools[0];

      const patterns = selector.selectToolPatterns(tool, prd);

      expect(patterns.some(p => p.pattern === 'long-running-tool')).toBe(true);
    });
  });

  describe('generateManifest', () => {
    it('should generate complete manifest', () => {
      const generator = createMcpGenerator();
      const prd = (generator as any).normalizePRD(samplePRD);

      const manifest = selector.generateManifest(prd);

      expect(manifest.globalPatterns).toBeDefined();
      expect(manifest.toolPatterns).toBeDefined();
      expect(manifest.dependencies).toBeDefined();
      expect(manifest.generationOrder).toBeDefined();
    });

    it('should include all tools in manifest', () => {
      const generator = createMcpGenerator();
      const prd = (generator as any).normalizePRD(samplePRD);

      const manifest = selector.generateManifest(prd);

      expect(manifest.toolPatterns.size).toBe(prd.tools.length);
    });
  });
});

describe('McpGenerator', () => {
  let generator: McpGenerator;
  let tempDir: string;

  beforeEach(async () => {
    generator = createMcpGenerator({
      templateDir: 'templates',
      generateTests: true,
      generateDocs: true,
    });
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'grimlock-test-'));
  });

  afterEach(async () => {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('normalizePRD', () => {
    it('should normalize simple PRD', () => {
      const prd = (generator as any).normalizePRD(samplePRD);

      expect(prd.metadata.name).toBe('test-greeting-mcp');
      expect(prd.metadata.language).toBe('typescript');
      expect(prd.tools.length).toBe(2);
    });

    it('should extract error scenarios', () => {
      const prd = (generator as any).normalizePRD(samplePRD);

      expect(prd.patterns.global.errorHandling.enabled).toBe(true);
      expect(prd.patterns.global.errorHandling.scenarios).toContain('invalid_input');
    });

    it('should extract environment variables', () => {
      const prd = (generator as any).normalizePRD(samplePRD);

      expect(prd.configuration.environmentVariables.length).toBe(1);
      expect(prd.configuration.environmentVariables[0].name).toBe('GREETING_PREFIX');
    });

    it('should normalize tool parameters', () => {
      const prd = (generator as any).normalizePRD(samplePRD);
      const tool = prd.tools[0];

      expect(tool.parameters.length).toBe(2);
      expect(tool.parameters[0].name).toBe('name');
      expect(tool.parameters[0].required).toBe(true);
      expect(tool.parameters[0].validation?.minLength).toBe(1);
    });
  });

  describe('generate', () => {
    it('should generate all required files', async () => {
      const result = await generator.generate(samplePRD);

      // Check for core files
      const filePaths = result.files.map(f => f.path);

      expect(filePaths).toContain('src/index.ts');
      expect(filePaths).toContain('package.json');
      expect(filePaths).toContain('tsconfig.json');
      expect(filePaths).toContain('.gitignore');
      expect(filePaths).toContain('.env.example');
      expect(filePaths).toContain('README.md');
    });

    it('should generate tool files', async () => {
      const result = await generator.generate(samplePRD);

      const filePaths = result.files.map(f => f.path);

      expect(filePaths).toContain('src/tools/say_hello.ts');
      expect(filePaths).toContain('src/tools/get_time_greeting.ts');
    });

    it('should generate test files when enabled', async () => {
      const result = await generator.generate(samplePRD);

      const filePaths = result.files.map(f => f.path);

      expect(filePaths).toContain('tests/say_hello.test.ts');
      expect(filePaths).toContain('tests/get_time_greeting.test.ts');
    });

    it('should set correct entry point', async () => {
      const result = await generator.generate(samplePRD);

      expect(result.entryPoint).toBe('src/index.ts');
    });

    it('should list required dependencies', async () => {
      const result = await generator.generate(samplePRD);

      expect(result.dependencies).toContain('@modelcontextprotocol/sdk');
      expect(result.dependencies).toContain('zod');
    });
  });

  describe('generated code quality', () => {
    it('should generate valid package.json', async () => {
      const result = await generator.generate(samplePRD);

      const packageJsonFile = result.files.find(f => f.path === 'package.json');
      expect(packageJsonFile).toBeDefined();

      const packageJson = JSON.parse(packageJsonFile!.content);

      expect(packageJson.name).toBe('test-greeting-mcp');
      expect(packageJson.version).toBe('1.0.0');
      expect(packageJson.dependencies['@modelcontextprotocol/sdk']).toBeDefined();
      expect(packageJson.dependencies['zod']).toBeDefined();
    });

    it('should generate valid tsconfig.json', async () => {
      const result = await generator.generate(samplePRD);

      const tsConfigFile = result.files.find(f => f.path === 'tsconfig.json');
      expect(tsConfigFile).toBeDefined();

      const tsConfig = JSON.parse(tsConfigFile!.content);

      expect(tsConfig.compilerOptions.target).toBe('ES2022');
      expect(tsConfig.compilerOptions.module).toBe('NodeNext');
      expect(tsConfig.compilerOptions.strict).toBe(true);
    });

    it('should generate tool code with Zod schema', async () => {
      const result = await generator.generate(samplePRD);

      const toolFile = result.files.find(f => f.path === 'src/tools/say_hello.ts');
      expect(toolFile).toBeDefined();

      const code = toolFile!.content;

      expect(code).toContain('import { z } from');
      expect(code).toContain('SayHelloSchema');
      expect(code).toContain('z.string()');
      expect(code).toContain('.min(1)');
      expect(code).toContain('.max(100)');
    });

    it('should generate index.ts with tool registration', async () => {
      const result = await generator.generate(samplePRD);

      const indexFile = result.files.find(f => f.path === 'src/index.ts');
      expect(indexFile).toBeDefined();

      const code = indexFile!.content;

      expect(code).toContain('import { Server }');
      expect(code).toContain('import { say_hello');
      expect(code).toContain('import { get_time_greeting');
      expect(code).toContain("case 'say_hello':");
      expect(code).toContain("case 'get_time_greeting':");
    });

    it('should generate README with tool documentation', async () => {
      const result = await generator.generate(samplePRD);

      const readmeFile = result.files.find(f => f.path === 'README.md');
      expect(readmeFile).toBeDefined();

      const content = readmeFile!.content;

      expect(content).toContain('# test-greeting-mcp');
      expect(content).toContain('## Available Tools');
      expect(content).toContain('`say_hello`');
      expect(content).toContain('`get_time_greeting`');
    });
  });

  describe('writeFiles', () => {
    it('should write all files to output directory', async () => {
      const result = await generator.generate(samplePRD);

      await generator.writeFiles(result, tempDir);

      // Check core files exist
      const indexPath = path.join(tempDir, 'src/index.ts');
      const packagePath = path.join(tempDir, 'package.json');

      await expect(fs.access(indexPath)).resolves.toBeUndefined();
      await expect(fs.access(packagePath)).resolves.toBeUndefined();
    });

    it('should create nested directories', async () => {
      const result = await generator.generate(samplePRD);

      await generator.writeFiles(result, tempDir);

      // Check nested directories exist
      const toolsDir = path.join(tempDir, 'src/tools');
      const testsDir = path.join(tempDir, 'tests');

      await expect(fs.access(toolsDir)).resolves.toBeUndefined();
      await expect(fs.access(testsDir)).resolves.toBeUndefined();
    });
  });

  describe('complex PRD generation', () => {
    it('should handle external dependencies', async () => {
      const result = await generator.generate(complexPRD);

      const envFile = result.files.find(f => f.path === '.env.example');
      expect(envFile).toBeDefined();
      expect(envFile!.content).toContain('API_KEY');
    });

    it('should include progress notifications for long-running tools', async () => {
      const result = await generator.generate(complexPRD);

      const toolFile = result.files.find(f => f.path === 'src/tools/fetch_data.ts');
      expect(toolFile).toBeDefined();

      const code = toolFile!.content;

      expect(code).toContain('progressToken');
      expect(code).toContain("method: 'notifications/progress'");
    });
  });
});

describe('End-to-End Generation', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'grimlock-e2e-'));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should generate a complete MCP project structure', async () => {
    const generator = createMcpGenerator({
      templateDir: 'templates',
      generateTests: true,
      generateDocs: true,
    });

    const result = await generator.generate(samplePRD);
    await generator.writeFiles(result, tempDir);

    // Verify project structure
    const expectedFiles = [
      'src/index.ts',
      'src/tools/say_hello.ts',
      'src/tools/get_time_greeting.ts',
      'tests/say_hello.test.ts',
      'tests/get_time_greeting.test.ts',
      'package.json',
      'tsconfig.json',
      '.gitignore',
      '.env.example',
      'README.md',
    ];

    for (const file of expectedFiles) {
      const filePath = path.join(tempDir, file);
      await expect(fs.access(filePath)).resolves.toBeUndefined();
    }
  });

  it('should generate TypeScript code that references correct imports', async () => {
    const generator = createMcpGenerator({
      templateDir: 'templates',
    });

    const result = await generator.generate(samplePRD);

    const indexFile = result.files.find(f => f.path === 'src/index.ts');
    const code = indexFile!.content;

    // Verify imports are consistent with tool file paths
    expect(code).toContain("from './tools/say_hello.js'");
    expect(code).toContain("from './tools/get_time_greeting.js'");
  });
});
