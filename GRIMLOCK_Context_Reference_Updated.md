# GRIMLOCK Context Document for Claude Code

*Comprehensive reference for autonomous marathon development system*

**Last Updated**: 2024-12-19 01:00 CST
**Status**: Active development - Infrastructure complete, workflow testing in progress

---

## Executive Summary

**GRIMLOCK** is an autonomous coding system designed for marathon development sprints running Friday-to-Monday. It leverages Claude Code on AWS EC2 with n8n orchestration and Slack integration to enable extended, unsupervised development cycles while you're away from the keyboard.

**Current Status**: Infrastructure operational, conducting n8n workflow comparison testing for hackathon submission.

---

## System Architecture

### Core Components

1. **Claude Code (CC)** - Primary autonomous agent
   - Runs on AWS EC2 instance (54.225.171.108)
   - Executes coding tasks via CLI interface
   - Handles git operations, file management, testing
   - **n8n MCP Integration**: Connected via n8n-mcp-api

2. **n8n Workflow Orchestration**
   - Instance: https://im4tlai.app.n8n.cloud
   - Task scheduling and routing
   - Error handling and retry logic
   - Integration hub for all services
   - Monitors CC progress and triggers interventions

3. **Slack Integration**
   - Channel: C0A3XJ9HV4L (GRIMLOCK notifications)
   - User ID for mentions: U08TP307Z70 (Matthew)
   - Real-time status updates
   - Error notifications requiring human intervention
   - Progress reports
   - Approval requests for critical decisions

4. **AWS EC2 Infrastructure**
   - Public IP: 54.225.171.108 (Elastic IP)
   - SSH User: ubuntu
   - Dedicated instance for CC execution
   - Persistent development environment
   - Security group configured for n8n Cloud access

---

## Current Infrastructure Status

### ✅ Completed Setup

**AWS EC2**:
- Elastic IP allocated and associated
- Security group configured with n8n Cloud IP whitelist (24 IPs)
- SSH access verified and working
- Accessible from n8n Cloud

**n8n Cloud**:
- Instance operational at https://im4tlai.app.n8n.cloud
- SSH credentials configured ("SSH Private Key account")
- Slack OAuth2 credentials configured
- Can execute commands on EC2 via SSH
- Can post to Slack channel C0A3XJ9HV4L

**Claude Code on EC2**:
- Installed and operational
- MCP servers configured:
  - ✅ n8n-mcp-api (Connected)
  - ✅ n8n-powerhouse (Available)
  - ✅ n8n-mcp-skills (1 skill installed)
  - ❌ Slack MCP (Failed - not needed, using n8n's Slack integration)

**GitHub**:
- Repository: https://github.com/MatthewSnow2/grimlock
- Private repository
- CC has access configured

### 🔄 In Progress

**N8N Workflow Comparison Testing**:
- Testing n8n text-to-workflow builder vs Claude Code workflow generation
- Part of n8n community hackathon submission
- Workflow 1: Sprint Initiator (Complete)
- Workflow 2: Heartbeat Monitor (n8n builder version complete, CC version pending)
- Workflows 3-5: Pending

---

## Development Sprint Concept

### Friday-Monday Marathon Model

**Friday Evening**: 
- Define sprint goals and tasks in backlog
- n8n loads task queue
- CC begins autonomous work
- Initial progress check before disconnect

**Weekend (Autonomous Operation)**:
- CC works through task queue sequentially
- n8n monitors progress via heartbeat checks
- Slack notifications on milestones/blockers
- System continues without human intervention

**Monday Morning**:
- Review completed work
- Address blockers flagged over weekend
- Merge completed features
- Plan next sprint

### Task Types

1. **Feature Development** - Self-contained implementations with clear acceptance criteria
2. **Refactoring** - Code cleanup, optimization, documentation
3. **Bug Fixes** - Issues with clear reproduction steps
4. **Infrastructure** - Configuration, deployment, monitoring

---

## N8N Workflows Overview

### Workflow 1: Sprint Initiator ✅
**Status**: Complete
**Purpose**: Kicks off weekend development sprints
**Location**: n8n Cloud instance

### Workflow 2: Heartbeat Monitor 🔄
**Status**: Testing in progress
**Purpose**: Monitor CC process health every 30 minutes
**Components**:
- Cron trigger (*/30 * * * *)
- SSH checks to EC2
- State file reading
- Status parsing
- Conditional Slack notifications

**n8n Builder Version**: Complete (2.5 min build time)
**Claude Code Version**: Pending creation

### Workflow 3: Milestone Gate Checker
**Status**: Planned
**Purpose**: Validate milestone completion before proceeding

### Workflow 4: Escalation Handler
**Status**: Planned
**Purpose**: Route escalations by severity (warning/pause/emergency)

### Workflow 5: Sprint Completion
**Status**: Planned
**Purpose**: Validate sprint completion and update GitHub PRs

---

## N8N Competition Context

**Event**: n8n Community Hackathon
**Requirement**: Use n8n text-to-workflow builder feature
**Strategy**: Compare builder against Claude Code for workflow creation

**Comparison Approach**:
1. Build each workflow using n8n text-to-workflow builder
2. Build same workflow using Claude Code with n8n MCP
3. Compare: speed, accuracy, ease of use, debugging, production readiness
4. Provide feedback to n8n team

**Workflows for Comparison**: Workflows 2-5 (Workflow 1 pre-built)

**Current Progress**:
- Workflow 2 n8n builder: ✅ Complete (2.5 min, 7 nodes, fully functional)
- Workflow 2 Claude Code: ⏳ Next task

---

## Technical Setup Details

### AWS EC2 Configuration

**Instance Details**:
- Elastic IP: 54.225.171.108
- SSH User: ubuntu
- SSH Port: 22
- Security Group: Configured for n8n Cloud IPs (24 addresses)

**Key Paths**:
- Project directory: `/home/ubuntu/projects/`
- GRIMLOCK state file: `/home/ubuntu/projects/GRIMLOCK_STATE.md`
- Claude Code working directory: `/home/claude/`

### MCP Server Configuration

**Available on CC**:
```
n8n-mcp-api: Connected
  - Can create workflows programmatically
  - Can configure nodes
  - Can execute workflows
  - Access to n8n Cloud instance

n8n-powerhouse: Available
  - Additional n8n capabilities

n8n-mcp-skills: Available
  - 1 skill installed
  - Repository: https://github.com/czlonkowski/n8n-skills.git
```

**Not Available**:
```
Slack MCP: Failed
  - Not needed - using n8n's Slack integration instead
  - n8n handles Slack via configured OAuth2 credentials
```

### N8N Credentials Configured

**SSH Private Key account**:
- Host: 54.225.171.108
- Port: 22
- Username: ubuntu
- Authentication: Private Key
- Status: ✅ Tested and working

**Slack OAuth2**:
- Channel access: C0A3XJ9HV4L
- Scopes: chat:write, chat:write.public
- DM capability: Yes (to U08TP307Z70)
- Status: ✅ Tested and working

**GitHub API**:
- Personal Access Token configured
- Repo scope enabled
- Status: ✅ Configured

---

## Integration Patterns

### Slack Notifications

**Channel**: C0A3XJ9HV4L

**Event Types**:
- Sprint start/end
- Task completion
- Error conditions requiring attention
- Milestone achievements
- Approval requests

**Message Format**:
- Severity level (info/warning/error/critical)
- Timestamp
- Context (task, file, milestone)
- Action required (if any)
- Mentions: <@U08TP307Z70> for critical alerts

### GitHub Operations

**Repository**: https://github.com/MatthewSnow2/grimlock

**Automated Actions** (planned):
- Branch creation for features
- Commit with descriptive messages
- Pull request creation
- Status updates on PRs

**Human Checkpoints**:
- PR merge approval
- Major architectural decisions
- Breaking changes

### File System Management

**Working Directories**:
- `/home/claude` on EC2 for temporary work
- `/home/ubuntu/projects/` for GRIMLOCK state
- Git repositories cloned to organized structure

**State File Format**: `/home/ubuntu/projects/GRIMLOCK_STATE.md`
```markdown
# GRIMLOCK State

current_milestone: [milestone identifier]
progress_percentage: [0-100]
last_task: [description of last completed task]
next_task: [description of next planned task]
blockers: [array of current blockers]
```

---

## Troubleshooting History

### SSH Connectivity ✅ RESOLVED

**Problem**: n8n Cloud couldn't connect to EC2
**Root Cause**: Security group didn't allow n8n Cloud IPs
**Solution**: Added all 24 n8n Cloud IPs to security group SSH rules
**Status**: Working

### MCP Server Configuration ✅ RESOLVED

**Issue**: CC and CD have separate MCP configurations
**Solution**: Configured n8n MCP directly in CC
**Status**: n8n-mcp-api connected and functional

### Credentials Management ✅ RESOLVED

**Issue**: n8n workflows needed SSH and Slack credentials
**Solution**: Configured credentials in n8n Cloud, reference by name in workflows
**Status**: All credentials tested and working

---

## Known Limitations & Current Focus

### Current Limitations

1. **Human-in-Loop Requirements**
   - Critical decisions still need approval
   - Complex debugging may require intervention
   - Security-sensitive operations need confirmation

2. **Workflow Development**
   - Building and testing n8n orchestration workflows
   - Iterating on error handling patterns
   - Validating monitoring and alerting logic

### Immediate Focus (Dec 19, 2024)

**Primary Task**: Complete n8n workflow comparison testing
- ✅ Workflow 2 n8n builder version complete
- ⏳ Workflow 2 Claude Code version (NEXT)
- ⏳ Workflows 3-5 pending

**Secondary Goals**:
- Document comparison findings
- Prepare hackathon submission
- Refine workflow error handling

---

## Quick Reference Commands

### EC2 Management
```bash
# SSH into EC2 instance
ssh -i /path/to/key.pem ubuntu@54.225.171.108

# Check Claude Code status
pgrep -f "claude" && echo "RUNNING" || echo "STOPPED"

# Read GRIMLOCK state
cat /home/ubuntu/projects/GRIMLOCK_STATE.md
```

### N8N Operations
```bash
# Access n8n instance
# https://im4tlai.app.n8n.cloud

# Test webhook endpoints
curl -X POST https://im4tlai.app.n8n.cloud/webhook/grimlock/[endpoint]
```

### MCP Server Usage (for Claude Code)
```bash
# n8n MCP available via n8n-mcp-api
# Use to create/manage workflows programmatically
# Reference existing credentials by name
```

---

## Project Context

**Founder**: Matthew Snow, Me, Myself Plus AI LLC
**Location**: Nashville, TN (CST timezone)
**Background**: 10+ years data infrastructure, 2+ years GenAI focus
**Specializations**: Claude ecosystem, n8n automation, Azure cloud, multi-agent systems

**Related Projects**:
- Chad-Core (dual-LLM autonomous agent)
- AWS Legal Assistant RAG platform
- Parra/CareConnect AI (1st place Early AI-Dopters competition)
- Multiple Claude Skills development
- n8n community hackathon participation

**Current Activity**: Late-night development session (past midnight CST)
**Communication Style**: Direct, technical, efficient

---

## Decision Log

**Why AWS EC2 vs Local Execution?**
- 24/7 availability for weekend sprints
- Isolation from personal machine
- Persistent environment
- Cost-effective for intermittent heavy use

**Why N8N for Orchestration?**
- Visual workflow design
- Extensive integration library
- Error handling capabilities
- Community hackathon opportunity
- Already familiar with platform

**Why Slack for Notifications?**
- Mobile accessibility
- Rich formatting
- Already in daily workflow
- Easy mention/DM system

**Why Claude Code with n8n MCP?**
- Programmatic workflow creation
- Version control workflows as code
- Comparison against GUI builders
- Automation potential

---

## Next Steps for Claude Code

**Immediate Task** (when you read this):
You are about to build Workflow 2: GRIMLOCK Heartbeat Monitor using the n8n MCP API.

**Context**:
- This is a comparison test against n8n's text-to-workflow builder
- The n8n builder version took 2.5 minutes and works perfectly
- You should create an equivalent workflow programmatically
- All credentials are already configured in n8n Cloud

**Success Criteria**:
1. Create workflow using n8n MCP API
2. Match the specification exactly
3. Link to existing credentials (SSH, Slack)
4. Workflow should be testable immediately
5. Document time taken and any issues

**Workflow Specification**: See separate prompt for full details

---

This document provides Claude Code with complete context for GRIMLOCK project operations. Update as development progresses.
