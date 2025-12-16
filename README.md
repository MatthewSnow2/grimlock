# GRIMLOCK 🦖

**Autonomous Coding System for Marathon Development Sprints**

GRIMLOCK enables Claude Code to work autonomously on development projects over extended periods (e.g., Friday evening to Monday morning) with human oversight, safety mechanisms, and structured reporting.

## Overview

GRIMLOCK is an orchestration layer that:
- **Initiates** development sprints from PRD specifications
- **Monitors** progress via heartbeat checks every 30 minutes
- **Validates** milestone completion before proceeding
- **Escalates** issues based on severity (warning → pause → emergency)
- **Reports** comprehensive completion summaries with steps taken and outcomes

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Slack       │────▶│      n8n        │────▶│   Claude Code   │
│   (Commands)    │     │  (Orchestration)│     │   (Execution)   │
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
- GitHub repository (this one)

### Starting a Sprint

```
/grimlock start GRIMLOCK-PRD.yaml
```

### Monitoring

Heartbeats post to `#grimlock-ops` every 30 minutes with:
- Current status (running/paused)
- Active milestone and progress
- Next checkpoint time

### Commands

| Command | Description |
|---------|-------------|
| `/grimlock start {prd}` | Start a new sprint |
| `/grimlock status` | Get current state |
| `/grimlock resume` | Continue after pause |
| `/grimlock abort` | Cancel sprint |

## Directory Structure

```
grimlock/
├── GRIMLOCK_STATE.md      # Current sprint state
├── README.md              # This file
├── prds/                  # PRD specifications
│   ├── GRIMLOCK-PRD.yaml  # GRIMLOCK's own PRD
│   └── TEMPLATE.yaml      # Template for new projects
├── docs/                  # Documentation
│   ├── ARCHITECTURE.md
│   ├── RUNBOOK.md
│   └── LESSONS_LEARNED.md
├── n8n/                   # Workflow backups
│   └── workflow-exports/
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

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design details
- [Runbook](docs/RUNBOOK.md) - Operational procedures
- [Lessons Learned](docs/LESSONS_LEARNED.md) - Post-sprint retrospectives

## Version

**V1.0** - December 2024

---

*Built by Matthew @ Me, Myself Plus AI LLC*
