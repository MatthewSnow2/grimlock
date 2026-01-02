/**
 * GRIMLOCK Template Injector
 *
 * Responsible for loading Handlebars templates, building context from PRD data,
 * and rendering code fragments for MCP server generation.
 */

import Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  TemplateContext,
  ToolDefinition,
  NormalizedPRD,
  RenderedFragment,
  GlobalPatternSelection,
  ToolPatternSelection,
  ErrorScenario,
  ToolParameter,
} from '../types/patterns';

/**
 * Options for template injection
 */
export interface InjectorOptions {
  templateDir: string;
  language: 'typescript' | 'python';
  helpers?: Record<string, Handlebars.HelperDelegate>;
  partials?: Record<string, string>;
}

/**
 * Error thrown when template operations fail
 */
export class TemplateInjectionError extends Error {
  constructor(
    message: string,
    public readonly templatePath?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'TemplateInjectionError';
  }
}

/**
 * Result of template compilation
 */
export interface CompiledTemplate {
  name: string;
  template: Handlebars.TemplateDelegate;
  path: string;
}

/**
 * Template Injector - Core class for template-based code generation
 */
export class TemplateInjector {
  private templateCache: Map<string, CompiledTemplate> = new Map();
  private handlebars: typeof Handlebars;
  private options: InjectorOptions;

  constructor(options: InjectorOptions) {
    this.options = options;
    this.handlebars = Handlebars.create();
    this.registerDefaultHelpers();
    this.registerCustomHelpers(options.helpers || {});
  }

  /**
   * Register default Handlebars helpers for code generation
   */
  private registerDefaultHelpers(): void {
    // Case conversion helpers
    this.handlebars.registerHelper('camelCase', (str: string) => {
      return this.toCamelCase(str);
    });

    this.handlebars.registerHelper('pascalCase', (str: string) => {
      return this.toPascalCase(str);
    });

    this.handlebars.registerHelper('snakeCase', (str: string) => {
      return this.toSnakeCase(str);
    });

    this.handlebars.registerHelper('screamingSnakeCase', (str: string) => {
      return this.toScreamingSnakeCase(str);
    });

    this.handlebars.registerHelper('kebabCase', (str: string) => {
      return this.toKebabCase(str);
    });

    // Conditional helpers
    this.handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
    this.handlebars.registerHelper('neq', (a: unknown, b: unknown) => a !== b);
    this.handlebars.registerHelper('gt', (a: number, b: number) => a > b);
    this.handlebars.registerHelper('gte', (a: number, b: number) => a >= b);
    this.handlebars.registerHelper('lt', (a: number, b: number) => a < b);
    this.handlebars.registerHelper('lte', (a: number, b: number) => a <= b);

    this.handlebars.registerHelper('and', (...args: unknown[]) => {
      // Remove the options object that Handlebars passes
      const values = args.slice(0, -1);
      return values.every(Boolean);
    });

    this.handlebars.registerHelper('or', (...args: unknown[]) => {
      const values = args.slice(0, -1);
      return values.some(Boolean);
    });

    this.handlebars.registerHelper('not', (value: unknown) => !value);

    // Array helpers
    this.handlebars.registerHelper('includes', (arr: unknown[], value: unknown) => {
      return Array.isArray(arr) && arr.includes(value);
    });

    this.handlebars.registerHelper('length', (arr: unknown[]) => {
      return Array.isArray(arr) ? arr.length : 0;
    });

    this.handlebars.registerHelper('join', (arr: unknown[], separator: string) => {
      return Array.isArray(arr) ? arr.join(separator) : '';
    });

    this.handlebars.registerHelper('first', (arr: unknown[]) => {
      return Array.isArray(arr) && arr.length > 0 ? arr[0] : undefined;
    });

    this.handlebars.registerHelper('last', (arr: unknown[]) => {
      return Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : undefined;
    });

    // String helpers
    this.handlebars.registerHelper('trim', (str: string) => {
      return typeof str === 'string' ? str.trim() : '';
    });

    this.handlebars.registerHelper('uppercase', (str: string) => {
      return typeof str === 'string' ? str.toUpperCase() : '';
    });

    this.handlebars.registerHelper('lowercase', (str: string) => {
      return typeof str === 'string' ? str.toLowerCase() : '';
    });

    this.handlebars.registerHelper('replace', (str: string, find: string, replace: string) => {
      return typeof str === 'string' ? str.replace(new RegExp(find, 'g'), replace) : '';
    });

    // JSON helper
    this.handlebars.registerHelper('json', (obj: unknown, indent?: number) => {
      return JSON.stringify(obj, null, indent ?? 2);
    });

    // Type mapping helper for TypeScript/Python
    this.handlebars.registerHelper('mapType', (type: string, language: string) => {
      return this.mapParameterType(type, language as 'typescript' | 'python');
    });

    // Indentation helper
    this.handlebars.registerHelper('indent', (str: string, spaces: number) => {
      const indent = ' '.repeat(spaces);
      return str.split('\n').map(line => indent + line).join('\n');
    });
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerCustomHelpers(helpers: Record<string, Handlebars.HelperDelegate>): void {
    for (const [name, helper] of Object.entries(helpers)) {
      this.handlebars.registerHelper(name, helper);
    }
  }

  /**
   * Load and compile a template from file
   */
  async loadTemplate(templateName: string): Promise<CompiledTemplate> {
    const cacheKey = `${this.options.language}/${templateName}`;

    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey)!;
    }

    const templatePath = path.join(
      this.options.templateDir,
      this.options.language,
      `${templateName}.hbs`
    );

    try {
      const templateSource = await fs.readFile(templatePath, 'utf-8');
      const template = this.handlebars.compile(templateSource);

      const compiled: CompiledTemplate = {
        name: templateName,
        template,
        path: templatePath,
      };

      this.templateCache.set(cacheKey, compiled);
      return compiled;
    } catch (error) {
      throw new TemplateInjectionError(
        `Failed to load template: ${templateName}`,
        templatePath,
        error as Error
      );
    }
  }

  /**
   * Render a template with the given context
   */
  async render(templateName: string, context: TemplateContext): Promise<string> {
    const compiled = await this.loadTemplate(templateName);

    try {
      return compiled.template(context);
    } catch (error) {
      throw new TemplateInjectionError(
        `Failed to render template: ${templateName}`,
        compiled.path,
        error as Error
      );
    }
  }

  /**
   * Build context for error-types template
   */
  buildErrorTypesContext(prd: NormalizedPRD): TemplateContext {
    const scenarios = prd.patterns.global.errorHandling.scenarios;

    return {
      serverName: prd.metadata.name,
      errorClasses: scenarios.map(scenario => ({
        className: this.scenarioToClassName(scenario),
        errorCode: this.scenarioToErrorCode(scenario),
        httpStatus: this.scenarioToHttpStatus(scenario),
        retryable: this.isRetryableScenario(scenario),
        message: this.scenarioToDefaultMessage(scenario),
      })),
      includeBaseClass: true,
      includeErrorCodes: true,
    };
  }

  /**
   * Build context for error-handler template
   */
  buildErrorHandlerContext(prd: NormalizedPRD): TemplateContext {
    const errorConfig = prd.patterns.global.errorHandling;
    const loggingConfig = prd.patterns.global.logging;

    return {
      serverName: prd.metadata.name,
      scenarios: errorConfig.scenarios,
      includeLogging: loggingConfig.enabled,
      logLevel: loggingConfig.level,
      structuredLogging: loggingConfig.structured,
      includeStackTrace: process.env.NODE_ENV !== 'production',
    };
  }

  /**
   * Build context for a tool with error handling
   */
  buildToolContext(tool: ToolDefinition, prd: NormalizedPRD): TemplateContext {
    const toolConfig = prd.patterns.tools.get(tool.name);

    return {
      TOOL_NAME: tool.name,
      TOOL_DESCRIPTION: tool.description,
      RETURN_TYPE: tool.returns || 'unknown',
      SCHEMA_NAME: `${this.toPascalCase(tool.name)}Schema`,
      parameters: tool.parameters.map(p => this.buildParameterContext(p)),
      longRunning: tool.longRunning,
      progressNotifications: tool.progressNotifications,
      retryable: toolConfig?.retryable ?? false,
      timeout: toolConfig?.timeout ?? 30000,
      hasValidation: tool.parameters.some(p => p.validation),
    };
  }

  /**
   * Build context for validated-tool-wrapper template
   */
  buildValidatedToolContext(tool: ToolDefinition, prd: NormalizedPRD): TemplateContext {
    const baseContext = this.buildToolContext(tool, prd);

    return {
      ...baseContext,
      validationEnabled: prd.patterns.global.validation.enabled,
      strictValidation: prd.patterns.global.validation.strict,
      validationRules: tool.parameters
        .filter(p => p.validation)
        .map(p => ({
          paramName: p.name,
          rules: p.validation,
        })),
    };
  }

  /**
   * Build context for retry-tool template
   */
  buildRetryToolContext(tool: ToolDefinition, prd: NormalizedPRD): TemplateContext {
    const toolConfig = prd.patterns.tools.get(tool.name);
    const externalDep = prd.dependencies.external[0];

    return {
      TOOL_NAME: tool.name,
      MAX_RETRIES: toolConfig?.retryConfig?.maxAttempts ?? 3,
      RETRY_DELAY_MS: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      backoffStrategy: toolConfig?.retryConfig?.backoffStrategy ?? 'exponential',
      retryableErrors: toolConfig?.retryConfig?.retryableErrors ?? [
        'NetworkTimeoutError',
        'ApiUnavailableError',
        'RateLimitError',
      ],
      fallbackEnabled: !!externalDep?.fallbackUrl,
      fallbackUrl: externalDep?.fallbackUrl,
      timeoutMs: (externalDep?.timeoutSeconds ?? 10) * 1000,
    };
  }

  /**
   * Build context for progress-tool template
   */
  buildProgressToolContext(tool: ToolDefinition): TemplateContext {
    return {
      TOOL_NAME: tool.name,
      progressEnabled: tool.progressNotifications,
      estimatedDuration: tool.longRunning ? 30000 : 5000,
      progressSteps: ['initializing', 'processing', 'finalizing'],
    };
  }

  /**
   * Render a global pattern
   */
  async renderGlobalPattern(
    selection: GlobalPatternSelection,
    prd: NormalizedPRD
  ): Promise<RenderedFragment> {
    const context = this.buildContextForPattern(selection.pattern, prd);
    const code = await this.render(selection.template.replace('.hbs', ''), context);

    return {
      pattern: selection.pattern,
      code,
      imports: this.extractImports(code),
      section: this.getPatternSection(selection.pattern),
      outputFile: selection.outputPath,
    };
  }

  /**
   * Render a tool pattern
   */
  async renderToolPattern(
    selection: ToolPatternSelection,
    tool: ToolDefinition,
    prd: NormalizedPRD
  ): Promise<RenderedFragment> {
    const context = this.buildContextForToolPattern(selection.pattern, tool, prd);
    const code = await this.render(selection.template.replace('.hbs', ''), context);

    return {
      pattern: selection.pattern,
      code,
      imports: this.extractImports(code),
      section: 'functions',
      outputFile: `src/tools/${tool.name}.ts`,
    };
  }

  /**
   * Build context based on pattern type
   */
  private buildContextForPattern(
    pattern: string,
    prd: NormalizedPRD
  ): TemplateContext {
    switch (pattern) {
      case 'error-types':
        return this.buildErrorTypesContext(prd);
      case 'error-handler':
        return this.buildErrorHandlerContext(prd);
      default:
        return { serverName: prd.metadata.name };
    }
  }

  /**
   * Build context based on tool pattern type
   */
  private buildContextForToolPattern(
    pattern: string,
    tool: ToolDefinition,
    prd: NormalizedPRD
  ): TemplateContext {
    switch (pattern) {
      case 'validated-tool':
        return this.buildValidatedToolContext(tool, prd);
      case 'retry-tool':
        return this.buildRetryToolContext(tool, prd);
      case 'progress-tool':
        return this.buildProgressToolContext(tool);
      default:
        return this.buildToolContext(tool, prd);
    }
  }

  /**
   * Extract import statements from rendered code
   */
  private extractImports(code: string): string[] {
    const importRegex = /^import\s+.*?;?\s*$/gm;
    const matches = code.match(importRegex);
    return matches || [];
  }

  /**
   * Get the section type for a pattern
   */
  private getPatternSection(pattern: string): RenderedFragment['section'] {
    const sectionMap: Record<string, RenderedFragment['section']> = {
      'error-types': 'classes',
      'error-handler': 'functions',
      'logger': 'functions',
      'config-loader': 'functions',
      'validation-schemas': 'types',
    };
    return sectionMap[pattern] || 'functions';
  }

  /**
   * Build parameter context for templates
   */
  private buildParameterContext(param: ToolParameter): TemplateContext {
    return {
      name: param.name,
      type: param.type,
      tsType: this.mapParameterType(param.type, 'typescript'),
      pyType: this.mapParameterType(param.type, 'python'),
      required: param.required,
      description: param.description,
      hasValidation: !!param.validation,
      validation: param.validation,
    };
  }

  /**
   * Map parameter type to language-specific type
   */
  mapParameterType(type: string, language: 'typescript' | 'python'): string {
    const typeMap: Record<string, Record<string, string>> = {
      string: { typescript: 'string', python: 'str' },
      number: { typescript: 'number', python: 'float' },
      boolean: { typescript: 'boolean', python: 'bool' },
      array: { typescript: 'unknown[]', python: 'List[Any]' },
      object: { typescript: 'Record<string, unknown>', python: 'Dict[str, Any]' },
    };

    return typeMap[type]?.[language] ?? type;
  }

  /**
   * Convert error scenario to class name
   */
  scenarioToClassName(scenario: ErrorScenario): string {
    const mapping: Record<ErrorScenario, string> = {
      invalid_input: 'InvalidInputError',
      api_unavailable: 'ApiUnavailableError',
      rate_limiting: 'RateLimitError',
      auth_failure: 'AuthenticationError',
      network_timeout: 'NetworkTimeoutError',
      resource_not_found: 'ResourceNotFoundError',
      validation_error: 'ValidationError',
      internal_error: 'InternalServerError',
    };
    return mapping[scenario];
  }

  /**
   * Convert error scenario to error code
   */
  scenarioToErrorCode(scenario: ErrorScenario): string {
    return scenario.toUpperCase();
  }

  /**
   * Convert error scenario to HTTP status code
   */
  scenarioToHttpStatus(scenario: ErrorScenario): number {
    const mapping: Record<ErrorScenario, number> = {
      invalid_input: 400,
      api_unavailable: 503,
      rate_limiting: 429,
      auth_failure: 401,
      network_timeout: 504,
      resource_not_found: 404,
      validation_error: 422,
      internal_error: 500,
    };
    return mapping[scenario];
  }

  /**
   * Check if an error scenario is retryable
   */
  isRetryableScenario(scenario: ErrorScenario): boolean {
    const retryable: ErrorScenario[] = [
      'api_unavailable',
      'rate_limiting',
      'network_timeout',
    ];
    return retryable.includes(scenario);
  }

  /**
   * Get default error message for scenario
   */
  scenarioToDefaultMessage(scenario: ErrorScenario): string {
    const mapping: Record<ErrorScenario, string> = {
      invalid_input: 'The provided input is invalid',
      api_unavailable: 'The external API is temporarily unavailable',
      rate_limiting: 'Rate limit exceeded, please try again later',
      auth_failure: 'Authentication failed',
      network_timeout: 'The request timed out',
      resource_not_found: 'The requested resource was not found',
      validation_error: 'Input validation failed',
      internal_error: 'An internal error occurred',
    };
    return mapping[scenario];
  }

  // Case conversion utilities
  toCamelCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^(.)/, c => c.toLowerCase());
  }

  toPascalCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^(.)/, c => c.toUpperCase());
  }

  toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .replace(/[-\s]+/g, '_')
      .toLowerCase()
      .replace(/^_/, '');
  }

  toScreamingSnakeCase(str: string): string {
    return this.toSnakeCase(str).toUpperCase();
  }

  toKebabCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '-$1')
      .replace(/[_\s]+/g, '-')
      .toLowerCase()
      .replace(/^-/, '');
  }

  /**
   * Clear the template cache
   */
  clearCache(): void {
    this.templateCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; templates: string[] } {
    return {
      size: this.templateCache.size,
      templates: Array.from(this.templateCache.keys()),
    };
  }
}

/**
 * Create a configured TemplateInjector instance
 */
export function createTemplateInjector(
  templateDir: string,
  language: 'typescript' | 'python' = 'typescript'
): TemplateInjector {
  return new TemplateInjector({
    templateDir,
    language,
  });
}
