/**
 * GRIMLOCK Pattern Selector
 *
 * Analyzes PRD data to determine which production patterns
 * each tool requires for code generation.
 */

import {
  NormalizedPRD,
  ToolDefinition,
  GlobalPatternType,
  ToolPatternType,
  GlobalPatternSelection,
  ToolPatternSelection,
  PatternSelectionManifest,
  PatternDependencyGraph,
  ErrorScenario,
  ProductionPattern,
} from '../types/patterns.js';

/**
 * Pattern requirements for a single tool
 */
export interface ToolPatternRequirements {
  needsErrorHandling: boolean;
  needsProgressNotifications: boolean;
  needsInputValidation: boolean;
  needsLogging: boolean;
  needsGracefulDegradation: boolean;
  needsRetry: boolean;
  needsCaching: boolean;
}

/**
 * Global pattern requirements for the entire MCP
 */
export interface GlobalPatternRequirements {
  errorTypes: boolean;
  errorHandler: boolean;
  logger: boolean;
  configLoader: boolean;
  validationSchemas: boolean;
  healthCheck: boolean;
}

/**
 * Configuration for pattern selection behavior
 */
export interface PatternSelectorConfig {
  /** Always include error handling (recommended: true) */
  alwaysIncludeErrorHandling: boolean;
  /** Always include input validation (recommended: true) */
  alwaysIncludeValidation: boolean;
  /** Threshold in seconds for long-running classification */
  longRunningThresholdSeconds: number;
  /** Enable logging by default */
  defaultLoggingEnabled: boolean;
}

const DEFAULT_CONFIG: PatternSelectorConfig = {
  alwaysIncludeErrorHandling: true,
  alwaysIncludeValidation: true,
  longRunningThresholdSeconds: 5,
  defaultLoggingEnabled: true,
};

/**
 * Pattern Selector - Analyzes PRD and determines required patterns
 */
export class PatternSelector {
  private config: PatternSelectorConfig;

  constructor(config: Partial<PatternSelectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze a single tool to determine its pattern requirements
   */
  analyzeToolRequirements(
    tool: ToolDefinition,
    prd: NormalizedPRD
  ): ToolPatternRequirements {
    const toolConfig = prd.patterns.tools.get(tool.name);
    const hasExternalDeps = prd.dependencies.external.some(d => d.enabled);
    const enabledPatterns = this.getEnabledProductionPatterns(prd);

    return {
      // Error handling - always recommended
      needsErrorHandling:
        this.config.alwaysIncludeErrorHandling ||
        enabledPatterns.includes('error_handling'),

      // Progress notifications - for long-running operations
      needsProgressNotifications:
        tool.progressNotifications ||
        tool.longRunning ||
        enabledPatterns.includes('progress_notifications'),

      // Input validation - always recommended
      needsInputValidation:
        this.config.alwaysIncludeValidation ||
        enabledPatterns.includes('input_validation') ||
        tool.parameters.some(p => p.validation),

      // Logging - based on PRD config
      needsLogging:
        prd.patterns.global.logging.enabled ||
        enabledPatterns.includes('logging') ||
        this.config.defaultLoggingEnabled,

      // Graceful degradation - when external dependencies exist
      needsGracefulDegradation:
        hasExternalDeps ||
        enabledPatterns.includes('graceful_degradation') ||
        prd.dependencies.external.some(d => d.fallbackUrl),

      // Retry - when tool is retryable or has external deps
      needsRetry:
        toolConfig?.retryable === true ||
        (hasExternalDeps && toolConfig?.retryConfig !== undefined),

      // Caching - when explicitly enabled
      needsCaching: toolConfig?.caching?.enabled === true,
    };
  }

  /**
   * Analyze PRD to determine global pattern requirements
   */
  analyzeGlobalRequirements(prd: NormalizedPRD): GlobalPatternRequirements {
    const hasExternalDeps = prd.dependencies.external.some(d => d.enabled);
    const hasEnvVars = prd.configuration.environmentVariables.length > 0;
    const errorScenarios = prd.patterns.global.errorHandling.scenarios;

    // Analyze all tools to determine global needs
    const anyToolNeedsProgress = prd.tools.some(
      t => t.progressNotifications || t.longRunning
    );
    const anyToolHasValidation = prd.tools.some(t =>
      t.parameters.some(p => p.validation)
    );

    return {
      // Error types - when error handling is enabled with scenarios
      errorTypes:
        prd.patterns.global.errorHandling.enabled && errorScenarios.length > 0,

      // Error handler - when error handling is enabled
      errorHandler:
        prd.patterns.global.errorHandling.enabled ||
        this.config.alwaysIncludeErrorHandling,

      // Logger - when logging is enabled
      logger: prd.patterns.global.logging.enabled,

      // Config loader - when environment variables exist
      configLoader: hasEnvVars,

      // Validation schemas - when validation is enabled or tools have validation
      validationSchemas:
        prd.patterns.global.validation.enabled || anyToolHasValidation,

      // Health check - when external dependencies exist
      healthCheck: hasExternalDeps,
    };
  }

  /**
   * Select global patterns based on requirements
   */
  selectGlobalPatterns(prd: NormalizedPRD): GlobalPatternSelection[] {
    const requirements = this.analyzeGlobalRequirements(prd);
    const selections: GlobalPatternSelection[] = [];

    // Priority order ensures dependencies are generated first
    if (requirements.errorTypes) {
      selections.push({
        pattern: 'error-types',
        template: 'error-types.hbs',
        outputPath: 'src/errors/error-types.ts',
        context: this.buildErrorTypesContext(prd),
        priority: 1,
      });
    }

    if (requirements.errorHandler) {
      selections.push({
        pattern: 'error-handler',
        template: 'error-handler.hbs',
        outputPath: 'src/errors/error-handler.ts',
        context: this.buildErrorHandlerContext(prd),
        priority: 2,
      });
    }

    if (requirements.logger) {
      selections.push({
        pattern: 'logger',
        template: 'logger.hbs',
        outputPath: 'src/utils/logger.ts',
        context: this.buildLoggerContext(prd),
        priority: 3,
      });
    }

    if (requirements.configLoader) {
      selections.push({
        pattern: 'config-loader',
        template: 'config-loader.hbs',
        outputPath: 'src/config/config-loader.ts',
        context: this.buildConfigLoaderContext(prd),
        priority: 4,
      });
    }

    if (requirements.validationSchemas) {
      selections.push({
        pattern: 'validation-schemas',
        template: 'validation-schemas.hbs',
        outputPath: 'src/schemas/tool-schemas.ts',
        context: this.buildValidationSchemasContext(prd),
        priority: 5,
      });
    }

    if (requirements.healthCheck) {
      selections.push({
        pattern: 'health-check',
        template: 'health-check.hbs',
        outputPath: 'src/health/health-check.ts',
        context: this.buildHealthCheckContext(prd),
        priority: 6,
      });
    }

    return selections.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Select tool patterns based on requirements
   */
  selectToolPatterns(
    tool: ToolDefinition,
    prd: NormalizedPRD
  ): ToolPatternSelection[] {
    const requirements = this.analyzeToolRequirements(tool, prd);
    const selections: ToolPatternSelection[] = [];

    // Determine the primary tool pattern based on requirements
    const primaryPattern = this.determinePrimaryToolPattern(requirements);

    selections.push({
      pattern: primaryPattern,
      template: `${primaryPattern}.hbs`,
      context: this.buildToolContext(tool, prd, requirements),
      compositionStrategy: this.determineCompositionStrategy(requirements),
    });

    // Add wrapper patterns if needed
    if (requirements.needsRetry && primaryPattern !== 'retry-tool') {
      selections.push({
        pattern: 'retry-tool',
        template: 'retry-wrapper.hbs',
        wrapperTemplate: 'retry-tool.hbs',
        context: this.buildRetryContext(tool, prd),
        compositionStrategy: 'wrap',
      });
    }

    if (
      requirements.needsProgressNotifications &&
      primaryPattern !== 'progress-tool' &&
      primaryPattern !== 'long-running-tool'
    ) {
      selections.push({
        pattern: 'progress-tool',
        template: 'progress-wrapper.hbs',
        wrapperTemplate: 'progress-tool.hbs',
        context: this.buildProgressContext(tool),
        compositionStrategy: 'wrap',
      });
    }

    return selections;
  }

  /**
   * Generate complete pattern selection manifest
   */
  generateManifest(prd: NormalizedPRD): PatternSelectionManifest {
    const globalPatterns = this.selectGlobalPatterns(prd);
    const toolPatterns = new Map<string, ToolPatternSelection[]>();

    for (const tool of prd.tools) {
      toolPatterns.set(tool.name, this.selectToolPatterns(tool, prd));
    }

    const dependencies = this.buildDependencyGraph(globalPatterns, toolPatterns);
    const generationOrder = this.computeGenerationOrder(dependencies);

    return {
      globalPatterns,
      toolPatterns,
      dependencies,
      generationOrder,
    };
  }

  /**
   * Determine primary tool pattern based on requirements
   */
  private determinePrimaryToolPattern(
    requirements: ToolPatternRequirements
  ): ToolPatternType {
    // Long-running tools get the full treatment
    if (requirements.needsProgressNotifications && requirements.needsRetry) {
      return 'long-running-tool';
    }

    // Cached tools have specific behavior
    if (requirements.needsCaching) {
      return 'cached-tool';
    }

    // Retry-only tools
    if (requirements.needsRetry && !requirements.needsProgressNotifications) {
      return 'retry-tool';
    }

    // Progress-only tools
    if (requirements.needsProgressNotifications) {
      return 'progress-tool';
    }

    // Validated tools (most common)
    if (requirements.needsInputValidation || requirements.needsErrorHandling) {
      return 'validated-tool';
    }

    // Basic tool (rare - no patterns)
    return 'basic-tool';
  }

  /**
   * Determine how patterns should be composed
   */
  private determineCompositionStrategy(
    requirements: ToolPatternRequirements
  ): 'wrap' | 'extend' | 'mixin' {
    // Multiple patterns need wrapping
    const patternCount = [
      requirements.needsRetry,
      requirements.needsProgressNotifications,
      requirements.needsCaching,
    ].filter(Boolean).length;

    if (patternCount > 1) {
      return 'wrap';
    }

    // Single pattern can extend
    if (patternCount === 1) {
      return 'extend';
    }

    // No special patterns - use mixin for validation/error handling
    return 'mixin';
  }

  /**
   * Get enabled production patterns from PRD
   */
  private getEnabledProductionPatterns(prd: NormalizedPRD): ProductionPattern[] {
    const patterns: ProductionPattern[] = [];

    if (prd.patterns.global.errorHandling.enabled) {
      patterns.push('error_handling');
    }
    if (prd.patterns.global.logging.enabled) {
      patterns.push('logging');
    }
    if (prd.patterns.global.validation.enabled) {
      patterns.push('input_validation');
    }

    // Check for progress/degradation based on tools
    if (prd.tools.some(t => t.progressNotifications || t.longRunning)) {
      patterns.push('progress_notifications');
    }
    if (prd.dependencies.external.some(d => d.enabled)) {
      patterns.push('graceful_degradation');
    }

    return patterns;
  }

  /**
   * Build dependency graph for pattern generation order
   */
  private buildDependencyGraph(
    globalPatterns: GlobalPatternSelection[],
    toolPatterns: Map<string, ToolPatternSelection[]>
  ): PatternDependencyGraph {
    const nodes: string[] = [];
    const edges = new Map<string, string[]>();
    const requiredGlobal: GlobalPatternType[] = [];

    // Add global patterns as nodes
    for (const pattern of globalPatterns) {
      nodes.push(pattern.pattern);
      requiredGlobal.push(pattern.pattern);
    }

    // Add tool patterns as nodes
    for (const [toolName, patterns] of toolPatterns) {
      for (const pattern of patterns) {
        const nodeId = `${toolName}:${pattern.pattern}`;
        nodes.push(nodeId);

        // Tools depend on global patterns
        const deps: string[] = [];
        if (pattern.pattern !== 'basic-tool') {
          if (requiredGlobal.includes('error-types')) {
            deps.push('error-types');
          }
          if (requiredGlobal.includes('error-handler')) {
            deps.push('error-handler');
          }
          if (requiredGlobal.includes('validation-schemas')) {
            deps.push('validation-schemas');
          }
        }
        edges.set(nodeId, deps);
      }
    }

    // Add inter-global dependencies
    edges.set('error-handler', ['error-types']);
    edges.set('validation-schemas', []);
    edges.set('logger', []);
    edges.set('config-loader', []);
    edges.set('health-check', ['logger', 'config-loader']);
    edges.set('error-types', []);

    return { nodes, edges, requiredGlobal };
  }

  /**
   * Compute generation order using topological sort
   */
  private computeGenerationOrder(graph: PatternDependencyGraph): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (node: string) => {
      if (visited.has(node)) return;
      visited.add(node);

      const deps = graph.edges.get(node) || [];
      for (const dep of deps) {
        if (graph.nodes.includes(dep)) {
          visit(dep);
        }
      }

      result.push(node);
    };

    for (const node of graph.nodes) {
      visit(node);
    }

    return result;
  }

  // Context builders for each pattern type

  private buildErrorTypesContext(prd: NormalizedPRD): Record<string, unknown> {
    return {
      serverName: prd.metadata.name,
      scenarios: prd.patterns.global.errorHandling.scenarios,
      customErrorTypes: prd.patterns.global.errorHandling.customErrorTypes,
    };
  }

  private buildErrorHandlerContext(prd: NormalizedPRD): Record<string, unknown> {
    return {
      serverName: prd.metadata.name,
      scenarios: prd.patterns.global.errorHandling.scenarios,
      loggingEnabled: prd.patterns.global.logging.enabled,
      logLevel: prd.patterns.global.logging.level,
    };
  }

  private buildLoggerContext(prd: NormalizedPRD): Record<string, unknown> {
    return {
      serverName: prd.metadata.name,
      logLevel: prd.patterns.global.logging.level,
      structured: prd.patterns.global.logging.structured,
    };
  }

  private buildConfigLoaderContext(prd: NormalizedPRD): Record<string, unknown> {
    return {
      serverName: prd.metadata.name,
      envVars: prd.configuration.environmentVariables,
      runtimeConfig: prd.configuration.runtimeConfig,
    };
  }

  private buildValidationSchemasContext(
    prd: NormalizedPRD
  ): Record<string, unknown> {
    return {
      serverName: prd.metadata.name,
      tools: prd.tools.map(t => ({
        name: t.name,
        parameters: t.parameters,
      })),
      strict: prd.patterns.global.validation.strict,
    };
  }

  private buildHealthCheckContext(prd: NormalizedPRD): Record<string, unknown> {
    return {
      serverName: prd.metadata.name,
      externalDependencies: prd.dependencies.external,
    };
  }

  private buildToolContext(
    tool: ToolDefinition,
    prd: NormalizedPRD,
    requirements: ToolPatternRequirements
  ): Record<string, unknown> {
    const toolConfig = prd.patterns.tools.get(tool.name);

    return {
      toolName: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      returns: tool.returns || 'unknown',
      longRunning: tool.longRunning,
      progressNotifications: tool.progressNotifications,
      requirements,
      retryConfig: toolConfig?.retryConfig,
      timeout: toolConfig?.timeout,
      caching: toolConfig?.caching,
    };
  }

  private buildRetryContext(
    tool: ToolDefinition,
    prd: NormalizedPRD
  ): Record<string, unknown> {
    const toolConfig = prd.patterns.tools.get(tool.name);
    const externalDep = prd.dependencies.external[0];

    return {
      toolName: tool.name,
      maxRetries: toolConfig?.retryConfig?.maxAttempts ?? 3,
      backoffStrategy: toolConfig?.retryConfig?.backoffStrategy ?? 'exponential',
      retryableErrors: toolConfig?.retryConfig?.retryableErrors ?? [
        'NetworkTimeoutError',
        'ApiUnavailableError',
        'RateLimitError',
      ],
      fallbackUrl: externalDep?.fallbackUrl,
      timeoutMs: (externalDep?.timeoutSeconds ?? 10) * 1000,
    };
  }

  private buildProgressContext(tool: ToolDefinition): Record<string, unknown> {
    return {
      toolName: tool.name,
      progressEnabled: tool.progressNotifications,
      longRunning: tool.longRunning,
    };
  }
}

/**
 * Create a configured PatternSelector instance
 */
export function createPatternSelector(
  config?: Partial<PatternSelectorConfig>
): PatternSelector {
  return new PatternSelector(config);
}

/**
 * Convenience function to analyze tool requirements
 */
export function analyzeToolRequirements(
  tool: ToolDefinition,
  prd: NormalizedPRD,
  config?: Partial<PatternSelectorConfig>
): ToolPatternRequirements {
  const selector = new PatternSelector(config);
  return selector.analyzeToolRequirements(tool, prd);
}

/**
 * Convenience function to generate full manifest
 */
export function generatePatternManifest(
  prd: NormalizedPRD,
  config?: Partial<PatternSelectorConfig>
): PatternSelectionManifest {
  const selector = new PatternSelector(config);
  return selector.generateManifest(prd);
}
