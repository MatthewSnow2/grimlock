# GRIMLOCK

**Autonomous MCP Server Factory**

GRIMLOCK enables Claude Code to autonomously build production-ready MCP (Model Context Protocol) servers from PRD specifications, with human oversight, safety mechanisms, and structured reporting.

## How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Define PRD     │────▶│  GRIMLOCK       │────▶│  Production     │
│  (Human)        │     │  (Autonomous)   │     │  MCP Server     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
     Design              Build + Test            Review + Deploy
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   MCP Forge     │────▶│      n8n        │────▶│   Claude Code   │
│   (Dashboard)   │     │  (Orchestration)│     │  (Builds MCP)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │                        │
                               ▼                        ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │  Google Sheets  │     │     GitHub      │
                        │ (Escalation Log)│     │  (State + Code) │
                        └─────────────────┘     └─────────────────┘
```

## Completed Projects

MCPs built autonomously by GRIMLOCK:

| Project | Description | Status |
|---------|-------------|--------|
| [mcp-dyson-appliances](https://github.com/m2ai-mcp-servers/mcp-dyson-appliances) | Dyson air purifier control (5 tools) | Production |
| [mcp-philips-hue](https://github.com/m2ai-mcp-servers/mcp-philips-hue) | Philips Hue smart lighting (4 tools) | Production |
| [mcp-mirage-brand-extract](https://github.com/MatthewSnow2/mcp-mirage-brand-extract) | Brand extraction from websites (5 tools) | Production |
| [mcp-ratchet-clinical-charting](https://github.com/m2ai-mcp-servers/mcp-ratchet-clinical-charting) | Clinical charting for home health (3 tools) | Development |

## Quick Start

### Prerequisites

- n8n Cloud account with configured credentials (SSH, Google Sheets)
- AWS EC2 instance with Claude Code installed
- GitHub repository for code output

### Design Wizard (Recommended)

Transform your MCP idea into a PRD through guided questions:

**Via MCP Forge Dashboard:**

Access the [MCP Forge](dashboard/index.html) chatbot and ask Grimlock to help design your MCP.

**Via Claude Code:**
```
grimlock design
```

The wizard guides you through:
1. MCP name and purpose
2. **Language selection** (TypeScript or Python)
3. Integration details (service, auth)
4. Tool definitions with best practices
5. Context efficiency review

**Best Practices Built In:**
- Aims for 5-7 tools (optimal context overhead)
- Warns at 10+ tools, strongly warns at 15+
- Recommends installation scope (project vs user)
- Suggests variant splitting for large MCPs

### Web Form Wizard (NEW)

For non-technical users or quick PRD generation, use the web form:

**URL:** [`https://im4tlai.app.n8n.cloud/form/grimlock-wizard`](https://im4tlai.app.n8n.cloud/form/grimlock-wizard)

The form collects:
- Project name and purpose
- Language preference (TypeScript/Python)
- Target service and authentication
- Tool descriptions (one per line)

Returns a complete PRD YAML with context efficiency analysis.

### Manual PRD Creation

1. Copy the template: `cp prds/TEMPLATE.yaml prds/MY-MCP-PRD.yaml`
2. Fill in all sections:
   - `project`: Name, SDK (typescript/python), deployment target
   - `integration`: Target API details, authentication
   - `tools`: Define MCP tools with parameters and behavior
   - `acceptance_criteria`: What "done" looks like
   - `grimlock_handoff`: Checklist of required inputs
3. Gather supporting materials:
   - API documentation or OpenAPI spec
   - Sample API responses (success and error)
   - Test credentials (sandbox/non-production)

See [MCP Best Practices](docs/MCP_BEST_PRACTICES.md) for tool design guidelines.

### Starting a Build

Use the MCP Forge dashboard or trigger via n8n webhook:

```
grimlock start MY-MCP-PRD.yaml
```

### Monitoring

Build progress is displayed in the MCP Forge dashboard with:
- Current status (running/paused)
- Active milestone and progress
- Build logs and output

### Commands

| Command | Description |
|---------|-------------|
| `grimlock design` | Start Design Wizard (guided PRD creation) |
| `grimlock start {prd}` | Start a new build |
| `grimlock status` | Get current state |
| `grimlock resume` | Continue after pause |
| `grimlock abort` | Cancel build |

## MCP Server Output

When Grimlock completes a build, it delivers:

```
<project-name>/
├── package.json              # Dependencies (@modelcontextprotocol/sdk)
├── tsconfig.json             # TypeScript configuration
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── tools/                # Tool implementations
│   ├── resources/            # Resource handlers
│   └── prompts/              # Prompt templates
├── tests/
│   └── *.test.ts             # Jest test suite
├── .env.example              # Required environment variables
└── README.md                 # Setup and usage documentation
```

## PRD Template Sections

| Section | Required | Purpose |
|---------|----------|---------|
| `project` | Yes | Name, SDK, deployment config |
| `integration` | Yes | Target API and auth details |
| `tools` | Yes | MCP tools specification |
| `resources` | No | Data sources |
| `prompts` | No | Prompt templates |
| `acceptance_criteria` | Yes | Definition of done |
| `security` | Yes | Credential handling |
| `testing` | Yes | Test requirements |
| `grimlock_handoff` | Yes | Pre-build checklist |
| `post_delivery` | Yes | Post-delivery checklist |

## Directory Structure

```
grimlock/
├── GRIMLOCK_STATE.md      # Current build state
├── README.md              # This file
├── CLAUDE.md              # AI guidance
├── config/                # Configuration files
│   ├── design-wizard.yaml # Question tree for Design Wizard
│   ├── context-efficiency.yaml # Token thresholds
│   └── validation-rules.yaml   # PRD validation rules
├── designs/               # Design wizard sessions
├── prds/                  # PRD specifications
│   ├── TEMPLATE.yaml      # MCP PRD template
│   └── GRIMLOCK-PRD.yaml  # V1 PRD (historical)
├── src/                   # Core generators
│   ├── types/             # TypeScript type definitions
│   │   └── patterns.ts    # Pattern type system
│   └── generators/        # Code generation engine
│       ├── pattern-selector.ts   # PRD → pattern requirements
│       ├── template-injector.ts  # Handlebars template engine
│       └── mcp-generator.ts      # Full MCP generation pipeline
├── templates/             # Handlebars templates
│   └── typescript/        # TypeScript pattern templates
│       ├── error-types.hbs
│       ├── error-handler.hbs
│       ├── tool-with-error-handling.hbs
│       └── validated-tool-wrapper.hbs
├── tests/                 # Test suites
│   ├── generators/        # Unit tests for generators
│   └── integration/       # End-to-end tests
├── docs/                  # Documentation
│   ├── ARCHITECTURE.md
│   ├── RUNBOOK.md
│   ├── LESSONS_LEARNED.md
│   ├── MCP_BEST_PRACTICES.md  # Tool design guidelines
│   ├── PATTERNS.md            # Production patterns guide
│   ├── README-TEMPLATE.md     # README template for MCPs
│   └── ROADMAP.md             # Phase 1-4 milestones
├── n8n/                   # Workflow backups
│   └── workflow-exports/
│       ├── build-initiator.json
│       ├── design-wizard.json     # Design Wizard workflow
│       ├── form-wizard.json       # Form-based PRD wizard
│       └── context-analyzer.json  # Context analysis
└── build-logs/            # Build logs and reports
```

## Production Patterns

GRIMLOCK generates MCPs with industry-standard production patterns, not toy examples:

### Included Patterns

| Pattern | Purpose | When Applied |
|---------|---------|--------------|
| **Error Handling** | MCP protocol error codes, structured error types | Always |
| **Input Validation** | Zod schemas for runtime type safety | Always |
| **Progress Notifications** | Real-time updates for long operations | Tools >5 seconds |
| **Logging** | Structured logging via MCP protocol | When enabled |
| **Graceful Degradation** | Fallback strategies for external failures | External APIs |
| **Retry Logic** | Automatic retry with exponential backoff | External APIs |

### Why These Patterns Matter

Generated MCPs demonstrate production readiness:

- **Error handling**: Most MCPs crash on unexpected input - ours return structured errors
- **Validation**: Type safety prevents runtime errors before they happen
- **Progress**: Long operations timeout without feedback - ours keep users informed
- **Degradation**: External APIs fail; apps should handle gracefully, not crash
- **Logging**: Production issues need debugging context

### Pattern Architecture

```
Request → Validation → Retry → Progress → Cache → Business Logic
                                                        ↓
Response ← Error Handler ← Logging ← Format ←──────────┘
```

Patterns compose as decorators, automatically selected based on PRD configuration.

### Learning Resource

Each generated README explains **WHY** patterns are used, making GRIMLOCK a teaching tool for MCP development.

See [Production Patterns Guide](docs/PATTERNS.md) for detailed documentation.

## Safety Features

GRIMLOCK implements multiple safety layers:

1. **Time Boundaries** - Builds have hard end times
2. **Circuit Breakers** - Automatic pause on failures
3. **Human Commands** - Always-available override controls
4. **Escalation Routing** - Graduated response by severity
5. **Audit Logging** - All escalations logged to Google Sheets

## Documentation

- [Roadmap](docs/ROADMAP.md) - **Phase 1-4 milestones and success criteria**
- [Architecture](docs/ARCHITECTURE.md) - System design details
- [Runbook](docs/RUNBOOK.md) - Operational procedures
- [Lessons Learned](docs/LESSONS_LEARNED.md) - Post-build retrospectives
- [MCP Best Practices](docs/MCP_BEST_PRACTICES.md) - Tool design guidelines

## Version

**V2.1** - December 2025 (Hackathon MVP)
- 4 MCP servers built autonomously
- Language selection in Design Wizard
- Web Form Wizard via n8n
- Roadmap documentation

**V2.0** - December 2025 (MCP Server Factory Pivot)

**V1.0** - December 2025 (Initial Release)

---

*Built by Matthew @ Me, Myself Plus AI LLC*
