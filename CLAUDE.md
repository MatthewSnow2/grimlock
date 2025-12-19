# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GRIMLOCK is an autonomous coding orchestration system for marathon development sprints. It enables Claude Code to work autonomously over extended periods (e.g., Friday evening to Monday morning) with human oversight, safety mechanisms, and structured reporting.

**Architecture:** Slack (commands) → n8n (orchestration) → Claude Code (execution) → GitHub (state + code)

## Key Components

- **GRIMLOCK_STATE.md** - Sprint state file with YAML frontmatter; auto-updated during sprints, do not edit manually during active sprint
- **prds/*.yaml** - PRD specifications defining sprints (success criteria, milestones, scope)
- **n8n/workflow-exports/** - Backup JSON exports of n8n workflows

## n8n Workflows (Build These)

1. **Sprint Initiator** - Slack trigger → PRD validation → EC2 launch → confirmation
2. **Heartbeat Monitor** - 30-min schedule → state check → Slack status post
3. **Milestone Gate Checker** - Webhook → validation → pass/fail routing
4. **Escalation Handler** - Webhook → severity routing → notifications → Google Sheets logging

## Webhook Endpoints

| Path | Workflow | Purpose |
|------|----------|---------|
| `/grimlock/start` | Sprint Initiator | Start new sprint |
| `/grimlock/milestone` | Gate Checker | Validate milestone completion |
| `/grimlock/escalate` | Escalation Handler | Route escalations by severity |
| `/grimlock/complete` | Sprint Completion | Generate completion report |

## Escalation Severity Levels

- **INFO** - Log only
- **WARNING** - Slack channel post, continue execution
- **PAUSE** - Channel + DM, halt execution, await `/grimlock resume`
- **EMERGENCY** - Immediate halt, terminate CC process

## Scope Boundaries

**In scope:** n8n workflows, state management, Slack notifications, documentation

**Out of scope (PAUSE if detected):**
- AWS infrastructure changes (terraform, EC2, IAM)
- n8n credential management
- Slack workspace administration
- GitHub repository settings
- Executable scripts (.sh, .py, .js) without explicit approval

## State Transitions

`not_started` → `running` → `paused` ↔ `running` → `completed|aborted`

Completed and aborted states are immutable.

## Files Claude Code May Create

- Any .md file in `/docs/`
- Any .yaml file in `/prds/`
- Files within the defined directory structure

## Files Claude Code May NOT Create

- Files outside `grimlock/` directory
- `.env`, credentials, or secrets files
- Executable scripts without approval
