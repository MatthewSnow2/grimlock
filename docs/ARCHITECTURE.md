# GRIMLOCK Architecture

## System Overview

GRIMLOCK is an autonomous coding orchestration system that enables Claude Code to work on development projects over extended marathon sprints (e.g., Friday evening to Monday morning) with human oversight, safety mechanisms, and structured reporting.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            COMMAND LAYER                                     │
├─────────────────┬─────────────────────┬─────────────────────────────────────┤
│     Slack       │      GitHub         │       Google Sheets                  │
│   Commands      │    PRD + State      │      Escalation Log                  │
│  /grimlock...   │   GRIMLOCK_STATE    │                                      │
└────────┬────────┴──────────┬──────────┴───────────────┬─────────────────────┘
         │                   │                          │
         │ Slack API         │ Git/API                  │ Sheets API
         │                   │                          │
┌────────▼───────────────────▼──────────────────────────▼─────────────────────┐
│                        n8n ORCHESTRATION LAYER                               │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐   │
│  │ Sprint Initiator │  │ Heartbeat Monitor│  │ Milestone Gate Checker   │   │
│  │ /grimlock/start  │  │ (30-min schedule)│  │ /grimlock/milestone      │   │
│  └────────┬─────────┘  └────────┬─────────┘  └───────────┬──────────────┘   │
│           │                     │                        │                   │
│           └──────────┬──────────┴────────────────────────┘                   │
│                      │                                                       │
│  ┌───────────────────▼──────────────────────────────────────────────────┐   │
│  │                     Escalation Handler                                │   │
│  │                     /grimlock/escalate                                │   │
│  │   INFO → Log  |  WARNING → Channel  |  PAUSE → Channel+DM  |        │   │
│  │                                       EMERGENCY → Kill CC            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      │ SSH
                                      │
┌─────────────────────────────────────▼───────────────────────────────────────┐
│                         EXECUTION LAYER                                      │
│                                                                              │
│   AWS EC2 Instance (Ubuntu 24.04)                                           │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                      Claude Code Agent                                │  │
│   │  • Reads GRIMLOCK_STATE.md for current position                      │  │
│   │  • Executes tasks from PRD milestones                                │  │
│   │  • Updates state after each action                                   │  │
│   │  • Triggers webhooks to report progress                              │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Slack Integration

**Purpose:** Human command interface and notification delivery

**Channel:** `#grimlock-ops`
- All automated updates (heartbeats, milestone results, warnings)
- Sprint initiation confirmations
- Completion reports

**DM Escalations:** Direct messages to operator for PAUSE and EMERGENCY events

**Commands:**
| Command | Description | Handler |
|---------|-------------|---------|
| `/grimlock start {prd}` | Start new sprint | Sprint Initiator |
| `/grimlock status` | Get current state | Status Handler |
| `/grimlock resume` | Continue after pause | Resume Handler |
| `/grimlock abort` | Cancel sprint | Abort Handler |
| `/grimlock skip-milestone` | Skip current milestone | Skip Handler |

### 2. n8n Orchestration Layer

**Platform:** n8n Cloud

**Workflows:**

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| Sprint Initiator | Slack command / Webhook | Initialize sprint from PRD |
| Heartbeat Monitor | 30-min schedule | Periodic state check and reporting |
| Milestone Gate Checker | Webhook | Validate milestone completion |
| Escalation Handler | Webhook | Route alerts by severity |

**Webhook Base URL:** `https://{instance}.app.n8n.cloud/webhook`

**Endpoints:**
- `POST /grimlock/start` - Start sprint
- `POST /grimlock/milestone` - Report milestone
- `POST /grimlock/escalate` - Send escalation
- `POST /grimlock/complete` - Complete sprint

### 3. State Management

**File:** `GRIMLOCK_STATE.md`

**Format:** YAML frontmatter + Markdown sections

```yaml
---
sprint:
  status: "running|paused|completed|aborted"
  started_at: ISO_timestamp
  last_updated: ISO_timestamp
  prd_file: "path/to/PRD.yaml"
  project_name: "from PRD metadata"
  target_end: ISO_timestamp

current_position:
  milestone_id: "M1"
  milestone_name: "Milestone Name"
  task_index: 0
  task_description: "Current task"

progress:
  milestones_completed: ["M1", "M2"]
  milestones_remaining: ["M3", "M4"]
  current_milestone_tasks:
    completed: [0, 1, 2]
    remaining: [3, 4]

success_criteria:
  total: 8
  evaluated: 5
  passed: 4
  failed: 1
  pending: 3

escalations:
  total_count: 3
  by_severity:
    warning: 2
    pause: 1
    emergency: 0

checkpoints:
  last_successful_checkpoint: ISO_timestamp
---

## Current Status Summary
...

## Steps Taken This Sprint
...

## Blockers or Issues
...

## Next Actions
...
```

**Update Protocol:**
- State updated after every significant action
- Git commit after each update: `state: {action}`
- Recovery from Git history if corrupted

### 4. Execution Layer (EC2)

**Instance:** AWS EC2 Ubuntu 24.04

**Components:**
- Claude Code agent (execution engine)
- Git repository (grimlock)
- SSH access from n8n

**Security:**
- All commands execute via SSH from n8n
- No direct command execution on n8n server
- SSH key authentication only

---

## Data Flow Diagrams

### Sprint Initialization Flow

```
User                    Slack                   n8n                     EC2
  │                       │                       │                       │
  │ /grimlock start PRD   │                       │                       │
  │──────────────────────>│                       │                       │
  │                       │   Trigger webhook     │                       │
  │                       │──────────────────────>│                       │
  │                       │                       │   SSH: Read PRD       │
  │                       │                       │──────────────────────>│
  │                       │                       │<──────────────────────│
  │                       │                       │   SSH: Validate PRD   │
  │                       │                       │   SSH: Launch CC      │
  │                       │                       │──────────────────────>│
  │                       │                       │<──────────────────────│
  │                       │                       │   SSH: Init State     │
  │                       │                       │──────────────────────>│
  │                       │                       │<──────────────────────│
  │                       │                       │   SSH: Git Commit     │
  │                       │                       │──────────────────────>│
  │                       │   Post confirmation   │<──────────────────────│
  │                       │<──────────────────────│                       │
  │   Sprint Started!     │                       │                       │
  │<──────────────────────│                       │                       │
```

### Heartbeat Monitoring Flow

```
Schedule                n8n                     EC2                    Slack
  │                       │                       │                       │
  │   30-min trigger      │                       │                       │
  │──────────────────────>│                       │                       │
  │                       │   SSH: Read State     │                       │
  │                       │──────────────────────>│                       │
  │                       │<──────────────────────│                       │
  │                       │   Parse YAML          │                       │
  │                       │   Check CB004/CB005   │                       │
  │                       │                       │                       │
  │                       │   Post Heartbeat      │                       │
  │                       │──────────────────────────────────────────────>│
  │                       │                       │                       │
  │                       │   [If CB triggered]   │                       │
  │                       │   Escalate            │                       │
  │                       │──────────────────────────────────────────────>│
```

### Escalation Flow

```
Any Workflow            Escalation Handler       Slack              Google Sheets
  │                       │                       │                       │
  │   POST /escalate      │                       │                       │
  │──────────────────────>│                       │                       │
  │                       │   Parse severity      │                       │
  │                       │                       │                       │
  │                       │   [WARNING]           │                       │
  │                       │   Post to channel     │                       │
  │                       │──────────────────────>│                       │
  │                       │                       │                       │
  │                       │   [PAUSE]             │                       │
  │                       │   Post to channel     │                       │
  │                       │──────────────────────>│                       │
  │                       │   DM operator         │                       │
  │                       │──────────────────────>│                       │
  │                       │                       │                       │
  │                       │   [EMERGENCY]         │                       │
  │                       │   Post to channel     │                       │
  │                       │──────────────────────>│                       │
  │                       │   DM operator         │                       │
  │                       │──────────────────────>│                       │
  │                       │   SSH: Kill CC        │                       │
  │                       │──────────────────────>│                       │
  │                       │                       │                       │
  │                       │   Log to Sheets       │                       │
  │                       │──────────────────────────────────────────────>│
```

---

## Safety Mechanisms

### Circuit Breakers

| ID | Name | Trigger | Severity |
|----|------|---------|----------|
| CB001 | Time Boundary Exceeded | Current time > sprint end | PAUSE |
| CB002 | Consecutive Failures | 3+ milestone failures | PAUSE |
| CB003 | Scope Violation | Exclusion pattern matched | PAUSE |
| CB004 | Heartbeat Timeout | 90 min no update | WARNING |
| CB005 | Heartbeat Critical | 180 min no update | PAUSE |
| CB006 | Rapid Escalation | 5+ in 30 min | PAUSE |
| CB007 | Unknown Error | Unrecognized error type | PAUSE |
| CB008 | Resource Exhaustion | Disk >90% or Memory >95% | PAUSE |

### Escalation Severity Levels

| Level | Channel Post | DM | Process Action |
|-------|--------------|-----|----------------|
| INFO | No | No | Log only |
| WARNING | Yes | No | Continue |
| PAUSE | Yes | Yes | Halt execution |
| EMERGENCY | Yes | Yes | Terminate CC |

### State Transitions

```
                    ┌──────────────────────────────────────┐
                    │                                      │
                    ▼                                      │
┌─────────────┐   start   ┌─────────────┐   resume   ┌─────────────┐
│ not_started │──────────>│   running   │<──────────>│   paused    │
└─────────────┘           └──────┬──────┘            └──────┬──────┘
                                 │                          │
                    ┌────────────┼────────────┐             │
                    │            │            │             │
                    ▼            ▼            ▼             │
              ┌──────────┐ ┌──────────┐ ┌──────────┐        │
              │completed │ │ aborted  │ │ aborted  │<───────┘
              └──────────┘ └──────────┘ └──────────┘

                (immutable)   (immutable)
```

---

## Integration Points

### Slack API

**Authentication:** Bot OAuth Token

**Required Scopes:**
- `chat:write` - Post messages
- `chat:write.public` - Post to public channels
- `commands` - Slash commands
- `users:read` - Resolve user IDs for DMs

**Rate Limits:**
- Minimum 30 seconds between messages
- Maximum 10 warnings per hour (batch if exceeded)

### Google Sheets API

**Authentication:** OAuth 2.0 or Service Account

**Spreadsheet:** "GRIMLOCK Escalation Log"

**Schema:**
| Column | Type | Description |
|--------|------|-------------|
| Timestamp | DateTime | When escalation occurred |
| Sprint ID | String | Unique sprint identifier |
| Project | String | Project name from PRD |
| Severity | Enum | INFO/WARNING/PAUSE/EMERGENCY |
| Circuit Breaker | String | CB ID if triggered |
| Message | String | Escalation message |
| Context | JSON | Additional context |
| Resolution | String | How resolved |
| Resolved At | DateTime | When resolved |

### SSH to EC2

**Authentication:** Private key

**Approved Commands:**
- Read/write files in grimlock directory
- Git operations (add, commit, status)
- Process management (launch, kill CC)
- State file updates

**Prohibited:**
- Infrastructure changes
- Package installation
- System configuration

---

## Security Considerations

1. **Credential Management**
   - All credentials stored in n8n credential manager
   - No secrets in workflow code
   - SSH keys rotated periodically

2. **Command Isolation**
   - All execution via SSH to EC2
   - n8n server never runs arbitrary commands
   - Command whitelist enforced

3. **State Integrity**
   - State changes tracked in Git
   - Recovery from history if corrupted
   - No manual edits during active sprint

4. **Scope Enforcement**
   - PRD defines allowed actions
   - Detection patterns for violations
   - Automatic PAUSE on scope creep

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| State via Git, not DB | Simplicity, version control, CC native support |
| n8n orchestrates, EC2 executes | Security isolation |
| Slack single channel for V1 | Reduce complexity |
| SSH not Execute Command | Isolate n8n from execution risk |
| Webhook per workflow | Clear routing, easier debugging |
| 30-min heartbeat | Balance: catch issues vs noise |
| Graduated escalation | Proportional response |
| Google Sheets audit | Visible to humans, queryable |

---

## Version

**GRIMLOCK V1.0** - December 2024

---

*Built by Matthew @ Me, Myself Plus AI LLC*
