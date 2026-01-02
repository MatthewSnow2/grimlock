/**
 * GRIMLOCK Pattern Types
 * Core type definitions for pattern-based code generation
 */

/**
 * Supported programming languages for MCP server generation
 */
export type Language = 'typescript' | 'python';

/**
 * Global patterns that generate standalone files
 */
export type GlobalPatternType =
  | 'error-types'
  | 'error-handler'
  | 'logger'
  | 'config-loader'
  | 'validation-schemas'
  | 'health-check';

/**
 * Tool-level patterns that wrap or extend tool implementations
 */
export type ToolPatternType =
  | 'basic-tool'
  | 'validated-tool'
  | 'progress-tool'
  | 'retry-tool'
  | 'cached-tool'
  | 'long-running-tool';

/**
 * How patterns combine with existing code
 */
export type CompositionStrategy = 'wrap' | 'extend' | 'mixin';

/**
 * Error scenarios that can be handled
 */
export type ErrorScenario =
  | 'invalid_input'
  | 'api_unavailable'
  | 'rate_limiting'
  | 'auth_failure'
  | 'network_timeout'
  | 'resource_not_found'
  | 'validation_error'
  | 'internal_error';

/**
 * Production pattern identifiers
 */
export type ProductionPattern =
  | 'error_handling'
  | 'progress_notifications'
  | 'input_validation'
  | 'logging'
  | 'graceful_degradation';

/**
 * Template context for Handlebars rendering
 */
export interface TemplateContext {
  [key: string]: unknown;
}

/**
 * Tool parameter definition
 */
export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description?: string;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    minimum?: number;
    maximum?: number;
    enum?: string[];
  };
}

/**
 * Tool definition from PRD
 */
export interface ToolDefinition {
  name: string;
  description: string;
  longRunning: boolean;
  progressNotifications: boolean;
  parameters: ToolParameter[];
  returns?: string;
}

/**
 * External dependency configuration
 */
export interface ExternalDependency {
  enabled: boolean;
  primaryUrl?: string;
  fallbackUrl?: string;
  timeoutSeconds: number;
}

/**
 * Global pattern configuration
 */
export interface GlobalPatternConfig {
  errorHandling: {
    enabled: boolean;
    scenarios: ErrorScenario[];
    customErrorTypes: boolean;
  };
  logging: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
    structured: boolean;
  };
  validation: {
    enabled: boolean;
    strict: boolean;
  };
}

/**
 * Tool-specific pattern configuration
 */
export interface ToolPatternConfig {
  longRunning: boolean;
  progressNotifications: boolean;
  retryable: boolean;
  retryConfig?: {
    maxAttempts: number;
    backoffStrategy: 'linear' | 'exponential';
    retryableErrors: string[];
  };
  timeout?: number;
  caching?: {
    enabled: boolean;
    ttlSeconds: number;
  };
}

/**
 * Environment variable definition
 */
export interface EnvVarDefinition {
  name: string;
  description: string;
  required: boolean;
  defaultValue?: string;
}

/**
 * Normalized PRD representation
 */
export interface NormalizedPRD {
  metadata: {
    name: string;
    version: string;
    description: string;
    language: Language;
  };
  patterns: {
    global: GlobalPatternConfig;
    tools: Map<string, ToolPatternConfig>;
  };
  dependencies: {
    external: ExternalDependency[];
    internal: string[];
  };
  tools: ToolDefinition[];
  configuration: {
    environmentVariables: EnvVarDefinition[];
    runtimeConfig: Record<string, unknown>;
  };
}

/**
 * Global pattern selection result
 */
export interface GlobalPatternSelection {
  pattern: GlobalPatternType;
  template: string;
  outputPath: string;
  context: TemplateContext;
  priority: number;
}

/**
 * Tool pattern selection result
 */
export interface ToolPatternSelection {
  pattern: ToolPatternType;
  template: string;
  wrapperTemplate?: string;
  context: TemplateContext;
  compositionStrategy: CompositionStrategy;
}

/**
 * Pattern dependency graph
 */
export interface PatternDependencyGraph {
  nodes: string[];
  edges: Map<string, string[]>;
  requiredGlobal: GlobalPatternType[];
}

/**
 * Complete pattern selection manifest
 */
export interface PatternSelectionManifest {
  globalPatterns: GlobalPatternSelection[];
  toolPatterns: Map<string, ToolPatternSelection[]>;
  dependencies: PatternDependencyGraph;
  generationOrder: string[];
}

/**
 * Rendered code fragment
 */
export interface RenderedFragment {
  pattern: string;
  code: string;
  imports: string[];
  section: 'types' | 'constants' | 'classes' | 'functions' | 'exports';
  outputFile: string;
}

/**
 * Generated file information
 */
export interface GeneratedFile {
  path: string;
  content: string;
  type: 'source' | 'test' | 'config' | 'docs';
}

/**
 * Complete generated file set
 */
export interface GeneratedFileSet {
  files: GeneratedFile[];
  entryPoint: string;
  dependencies: string[];
}
