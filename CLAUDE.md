# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GRIMLOCK is an **Autonomous MCP Server Factory** - a system that builds production-ready MCP (Model Context Protocol) servers from PRD specifications. It follows the Week 1 → Weekend → Week 2 sprint model:

- **Week 1 (Human)**: Define MCP server requirements in PRD template
- **Friday-Monday (Grimlock)**: Autonomous MCP server construction
- **Week 2 (Human)**: Security review, integration testing, production hardening

**Architecture:** Slack (commands) → n8n (orchestration) → Claude Code (builds MCP) → GitHub (code + state)

## Key Components

- **GRIMLOCK_STATE.md** - Sprint state file with YAML frontmatter; auto-updated during sprints
- **prds/TEMPLATE.yaml** - MCP PRD template (tools, resources, prompts, acceptance criteria)
- **n8n/workflow-exports/** - Backup JSON exports of orchestration workflows

## MCP Server Output Directory

**Output Location:** `/home/ubuntu/projects/mcp/`

All MCP servers built by GRIMLOCK are created in the central MCP directory, not inside the grimlock workspace. This keeps the GRIMLOCK system clean and organizes all deliverables in one place.

## MCP Server Output Structure

When Grimlock builds an MCP server, it creates:

```
/home/ubuntu/projects/mcp/<project-name>/
├── package.json              # Node.js project (TypeScript)
├── tsconfig.json             # TypeScript configuration
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── tools/                # Tool implementations
│   ├── resources/            # Resource handlers (if any)
│   └── prompts/              # Prompt templates (if any)
├── tests/
│   └── *.test.ts             # Jest test suite
└── README.md                 # Setup and usage docs
```

## MCP PRD Template Sections

The PRD template (`prds/TEMPLATE.yaml`) includes:

| Section | Purpose |
|---------|---------|
| `project` | Name, SDK (typescript/python), deployment config |
| `integration` | Target API details, authentication method |
| `tools` | MCP tools with parameters, behavior, examples |
| `resources` | Application-controlled data sources |
| `prompts` | User-controlled prompt templates |
| `acceptance_criteria` | Functional and non-functional requirements |
| `security` | Credential handling, data sensitivity |
| `testing` | Unit, integration, manual test requirements |
| `grimlock_handoff` | Required inputs for autonomous build |
| `week2_refinement` | Post-delivery review checklist |

## Design Wizard

The `grimlock design` command (or `/grimlock design` in Slack) launches an interactive PRD design wizard that:

1. Guides users through MCP definition questions
2. Applies best practices for context efficiency
3. Warns about high tool counts (10+, 15+)
4. Recommends installation scope (project vs user)
5. Generates production-ready PRD

**Skill location:** `~/.claude/skills/grimlock-design/SKILL.md`

**Configuration files:**
- `config/design-wizard.yaml` - Question tree
- `config/context-efficiency.yaml` - Token thresholds
- `config/validation-rules.yaml` - Warning rules

**Best practices reference:** `docs/MCP_BEST_PRACTICES.md`

### Context Efficiency Guidelines

| Tools | Tokens | Level | Recommendation |
|-------|--------|-------|----------------|
| 3-7 | ~3,500 | Optimal | Project level |
| 8-10 | ~4,500 | Acceptable | Project or user |
| 11-15 | ~7,000 | Concerning | Consider splitting |
| 16+ | >7,000 | Problematic | Split required |

## Orchestration Workflows

| Workflow | Purpose |
|----------|---------|
| Design Wizard | Guided PRD creation with best practices |
| Sprint Initiator | Validate MCP PRD → Launch CC → Initialize state |
| Heartbeat Monitor | 30-min health checks → Slack status |
| Milestone Gate Checker | Validate milestones → Route pass/fail |
| Escalation Handler | Severity routing → Notifications → Logging |

## Escalation Severity Levels

- **INFO** - Log only
- **WARNING** - Slack channel post, continue execution
- **PAUSE** - Channel + DM, halt execution, await `/grimlock resume`
- **EMERGENCY** - Immediate halt, terminate CC process

## Scope Boundaries

**In scope:**
- MCP server TypeScript/Python code
- Tool implementations matching PRD spec
- Unit and integration tests
- Setup documentation (README.md)
- State management and progress reporting

**Out of scope (PAUSE if detected):**
- AWS infrastructure changes
- n8n credential management
- Slack/GitHub administration
- Production deployments (Week 2 human task)
- Publishing to npm/PyPI without approval

## MCP SDK References

**TypeScript:**
- Package: `@modelcontextprotocol/sdk`
- Docs: https://modelcontextprotocol.io/docs

**Python:**
- Package: `mcp`
- Docs: https://modelcontextprotocol.io/docs

## State Transitions

`not_started` → `running` → `paused` ↔ `running` → `completed|aborted`

## Files Claude Code May Create

- MCP server source files in `/home/ubuntu/projects/mcp/<project>/` (`.ts`, `.py`)
- Test files (`.test.ts`, `test_*.py`)
- Configuration files (`package.json`, `tsconfig.json`, `pyproject.toml`)
- Documentation (`.md` files)
- PRD files in `/home/ubuntu/projects/grimlock/prds/`
- State updates in `/home/ubuntu/projects/grimlock/GRIMLOCK_STATE.md`

## Files Claude Code May NOT Create

- Files outside grimlock or mcp directories
- `.env` files with real credentials (only `.env.example`)
- Executable deployment scripts without approval
- CI/CD pipelines (Week 2 human task)

## Known Issues & Troubleshooting

### Shell Session Breaks After Directory Deletion

**Problem:** If a project directory that was the shell's working directory gets deleted (e.g., after moving a project to a new location), ALL subsequent Bash commands will fail with exit code 1, even basic commands like `pwd` or `echo`.

**Symptoms:**
- Every Bash command returns exit code 1
- No output or error message
- Affects main session AND agent subprocesses

**Solution:** User must restart Claude Code session:
```bash
# Exit current session
exit
# Or use Ctrl+C multiple times

# Start fresh session
claude
```

**Prevention:** When moving/deleting project directories, ensure the shell's working directory is changed BEFORE the deletion:
```bash
cd /home/ubuntu  # Move to safe directory first
rm -rf /path/to/old/project  # Then delete
```

### Workarounds When Shell is Broken

When shell commands fail, Claude Code can still:
- Read and write files using Read/Edit/Write tools
- Use n8n MCP tools for workflow management
- Provide commands for user to run manually

The user should run shell commands in a separate terminal when this occurs.
