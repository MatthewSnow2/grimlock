# GRIMLOCK

**Autonomous MCP Server Factory for Marathon Development Sprints**

GRIMLOCK enables Claude Code to autonomously build production-ready MCP (Model Context Protocol) servers over extended periods (Friday evening to Monday morning) with human oversight, safety mechanisms, and structured reporting.

## How It Works

```
Week 1 (Human)          Weekend (Grimlock)       Week 2 (Human)
━━━━━━━━━━━━━━━━━      ━━━━━━━━━━━━━━━━━━━      ━━━━━━━━━━━━━━━━━
Define requirements     Autonomous build         Security review
Fill PRD template       MCP server code          Integration testing
Gather API docs         Tests & documentation    Production hardening
Friday handoff          Monday delivery          Deploy & monitor
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Slack       │────▶│      n8n        │────▶│   Claude Code   │
│   (Commands)    │     │  (Orchestration)│     │  (Builds MCP)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │                        │
                               ▼                        ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │  Google Sheets  │     │     GitHub      │
                        │ (Escalation Log)│     │  (State + Code) │
                        └─────────────────┘     └─────────────────┘
```

## Quick Start

### Prerequisites

- n8n Cloud account with configured credentials (Slack, SSH, Google Sheets)
- AWS EC2 instance with Claude Code installed
- Slack workspace with GRIMLOCK bot
- GitHub repository for code output

### Design Wizard (Recommended)

Transform your MCP idea into a PRD through guided questions:

**Via Slack:**
```
/grimlock design
```

**Via Claude Code:**
```
grimlock design
```

The wizard guides you through:
1. MCP name and purpose
2. Integration details (service, auth)
3. Tool definitions with best practices
4. Context efficiency review

**Best Practices Built In:**
- Aims for 5-7 tools (optimal context overhead)
- Warns at 10+ tools, strongly warns at 15+
- Recommends installation scope (project vs user)
- Suggests variant splitting for large MCPs

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

### Starting a Sprint

```
/grimlock start MY-MCP-PRD.yaml
```

### Monitoring

Heartbeats post to `#grimlock-ops` every 30 minutes with:
- Current status (running/paused)
- Active milestone and progress
- Next checkpoint time

### Commands

| Command | Description |
|---------|-------------|
| `/grimlock design` | Start Design Wizard (guided PRD creation) |
| `/grimlock start {prd}` | Start a new sprint |
| `/grimlock status` | Get current state |
| `/grimlock resume` | Continue after pause |
| `/grimlock abort` | Cancel sprint |

## MCP Server Output

When Grimlock completes a sprint, it delivers:

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
| `grimlock_handoff` | Yes | Pre-sprint checklist |
| `week2_refinement` | Yes | Post-delivery checklist |

## Directory Structure

```
grimlock/
├── GRIMLOCK_STATE.md      # Current sprint state
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
├── docs/                  # Documentation
│   ├── ARCHITECTURE.md
│   ├── RUNBOOK.md
│   ├── LESSONS_LEARNED.md
│   └── MCP_BEST_PRACTICES.md  # Tool design guidelines
├── n8n/                   # Workflow backups
│   └── workflow-exports/
│       ├── sprint-initiator.json
│       ├── design-wizard.json     # Design Wizard workflow
│       └── context-analyzer.json  # Context analysis
└── templates/             # File templates
    ├── STATE_TEMPLATE.md
    └── COMPLETION_REPORT.md
```

## Safety Features

GRIMLOCK implements multiple safety layers:

1. **Time Boundaries** - Sprints have hard end times
2. **Circuit Breakers** - Automatic pause on failures
3. **Human Commands** - Always-available override controls
4. **Escalation Routing** - Graduated response by severity
5. **Audit Logging** - All escalations logged to Google Sheets

## First MCP: Ratchet

The first MCP server Grimlock will build is **Ratchet** - a PointCare EMR integration for home health nursing:

- **Purpose**: Enable Claude to document patient visits directly into EMR
- **Origin**: Evolution of M2AI NurseCall workflow
- **Status**: PRD in progress (awaiting PointCare API documentation)

See `/home/ubuntu/projects/ratchet/` for Ratchet project details.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design details
- [Runbook](docs/RUNBOOK.md) - Operational procedures
- [Lessons Learned](docs/LESSONS_LEARNED.md) - Post-sprint retrospectives

## Version

**V2.0** - December 2024 (MCP Server Factory)
**V1.0** - December 2024 (General Purpose - Historical)

---

*Built by Matthew @ Me, Myself Plus AI LLC*
