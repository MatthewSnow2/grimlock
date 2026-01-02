/**
 * GRIMLOCK MCP Generator
 *
 * Orchestrates the complete MCP server generation pipeline:
 * 1. Parse and normalize PRD
 * 2. Select patterns based on requirements
 * 3. Generate code using templates
 * 4. Assemble into complete project structure
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';

import {
  NormalizedPRD,
  GeneratedFile,
  GeneratedFileSet,
  Language,
  ToolDefinition,
  ToolParameter,
  ErrorScenario,
  ExternalDependency,
  EnvVarDefinition,
  GlobalPatternConfig,
  ToolPatternConfig,
} from '../types/patterns.js';

import {
  PatternSelector,
  createPatternSelector,
  PatternSelectorConfig,
} from './pattern-selector.js';

import {
  TemplateInjector,
  createTemplateInjector,
} from './template-injector.js';

/**
 * Raw PRD data as parsed from YAML
 */
export interface RawPRD {
  project: {
    name: string;
    version: string;
    description: string;
    sdk: string;
    node_version?: string;
    python_version?: string;
  };
  production_patterns?: {
    enabled?: string[];
    long_running_operations?: boolean;
  };
  error_handling?: {
    expected_scenarios?: string[];
    custom_errors?: Array<{
      code: string;
      message: string;
      retry_after?: boolean;
    }>;
  };
  external_dependencies?: {
    enabled?: boolean;
    primary_url?: string;
    fallback_url?: string;
    timeout_seconds?: number;
    retry_config?: {
      max_retries?: number;
      backoff_multiplier?: number;
    };
  };
  tools: Array<{
    name: string;
    description: string;
    long_running?: boolean;
    progress_notifications?: boolean;
    estimated_duration_seconds?: number;
    parameters: Array<{
      name: string;
      type: string;
      required: boolean;
      description?: string;
      default?: unknown;
      validation?: {
        pattern?: string;
        min_length?: number;
        max_length?: number;
        minimum?: number;
        maximum?: number;
        enum?: string[];
      };
    }>;
    behavior?: {
      api_endpoint?: string;
      returns?: string;
      error_handling?: Array<{
        condition: string;
        response: string;
      }>;
    };
  }>;
  configuration?: {
    environment_variables?: Array<{
      name: string;
      description: string;
      required: boolean;
      default?: string;
    }>;
    runtime_options?: Array<{
      name: string;
      type: string;
      default: unknown;
      description: string;
    }>;
  };
}

/**
 * MCP Generator configuration
 */
export interface McpGeneratorConfig {
  /** Directory containing templates */
  templateDir: string;
  /** Output directory for generated files */
  outputDir: string;
  /** Pattern selector configuration */
  patternConfig?: Partial<PatternSelectorConfig>;
  /** Whether to generate tests */
  generateTests: boolean;
  /** Whether to generate documentation */
  generateDocs: boolean;
}

const DEFAULT_CONFIG: McpGeneratorConfig = {
  templateDir: 'templates',
  outputDir: 'output',
  generateTests: true,
  generateDocs: true,
};

/**
 * MCP Generator - Orchestrates complete code generation
 */
export class McpGenerator {
  private config: McpGeneratorConfig;
  private patternSelector: PatternSelector;
  private templateInjector: TemplateInjector | null = null;

  constructor(config: Partial<McpGeneratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.patternSelector = createPatternSelector(this.config.patternConfig);
  }

  /**
   * Generate complete MCP project from PRD file
   */
  async generateFromFile(prdPath: string): Promise<GeneratedFileSet> {
    const prdContent = await fs.readFile(prdPath, 'utf-8');
    const rawPrd = parseYaml(prdContent) as RawPRD;
    return this.generate(rawPrd);
  }

  /**
   * Generate complete MCP project from parsed PRD
   */
  async generate(rawPrd: RawPRD): Promise<GeneratedFileSet> {
    // Step 1: Normalize PRD
    const prd = this.normalizePRD(rawPrd);

    // Step 2: Initialize template injector
    this.templateInjector = createTemplateInjector(
      this.config.templateDir,
      prd.metadata.language
    );

    // Step 3: Generate pattern manifest
    const manifest = this.patternSelector.generateManifest(prd);

    // Step 4: Generate files
    const files: GeneratedFile[] = [];

    // Generate global pattern files
    for (const globalPattern of manifest.globalPatterns) {
      try {
        const fragment = await this.templateInjector.renderGlobalPattern(
          globalPattern,
          prd
        );
        files.push({
          path: globalPattern.outputPath,
          content: fragment.code,
          type: 'source',
        });
      } catch (error) {
        // Template may not exist yet - generate placeholder
        files.push({
          path: globalPattern.outputPath,
          content: this.generatePlaceholder(globalPattern.pattern, prd),
          type: 'source',
        });
      }
    }

    // Generate tool files
    for (const tool of prd.tools) {
      const toolPatterns = manifest.toolPatterns.get(tool.name) || [];
      const toolCode = await this.generateToolCode(tool, toolPatterns, prd);

      files.push({
        path: `src/tools/${tool.name}.ts`,
        content: toolCode,
        type: 'source',
      });
    }

    // Generate index.ts
    files.push({
      path: 'src/index.ts',
      content: this.generateIndexFile(prd, manifest),
      type: 'source',
    });

    // Generate configuration files
    files.push({
      path: 'package.json',
      content: this.generatePackageJson(prd),
      type: 'config',
    });

    files.push({
      path: 'tsconfig.json',
      content: this.generateTsConfig(),
      type: 'config',
    });

    files.push({
      path: '.gitignore',
      content: this.generateGitignore(),
      type: 'config',
    });

    files.push({
      path: '.env.example',
      content: this.generateEnvExample(prd),
      type: 'config',
    });

    // Generate documentation
    if (this.config.generateDocs) {
      files.push({
        path: 'README.md',
        content: this.generateReadme(prd, manifest),
        type: 'docs',
      });
    }

    // Generate tests
    if (this.config.generateTests) {
      for (const tool of prd.tools) {
        files.push({
          path: `tests/${tool.name}.test.ts`,
          content: this.generateToolTest(tool, prd),
          type: 'test',
        });
      }
    }

    return {
      files,
      entryPoint: 'src/index.ts',
      dependencies: this.getDependencies(prd),
    };
  }

  /**
   * Write generated files to output directory
   */
  async writeFiles(fileSet: GeneratedFileSet, outputDir?: string): Promise<void> {
    const targetDir = outputDir || this.config.outputDir;

    for (const file of fileSet.files) {
      const filePath = path.join(targetDir, file.path);
      const dirPath = path.dirname(filePath);

      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(filePath, file.content, 'utf-8');
    }
  }

  /**
   * Normalize raw PRD into structured format
   */
  private normalizePRD(raw: RawPRD): NormalizedPRD {
    const language: Language = raw.project.sdk === 'python' ? 'python' : 'typescript';

    // Parse error scenarios
    const errorScenarios: ErrorScenario[] = (
      raw.error_handling?.expected_scenarios || []
    ).filter((s): s is ErrorScenario =>
      [
        'invalid_input',
        'api_unavailable',
        'rate_limiting',
        'auth_failure',
        'network_timeout',
        'resource_not_found',
        'validation_error',
        'internal_error',
      ].includes(s)
    );

    // Parse enabled patterns
    const enabledPatterns = raw.production_patterns?.enabled || [];

    // Build global pattern config
    const globalConfig: GlobalPatternConfig = {
      errorHandling: {
        enabled:
          enabledPatterns.includes('error_handling') ||
          errorScenarios.length > 0,
        scenarios: errorScenarios,
        customErrorTypes: (raw.error_handling?.custom_errors?.length || 0) > 0,
      },
      logging: {
        enabled: enabledPatterns.includes('logging'),
        level: 'info',
        structured: true,
      },
      validation: {
        enabled: enabledPatterns.includes('input_validation'),
        strict: true,
      },
    };

    // Build tool definitions
    const tools: ToolDefinition[] = raw.tools.map(t => ({
      name: t.name,
      description: t.description,
      longRunning: t.long_running || false,
      progressNotifications: t.progress_notifications || false,
      parameters: t.parameters.map(
        (p): ToolParameter => ({
          name: p.name,
          type: p.type as ToolParameter['type'],
          required: p.required,
          description: p.description,
          // Convert snake_case validation keys to camelCase
          validation: p.validation
            ? {
                pattern: p.validation.pattern,
                minLength: p.validation.min_length,
                maxLength: p.validation.max_length,
                minimum: p.validation.minimum,
                maximum: p.validation.maximum,
                enum: p.validation.enum,
              }
            : undefined,
        })
      ),
      returns: t.behavior?.returns,
    }));

    // Build tool pattern configs
    const toolPatterns = new Map<string, ToolPatternConfig>();
    for (const tool of raw.tools) {
      toolPatterns.set(tool.name, {
        longRunning: tool.long_running || false,
        progressNotifications: tool.progress_notifications || false,
        retryable:
          raw.external_dependencies?.enabled === true &&
          (raw.external_dependencies?.retry_config?.max_retries || 0) > 0,
        retryConfig:
          raw.external_dependencies?.retry_config
            ? {
                maxAttempts: raw.external_dependencies.retry_config.max_retries || 3,
                backoffStrategy: 'exponential',
                retryableErrors: ['NetworkTimeoutError', 'RateLimitError'],
              }
            : undefined,
        timeout: (raw.external_dependencies?.timeout_seconds || 10) * 1000,
      });
    }

    // Build external dependencies
    const externalDeps: ExternalDependency[] = [];
    if (raw.external_dependencies?.enabled) {
      externalDeps.push({
        enabled: true,
        primaryUrl: raw.external_dependencies.primary_url,
        fallbackUrl: raw.external_dependencies.fallback_url,
        timeoutSeconds: raw.external_dependencies.timeout_seconds || 10,
      });
    }

    // Build environment variables
    const envVars: EnvVarDefinition[] = (
      raw.configuration?.environment_variables || []
    ).map(v => ({
      name: v.name,
      description: v.description,
      required: v.required,
      defaultValue: v.default,
    }));

    return {
      metadata: {
        name: raw.project.name,
        version: raw.project.version,
        description: raw.project.description,
        language,
      },
      patterns: {
        global: globalConfig,
        tools: toolPatterns,
      },
      dependencies: {
        external: externalDeps,
        internal: [],
      },
      tools,
      configuration: {
        environmentVariables: envVars,
        runtimeConfig: {},
      },
    };
  }

  /**
   * Generate code for a single tool
   */
  private async generateToolCode(
    tool: ToolDefinition,
    patterns: Array<{ pattern: string; context: Record<string, unknown> }>,
    prd: NormalizedPRD
  ): Promise<string> {
    const schemaName = this.toPascalCase(tool.name) + 'Schema';
    const typeName = this.toPascalCase(tool.name) + 'Input';

    let code = `/**
 * ${tool.name} - ${tool.description}
 * Generated by GRIMLOCK MCP Factory
 */

import { z } from 'zod';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
`;

    // Add imports based on patterns
    if (prd.patterns.global.errorHandling.enabled) {
      code += `import { McpError, McpErrorCode } from '../errors/error-types.js';\n`;
      code += `import { handleMcpError } from '../errors/error-handler.js';\n`;
    }

    if (prd.patterns.global.logging.enabled) {
      code += `import { logger } from '../utils/logger.js';\n`;
    }

    code += `\n`;

    // Generate Zod schema
    code += `/**
 * Input validation schema for ${tool.name}
 */
export const ${schemaName} = z.object({\n`;

    for (const param of tool.parameters) {
      code += `  ${param.name}: ${this.generateZodType(param)},\n`;
    }

    code += `});\n\n`;
    code += `export type ${typeName} = z.infer<typeof ${schemaName}>;\n\n`;

    // Generate tool implementation
    code += `/**
 * ${tool.description}
 */
export async function ${tool.name}(
  args: unknown,
  server: Server,
  progressToken?: string | number
): Promise<CallToolResult> {
  try {
    // Validate input
    const parsed = ${schemaName}.safeParse(args);
    if (!parsed.success) {
      return {
        content: [{
          type: 'text',
          text: \`Invalid input: \${parsed.error.issues.map(i => i.message).join(', ')}\`,
        }],
        isError: true,
      };
    }

    const input = parsed.data;
`;

    // Add logging
    if (prd.patterns.global.logging.enabled) {
      code += `    logger.info('${tool.name} called', { tool: '${tool.name}' });\n\n`;
    }

    // Add progress notifications for long-running tools
    if (tool.longRunning || tool.progressNotifications) {
      code += `    // Send progress notification
    if (progressToken !== undefined) {
      await server.notification({
        method: 'notifications/progress',
        params: {
          progressToken,
          progress: 0,
          total: 100,
          message: 'Starting ${tool.name}...',
        },
      });
    }\n\n`;
    }

    // Business logic placeholder
    code += `    // TODO: Implement ${tool.name} business logic
    const result = {
      success: true,
      message: '${tool.name} executed successfully',
      data: input,
    };\n`;

    // Complete progress
    if (tool.longRunning || tool.progressNotifications) {
      code += `
    // Complete progress notification
    if (progressToken !== undefined) {
      await server.notification({
        method: 'notifications/progress',
        params: {
          progressToken,
          progress: 100,
          total: 100,
          message: '${tool.name} complete',
        },
      });
    }\n`;
    }

    // Add logging
    if (prd.patterns.global.logging.enabled) {
      code += `\n    logger.info('${tool.name} completed', { tool: '${tool.name}' });\n`;
    }

    code += `
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }],
    };

  } catch (error) {
`;

    if (prd.patterns.global.errorHandling.enabled) {
      code += `    return handleMcpError(error, { toolName: '${tool.name}' });\n`;
    } else {
      code += `    return {
      content: [{
        type: 'text',
        text: \`Error: \${error instanceof Error ? error.message : 'Unknown error'}\`,
      }],
      isError: true,
    };\n`;
    }

    code += `  }
}
`;

    return code;
  }

  /**
   * Generate Zod type string from parameter definition
   */
  private generateZodType(param: ToolParameter): string {
    let zodType: string;

    switch (param.type) {
      case 'string':
        zodType = 'z.string()';
        if (param.validation?.minLength) {
          zodType += `.min(${param.validation.minLength})`;
        }
        if (param.validation?.maxLength) {
          zodType += `.max(${param.validation.maxLength})`;
        }
        if (param.validation?.pattern) {
          zodType += `.regex(/${param.validation.pattern}/)`;
        }
        if (param.validation?.enum) {
          zodType = `z.enum([${param.validation.enum.map(e => `'${e}'`).join(', ')}])`;
        }
        break;
      case 'number':
        zodType = 'z.number()';
        if (param.validation?.minimum !== undefined) {
          zodType += `.min(${param.validation.minimum})`;
        }
        if (param.validation?.maximum !== undefined) {
          zodType += `.max(${param.validation.maximum})`;
        }
        break;
      case 'boolean':
        zodType = 'z.boolean()';
        break;
      case 'array':
        zodType = 'z.array(z.unknown())';
        break;
      case 'object':
        zodType = 'z.record(z.string(), z.unknown())';
        break;
      default:
        zodType = 'z.unknown()';
    }

    if (param.description) {
      zodType += `.describe('${param.description.replace(/'/g, "\\'")}')`;
    }

    if (!param.required) {
      zodType += '.optional()';
    }

    return zodType;
  }

  /**
   * Generate index.ts entry point
   */
  private generateIndexFile(
    prd: NormalizedPRD,
    manifest: ReturnType<PatternSelector['generateManifest']>
  ): string {
    let code = `#!/usr/bin/env node
/**
 * ${prd.metadata.name} - MCP Server
 * ${prd.metadata.description}
 *
 * Generated by GRIMLOCK MCP Factory
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

`;

    // Import tools
    for (const tool of prd.tools) {
      const importName = this.toCamelCase(tool.name);
      code += `import { ${tool.name}, ${this.toPascalCase(tool.name)}Schema } from './tools/${tool.name}.js';\n`;
    }

    if (prd.patterns.global.logging.enabled) {
      code += `import { logger } from './utils/logger.js';\n`;
    }

    code += `
/**
 * Initialize and start the MCP server
 */
async function main() {
  const server = new Server(
    {
      name: '${prd.metadata.name}',
      version: '${prd.metadata.version}',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool listing handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
`;

    // Add tool definitions
    for (const tool of prd.tools) {
      code += `        {
          name: '${tool.name}',
          description: '${this.escapeJsString(tool.description)}',
          inputSchema: {
            type: 'object',
            properties: {
`;

      for (const param of tool.parameters) {
        code += `              ${param.name}: {
                type: '${param.type}',
                description: '${this.escapeJsString(param.description || '')}',
              },
`;
      }

      const requiredParams = tool.parameters.filter(p => p.required).map(p => `'${p.name}'`);
      code += `            },
            required: [${requiredParams.join(', ')}],
          },
        },
`;
    }

    code += `      ],
    };
  });

  // Register tool execution handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const progressToken = request.params._meta?.progressToken;

    switch (name) {
`;

    // Add tool cases
    for (const tool of prd.tools) {
      code += `      case '${tool.name}':
        return ${tool.name}(args, server, progressToken);

`;
    }

    code += `      default:
        return {
          content: [{
            type: 'text',
            text: \`Unknown tool: \${name}\`,
          }],
          isError: true,
        };
    }
  });

  // Start the server
  const transport = new StdioServerTransport();
  await server.connect(transport);
`;

    if (prd.patterns.global.logging.enabled) {
      code += `  logger.info('${prd.metadata.name} MCP server started');\n`;
    } else {
      code += `  console.error('${prd.metadata.name} MCP server started');\n`;
    }

    code += `}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
`;

    return code;
  }

  /**
   * Generate package.json
   */
  private generatePackageJson(prd: NormalizedPRD): string {
    const pkg = {
      name: prd.metadata.name,
      version: prd.metadata.version,
      description: prd.metadata.description,
      type: 'module',
      main: 'dist/index.js',
      scripts: {
        build: 'tsc',
        start: 'node dist/index.js',
        dev: 'tsc -w',
        test: 'jest',
        lint: 'eslint src --ext .ts',
      },
      dependencies: {
        '@modelcontextprotocol/sdk': '^1.0.0',
        zod: '^3.22.4',
      },
      devDependencies: {
        '@types/node': '^20.11.0',
        typescript: '^5.3.3',
        '@types/jest': '^29.5.12',
        jest: '^29.7.0',
        'ts-jest': '^29.1.2',
      },
      engines: {
        node: '>=18.0.0',
      },
    };

    return JSON.stringify(pkg, null, 2);
  }

  /**
   * Generate tsconfig.json
   */
  private generateTsConfig(): string {
    const config = {
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        lib: ['ES2022'],
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist'],
    };

    return JSON.stringify(config, null, 2);
  }

  /**
   * Generate .gitignore
   */
  private generateGitignore(): string {
    return `# Dependencies
node_modules/

# Build output
dist/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Test coverage
coverage/
`;
  }

  /**
   * Generate .env.example
   */
  private generateEnvExample(prd: NormalizedPRD): string {
    let content = `# ${prd.metadata.name} Environment Variables\n\n`;

    for (const envVar of prd.configuration.environmentVariables) {
      content += `# ${envVar.description}\n`;
      content += `${envVar.name}=${envVar.defaultValue || ''}\n\n`;
    }

    return content;
  }

  /**
   * Generate README.md
   */
  private generateReadme(
    prd: NormalizedPRD,
    manifest: ReturnType<PatternSelector['generateManifest']>
  ): string {
    let readme = `# ${prd.metadata.name}

> Generated by **GRIMLOCK** - MCP Factory for production-grade MCP servers

${prd.metadata.description}

## Architecture

This MCP server implements production patterns for reliability:

`;

    // List enabled patterns
    if (prd.patterns.global.errorHandling.enabled) {
      readme += `- **Error Handling**: Structured error types with MCP protocol codes\n`;
    }
    if (prd.patterns.global.validation.enabled) {
      readme += `- **Input Validation**: Zod schemas for runtime type safety\n`;
    }
    if (prd.patterns.global.logging.enabled) {
      readme += `- **Logging**: Structured logging via MCP notifications\n`;
    }
    if (prd.dependencies.external.some(d => d.enabled)) {
      readme += `- **Graceful Degradation**: Fallback strategies for external services\n`;
    }
    if (prd.tools.some(t => t.progressNotifications)) {
      readme += `- **Progress Notifications**: Real-time updates for long operations\n`;
    }

    readme += `
## Installation

\`\`\`bash
npm install
npm run build
\`\`\`

## Testing with MCP Inspector

\`\`\`bash
npx @modelcontextprotocol/inspector node dist/index.js
\`\`\`

## Claude Desktop Configuration

Add to your \`claude_desktop_config.json\`:

\`\`\`json
{
  "mcpServers": {
    "${prd.metadata.name}": {
      "command": "node",
      "args": ["/absolute/path/to/${prd.metadata.name}/dist/index.js"]
    }
  }
}
\`\`\`

## Available Tools

`;

    for (const tool of prd.tools) {
      readme += `### \`${tool.name}\`

${tool.description}

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
`;

      for (const param of tool.parameters) {
        readme += `| \`${param.name}\` | ${param.type} | ${param.required ? 'Yes' : 'No'} | ${param.description || '-'} |\n`;
      }

      readme += '\n';
    }

    readme += `## Environment Variables

`;

    if (prd.configuration.environmentVariables.length > 0) {
      readme += `| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
`;

      for (const envVar of prd.configuration.environmentVariables) {
        readme += `| \`${envVar.name}\` | ${envVar.description} | ${envVar.required ? 'Yes' : 'No'} | ${envVar.defaultValue || '-'} |\n`;
      }
    } else {
      readme += `No environment variables required.\n`;
    }

    readme += `
## Development

\`\`\`bash
npm run dev    # Watch mode
npm test       # Run tests
npm run lint   # Lint code
\`\`\`

## License

MIT

---

*Generated by GRIMLOCK MCP Factory*
`;

    return readme;
  }

  /**
   * Generate test file for a tool
   */
  private generateToolTest(tool: ToolDefinition, prd: NormalizedPRD): string {
    const schemaName = this.toPascalCase(tool.name) + 'Schema';

    return `/**
 * Tests for ${tool.name}
 * Generated by GRIMLOCK MCP Factory
 */

import { ${tool.name}, ${schemaName} } from '../src/tools/${tool.name}.js';

describe('${tool.name}', () => {
  const mockServer = {
    notification: jest.fn().mockResolvedValue(undefined),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('input validation', () => {
    it('should reject invalid input', async () => {
      const result = await ${tool.name}({}, mockServer);
      expect(result.isError).toBe(true);
    });

    it('should accept valid input', async () => {
      const validInput = {
        ${tool.parameters.filter(p => p.required).map(p => `${p.name}: ${this.getTestValue(p)}`).join(',\n        ')}
      };

      const result = await ${tool.name}(validInput, mockServer);
      expect(result.isError).toBeFalsy();
    });
  });

  describe('schema validation', () => {
    it('should validate correct types', () => {
      const validInput = {
        ${tool.parameters.filter(p => p.required).map(p => `${p.name}: ${this.getTestValue(p)}`).join(',\n        ')}
      };

      const result = ${schemaName}.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject incorrect types', () => {
      const invalidInput = {
        ${tool.parameters.map(p => `${p.name}: ${this.getInvalidTestValue(p)}`).join(',\n        ')}
      };

      const result = ${schemaName}.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });
${tool.progressNotifications ? `
  describe('progress notifications', () => {
    it('should send progress updates', async () => {
      const validInput = {
        ${tool.parameters.filter(p => p.required).map(p => `${p.name}: ${this.getTestValue(p)}`).join(',\n        ')}
      };

      await ${tool.name}(validInput, mockServer, 'test-token');

      expect(mockServer.notification).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'notifications/progress',
        })
      );
    });
  });
` : ''}});
`;
  }

  /**
   * Get test value for parameter type
   */
  private getTestValue(param: ToolParameter): string {
    switch (param.type) {
      case 'string':
        return param.validation?.enum
          ? `'${param.validation.enum[0]}'`
          : "'test-value'";
      case 'number':
        return param.validation?.minimum?.toString() || '42';
      case 'boolean':
        return 'true';
      case 'array':
        return '[]';
      case 'object':
        return '{}';
      default:
        return 'null';
    }
  }

  /**
   * Get invalid test value for parameter type
   */
  private getInvalidTestValue(param: ToolParameter): string {
    switch (param.type) {
      case 'string':
        return '123'; // number instead of string
      case 'number':
        return "'not-a-number'";
      case 'boolean':
        return "'not-a-boolean'";
      case 'array':
        return "'not-an-array'";
      case 'object':
        return "'not-an-object'";
      default:
        return 'undefined';
    }
  }

  /**
   * Generate placeholder for missing templates
   */
  private generatePlaceholder(pattern: string, prd: NormalizedPRD): string {
    return `/**
 * ${pattern} - Placeholder
 * Generated by GRIMLOCK MCP Factory
 *
 * TODO: Implement ${pattern} pattern
 * See docs/PATTERNS.md for implementation guidance
 */

export const ${this.toCamelCase(pattern)}Placeholder = true;
`;
  }

  /**
   * Get required dependencies
   */
  private getDependencies(prd: NormalizedPRD): string[] {
    const deps = ['@modelcontextprotocol/sdk', 'zod'];

    if (prd.dependencies.external.some(d => d.enabled)) {
      deps.push('node-fetch');
    }

    return deps;
  }

  // Case conversion utilities
  private toCamelCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
  }

  private toPascalCase(str: string): string {
    const camel = this.toCamelCase(str);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
  }

  /**
   * Escape string for use in JavaScript single-quoted string literal
   */
  private escapeJsString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }
}

/**
 * Create a configured McpGenerator instance
 */
export function createMcpGenerator(
  config?: Partial<McpGeneratorConfig>
): McpGenerator {
  return new McpGenerator(config);
}

/**
 * Generate MCP from PRD file (convenience function)
 */
export async function generateMcpFromPrd(
  prdPath: string,
  outputDir: string,
  config?: Partial<McpGeneratorConfig>
): Promise<GeneratedFileSet> {
  const generator = new McpGenerator({ ...config, outputDir });
  const fileSet = await generator.generateFromFile(prdPath);
  await generator.writeFiles(fileSet, outputDir);
  return fileSet;
}
