# GRIMLOCK Runbook

Operational procedures for running GRIMLOCK autonomous coding sprints.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Starting a Sprint](#2-starting-a-sprint)
3. [Monitoring](#3-monitoring)
4. [Troubleshooting](#4-troubleshooting)
5. [Emergency Procedures](#5-emergency-procedures)

---

## 1. Prerequisites

### 1.1 Infrastructure Requirements

| Component | Requirement | Status Check |
|-----------|-------------|--------------|
| n8n Cloud | Active account with workflow access | Login to n8n Cloud dashboard |
| AWS EC2 | Ubuntu 24.04 instance running | `ssh ubuntu@<ec2-ip> 'echo OK'` |
| Claude Code | Installed on EC2 | `ssh ubuntu@<ec2-ip> 'claude --version'` |
| Slack | Workspace with GRIMLOCK bot | Check bot in Slack Apps |
| GitHub | Repository cloned on EC2 | `ssh ubuntu@<ec2-ip> 'cd ~/projects/grimlock && git status'` |
| Google Sheets | API access configured | Check n8n credential test |

### 1.2 n8n Credential Setup

#### Slack Credentials

1. Go to [Slack API](https://api.slack.com/apps) → Create New App
2. Choose "From scratch" → Name: "GRIMLOCK" → Select workspace
3. Navigate to **OAuth & Permissions**
4. Add Bot Token Scopes:
   - `chat:write`
   - `chat:write.public`
   - `commands`
   - `users:read`
5. Install to Workspace
6. Copy **Bot User OAuth Token** (starts with `xoxb-`)

**In n8n:**
1. Go to Credentials → Add Credential → Slack API
2. Name: `grimlock-slack-bot`
3. Paste Bot User OAuth Token
4. Test connection

#### SSH Credentials (EC2)

1. Generate SSH key pair (if not exists):
   ```bash
   ssh-keygen -t ed25519 -C "grimlock-n8n" -f ~/.ssh/grimlock_n8n
   ```

2. Add public key to EC2:
   ```bash
   ssh ubuntu@<ec2-ip> 'echo "<public-key>" >> ~/.ssh/authorized_keys'
   ```

**In n8n:**
1. Go to Credentials → Add Credential → SSH Private Key
2. Name: `ec2-grimlock`
3. Host: `<ec2-public-ip>`
4. Port: `22`
5. Username: `ubuntu`
6. Private Key: Paste contents of `~/.ssh/grimlock_n8n`
7. Test connection

#### Google Sheets Credentials

**Option A: OAuth 2.0 (Recommended for personal use)**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: "GRIMLOCK"
3. Enable Google Sheets API
4. Create OAuth 2.0 Client ID (Desktop app)
5. Download client secret JSON

**In n8n:**
1. Go to Credentials → Add Credential → Google Sheets OAuth2 API
2. Name: `grimlock-sheets`
3. Follow OAuth flow to authorize

**Option B: Service Account (Recommended for production)**

1. Go to Google Cloud Console → IAM & Admin → Service Accounts
2. Create service account: `grimlock-sheets@project.iam.gserviceaccount.com`
3. Create key (JSON format)
4. Share spreadsheet with service account email

**In n8n:**
1. Go to Credentials → Add Credential → Google Sheets API (Service Account)
2. Name: `grimlock-sheets`
3. Upload service account JSON

### 1.3 Slack Channel Setup

1. Create channel: `#grimlock-ops`
2. Invite GRIMLOCK bot to channel:
   ```
   /invite @GRIMLOCK
   ```
3. Configure slash commands (if using Slack trigger):
   - Go to Slack App → Slash Commands
   - Create command: `/grimlock`
   - Request URL: `https://<n8n-instance>.app.n8n.cloud/webhook/grimlock/start`

### 1.4 Google Sheets Setup

1. Create spreadsheet: "GRIMLOCK Escalation Log"
2. Create sheet: "Escalations"
3. Add header row:
   ```
   Timestamp | Sprint ID | Project | Severity | Circuit Breaker | Message | Context | Resolution | Resolved At
   ```
4. Copy spreadsheet ID from URL: `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`
5. Update n8n workflow with spreadsheet ID

### 1.5 Pre-Flight Checklist

Before starting any sprint, verify:

- [ ] EC2 instance is running and accessible via SSH
- [ ] Claude Code is installed and responsive
- [ ] Git repository is up to date (`git pull`)
- [ ] n8n workflows are active (not paused)
- [ ] Slack bot can post to `#grimlock-ops`
- [ ] PRD file exists in `/prds/` directory
- [ ] GRIMLOCK_STATE.md is reset to `not_started`

---

## 2. Starting a Sprint

### 2.1 Prepare the PRD

1. Copy template:
   ```bash
   cp prds/TEMPLATE.yaml prds/YOUR-PROJECT-PRD.yaml
   ```

2. Fill required sections:
   - `metadata.project_name`
   - `metadata.sprint.start_datetime`
   - `metadata.sprint.end_datetime`
   - `success_criteria` (at least one)
   - `milestones` (at least one)
   - `scope.in_scope`

3. Validate YAML syntax:
   ```bash
   python3 -c "import yaml; yaml.safe_load(open('prds/YOUR-PROJECT-PRD.yaml'))"
   ```

4. Commit PRD:
   ```bash
   git add prds/YOUR-PROJECT-PRD.yaml
   git commit -m "Add PRD for YOUR-PROJECT"
   git push
   ```

### 2.2 Start via Slack

```
/grimlock start YOUR-PROJECT-PRD.yaml
```

**Expected Response (within 30 seconds):**
```
🚀 Sprint Initiated
━━━━━━━━━━━━━━━━━━━
Project: YOUR-PROJECT
PRD: YOUR-PROJECT-PRD.yaml
Started: 2024-12-15T20:00:00Z
Target End: 2024-12-22T23:59:00Z
First Milestone: M1 - Foundation
━━━━━━━━━━━━━━━━━━━
GRIMLOCK is now running autonomously.
```

### 2.3 Start via Webhook (Alternative)

```bash
curl -X POST https://<n8n-instance>.app.n8n.cloud/webhook/grimlock/start \
  -H "Content-Type: application/json" \
  -d '{"prd_file": "YOUR-PROJECT-PRD.yaml"}'
```

### 2.4 Verify Successful Start

1. Check Slack for confirmation message
2. Verify GRIMLOCK_STATE.md updated:
   ```bash
   ssh ubuntu@<ec2-ip> 'cat ~/projects/grimlock/GRIMLOCK_STATE.md | head -20'
   ```
3. Confirm Claude Code process running:
   ```bash
   ssh ubuntu@<ec2-ip> 'pgrep -f claude'
   ```

### 2.5 Start Failures

| Error | Cause | Resolution |
|-------|-------|------------|
| "PRD file not found" | File doesn't exist in /prds/ | Check filename, ensure committed |
| "Invalid PRD YAML syntax" | YAML parsing error | Validate with Python yaml.safe_load |
| "PRD missing required section" | Missing metadata/criteria/milestones | Add required sections per template |
| "SSH connection failed" | EC2 not accessible | Check instance status, security groups |

---

## 3. Monitoring

### 3.1 Heartbeat Messages

Every 30 minutes, GRIMLOCK posts to `#grimlock-ops`:

```
💓 Heartbeat [2024-12-15T20:30:00Z]
Status: running
Current Milestone: M1 - Foundation
Progress: 3/5 tasks (1/6 milestones)
Next Check: in 30 minutes
```

**If no heartbeat appears:**
- Wait for next interval (may be skipped if no state change)
- Check n8n workflow execution logs
- Verify EC2 is accessible

### 3.2 State File Monitoring

View current state:
```bash
ssh ubuntu@<ec2-ip> 'cat ~/projects/grimlock/GRIMLOCK_STATE.md'
```

Key fields to check:
- `sprint.status` - Should be "running"
- `sprint.last_updated` - Should be recent
- `current_position.milestone_id` - Current work
- `escalations.total_count` - Issue frequency

### 3.3 n8n Execution Logs

1. Go to n8n Cloud → Executions
2. Filter by workflow (Heartbeat Monitor, etc.)
3. Check for failed executions
4. Review error details

### 3.4 EC2 Instance Monitoring

Check Claude Code process:
```bash
ssh ubuntu@<ec2-ip> 'ps aux | grep claude'
```

Check logs:
```bash
ssh ubuntu@<ec2-ip> 'tail -100 /tmp/grimlock-cc.log'
```

Check disk space:
```bash
ssh ubuntu@<ec2-ip> 'df -h'
```

Check memory:
```bash
ssh ubuntu@<ec2-ip> 'free -m'
```

### 3.5 Slack Notification Reference

| Icon | Meaning | Action Required |
|------|---------|-----------------|
| 💓 | Heartbeat | No action |
| ✅ | Milestone passed | No action |
| ⚠️ | Warning | Monitor, no immediate action |
| 🛑 | Paused | Human decision required |
| 🚨 | Emergency | Immediate attention |
| 🏁 | Sprint complete | Review report |

---

## 4. Troubleshooting

### 4.1 Common Issues

#### Sprint Won't Start

**Symptom:** No confirmation message after `/grimlock start`

**Checks:**
1. n8n workflow active?
   - Go to n8n → Sprint Initiator → Check if active
2. Slack trigger working?
   - Check n8n executions for trigger events
3. PRD file valid?
   ```bash
   ssh ubuntu@<ec2-ip> 'cat ~/projects/grimlock/prds/YOUR-PRD.yaml'
   ```

**Resolution:**
- Activate workflow if paused
- Check Slack app slash command configuration
- Fix PRD syntax errors

#### Heartbeats Missing

**Symptom:** No heartbeat messages for 60+ minutes

**Checks:**
1. Schedule trigger active?
2. SSH connection working?
   ```bash
   # Test from n8n credentials
   ```
3. State file readable?
   ```bash
   ssh ubuntu@<ec2-ip> 'cat ~/projects/grimlock/GRIMLOCK_STATE.md'
   ```

**Resolution:**
- Reactivate Heartbeat Monitor workflow
- Verify SSH credentials not expired
- Check EC2 security groups

#### State File Corrupted

**Symptom:** YAML parsing errors in workflows

**Checks:**
```bash
ssh ubuntu@<ec2-ip> 'cd ~/projects/grimlock && git log --oneline -10'
```

**Resolution:**
1. Identify last good commit
2. Restore state file:
   ```bash
   ssh ubuntu@<ec2-ip> 'cd ~/projects/grimlock && git checkout <commit-hash> -- GRIMLOCK_STATE.md'
   ```
3. Resume sprint if needed

#### SSH Connection Failures

**Symptom:** E010/E011 errors in n8n

**Checks:**
1. EC2 running?
   ```bash
   aws ec2 describe-instances --instance-ids <instance-id>
   ```
2. Security group allows SSH?
3. SSH key valid?

**Resolution:**
- Start EC2 if stopped
- Update security group rules
- Regenerate and update SSH key in n8n

### 4.2 Error Code Reference

| Code | Category | Message | Resolution |
|------|----------|---------|------------|
| E001 | Init | PRD file not found | Check file path |
| E002 | Init | Invalid PRD YAML | Fix syntax errors |
| E003 | Init | Missing required section | Add per template |
| E004 | Init | Success criteria invalid | Define at least one |
| E010 | Exec | SSH connection failed | Check EC2 status |
| E011 | Exec | SSH auth failed | Update SSH key |
| E012 | Exec | Command timeout | Check for hung process |
| E020 | State | State file corrupted | Restore from Git |
| E021 | State | Git conflict | Manual merge |
| E030 | Comm | Slack rate limited | Auto-retry |
| E031 | Comm | Channel not found | Check channel name |
| E040 | Valid | Milestone validation failed | Review failures |
| E050 | Safety | Circuit breaker triggered | See CB resolution |

### 4.3 Circuit Breaker Resolution

| CB | Trigger | Resolution |
|----|---------|------------|
| CB001 | Time exceeded | Review completion, `/grimlock abort` if needed |
| CB002 | 3+ failures | Fix validation issues, `/grimlock resume` |
| CB003 | Scope violation | Review action, approve or abort |
| CB004 | 90min timeout | Check EC2, restart if needed |
| CB005 | 180min timeout | Assume failure, manual recovery |
| CB006 | Rapid escalation | Review stability, fix root cause |
| CB007 | Unknown error | Analyze error, update known_errors |
| CB008 | Resource exhaustion | Free disk/memory, resume |

---

## 5. Emergency Procedures

### 5.1 Manual Process Termination

If Claude Code becomes unresponsive or dangerous:

```bash
# Kill Claude Code process
ssh ubuntu@<ec2-ip> 'pkill -f claude'

# Verify killed
ssh ubuntu@<ec2-ip> 'pgrep -f claude'  # Should return nothing

# Update state
ssh ubuntu@<ec2-ip> 'cd ~/projects/grimlock && sed -i "s/status: \"running\"/status: \"aborted\"/" GRIMLOCK_STATE.md && git add GRIMLOCK_STATE.md && git commit -m "state: EMERGENCY - manual termination"'
```

### 5.2 Emergency Abort via Slack

```
/grimlock abort
```

This will:
1. Kill Claude Code process
2. Update state to "aborted"
3. Post abort confirmation
4. Generate partial completion report

### 5.3 n8n Workflow Disable

If workflows are causing issues:

1. Go to n8n Cloud dashboard
2. Click workflow → Toggle OFF
3. All triggers immediately stop

**Order of disable (safest):**
1. Sprint Initiator (prevent new sprints)
2. Heartbeat Monitor (stop monitoring)
3. Escalation Handler (last, needed for logging)

### 5.4 State Recovery from Git

If state file is lost or corrupted:

```bash
ssh ubuntu@<ec2-ip> 'cd ~/projects/grimlock && git log --oneline GRIMLOCK_STATE.md'
```

Find last good state and restore:

```bash
ssh ubuntu@<ec2-ip> 'cd ~/projects/grimlock && git checkout <commit-hash> -- GRIMLOCK_STATE.md'
```

### 5.5 Complete System Reset

To reset GRIMLOCK to initial state:

```bash
ssh ubuntu@<ec2-ip> '
cd ~/projects/grimlock

# Kill any running process
pkill -f claude || true

# Reset state file
cp templates/STATE_TEMPLATE.md GRIMLOCK_STATE.md

# Commit
git add GRIMLOCK_STATE.md
git commit -m "state: system reset"
'
```

### 5.6 Escalation Contacts

| Severity | Contact Method | Response Time |
|----------|---------------|---------------|
| WARNING | Slack #grimlock-ops | Next check |
| PAUSE | Slack #grimlock-ops + DM | 4 hours |
| EMERGENCY | Slack + DM + Phone | Immediate |

**Primary Contact:** Matthew (Me, Myself Plus AI LLC)

### 5.7 Post-Incident Checklist

After any emergency:

- [ ] Document what happened
- [ ] Identify root cause
- [ ] Update error handling if new error type
- [ ] Review circuit breakers - need adjustment?
- [ ] Add to LESSONS_LEARNED.md
- [ ] Test fix before next sprint

---

## Quick Reference

### Slack Commands

| Command | Description |
|---------|-------------|
| `/grimlock start {prd}` | Start sprint |
| `/grimlock status` | Get current state |
| `/grimlock resume` | Continue after pause |
| `/grimlock abort` | Cancel sprint |

### Webhook Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/grimlock/start` | POST | Start sprint |
| `/grimlock/milestone` | POST | Report milestone |
| `/grimlock/escalate` | POST | Send escalation |
| `/grimlock/complete` | POST | Complete sprint |

### Key Files

| File | Purpose |
|------|---------|
| `GRIMLOCK_STATE.md` | Sprint state |
| `prds/*.yaml` | PRD specifications |
| `docs/ARCHITECTURE.md` | System design |
| `docs/RUNBOOK.md` | This file |

---

*GRIMLOCK Runbook v1.0 - December 2024*
