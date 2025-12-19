# Workflow: Heartbeat Monitor

## Overview

**Purpose:** Periodic state check and status reporting every 30 minutes

**Trigger:** Schedule (every 30 minutes)

**Success Criteria:** SC002 - Heartbeat Monitor posts status every 30 minutes

---

## Node Flow Diagram

```
┌─────────────────────┐
│  Schedule Trigger   │
│   (30 minutes)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Read State File    │
│     (SSH Node)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Parse State &      │
│  Check Circuit      │
│  Breakers (Code)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Sprint Running?    │
│     (IF Node)       │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌─────────┐  ┌─────────┐
│ Running │  │  Not    │
│  Path   │  │ Running │
└────┬────┘  │  (End)  │
     │       └─────────┘
     ▼
┌─────────────────────┐
│  Post Heartbeat     │
│   (Slack Node)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Circuit Breaker     │
│  Triggered? (IF)    │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌─────────┐  ┌─────────┐
│   Yes   │  │   No    │
│         │  │  (End)  │
└────┬────┘  └─────────┘
     │
     ▼
┌─────────────────────┐
│  Post CB Alert      │
│   (Slack Node)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Is PAUSE Severity? │
│     (IF Node)       │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌─────────┐  ┌─────────┐
│   Yes   │  │   No    │
│  (DM)   │  │  (End)  │
└────┬────┘  └─────────┘
     │
     ▼
┌─────────────────────┐
│   DM Operator       │
│   (Slack Node)      │
└─────────────────────┘
```

---

## Node Configurations

### Node 1: Schedule Trigger

**Type:** `n8n-nodes-base.scheduleTrigger`

**Settings:**
- Rule Type: `Interval`
- Interval: `30`
- Unit: `Minutes`

**Note:** Runs every 30 minutes automatically

---

### Node 2: Read State File (SSH)

**Type:** `n8n-nodes-base.ssh`

**Credentials:** `ec2-grimlock`

**Command:**
```bash
cat /home/ubuntu/projects/grimlock/GRIMLOCK_STATE.md 2>/dev/null || echo "STATE_FILE_NOT_FOUND"
```

---

### Node 3: Parse State & Check Circuit Breakers (Code)

**Type:** `n8n-nodes-base.code`

**Language:** JavaScript

**Code:**
```javascript
// Parse state file and check circuit breakers
const stateContent = $input.first().json.stdout;
const now = new Date();
const timestamp = now.toISOString();

// Check if state file exists
if (stateContent.trim() === 'STATE_FILE_NOT_FOUND') {
  return [{
    json: {
      status: 'not_found',
      is_running: false,
      timestamp: timestamp,
      message: 'No state file found - no active sprint',
      circuit_breakers: [],
      has_circuit_breaker: false
    }
  }];
}

// Extract YAML frontmatter
const yamlMatch = stateContent.match(/^---\n([\s\S]*?)\n---/);
if (!yamlMatch) {
  return [{
    json: {
      status: 'corrupted',
      is_running: false,
      timestamp: timestamp,
      message: 'E020: State file corrupted - cannot parse YAML frontmatter',
      circuit_breakers: [{
        id: 'CB_STATE_CORRUPT',
        name: 'State File Corruption',
        severity: 'PAUSE',
        message: 'State file YAML frontmatter is invalid'
      }],
      has_circuit_breaker: true,
      highest_severity: 'PAUSE'
    }
  }];
}

// Parse YAML
let state;
try {
  const yaml = require('js-yaml');
  state = yaml.load(yamlMatch[1]);
} catch (e) {
  return [{
    json: {
      status: 'corrupted',
      is_running: false,
      timestamp: timestamp,
      message: `E020: State file corrupted - ${e.message}`,
      circuit_breakers: [{
        id: 'CB_STATE_CORRUPT',
        name: 'State File Corruption',
        severity: 'PAUSE',
        message: `YAML parse error: ${e.message}`
      }],
      has_circuit_breaker: true,
      highest_severity: 'PAUSE'
    }
  }];
}

// Check if sprint is active
const isRunning = state.sprint?.status === 'running';
const isPaused = state.sprint?.status === 'paused';

if (!isRunning && !isPaused) {
  return [{
    json: {
      status: state.sprint?.status || 'not_started',
      is_running: false,
      timestamp: timestamp,
      project_name: state.sprint?.project_name || 'Unknown',
      message: `Sprint status: ${state.sprint?.status || 'not_started'}`,
      circuit_breakers: [],
      has_circuit_breaker: false
    }
  }];
}

// Circuit Breaker Checks
const circuitBreakers = [];
const lastUpdated = new Date(state.sprint.last_updated);
const targetEnd = new Date(state.sprint.target_end);
const minutesSinceUpdate = (now - lastUpdated) / (1000 * 60);

// CB001: Time Boundary Exceeded
if (now > targetEnd && isRunning) {
  circuitBreakers.push({
    id: 'CB001',
    name: 'Time Boundary Exceeded',
    severity: 'PAUSE',
    message: 'Sprint end time has passed. Review and either complete or extend.'
  });
}

// CB004: Heartbeat Timeout (90 minutes = 3 missed intervals)
if (minutesSinceUpdate > 90 && isRunning) {
  circuitBreakers.push({
    id: 'CB004',
    name: 'Heartbeat Timeout',
    severity: 'WARNING',
    message: `No state update for ${Math.round(minutesSinceUpdate)} minutes (3+ missed intervals)`
  });
}

// CB005: Heartbeat Timeout Critical (180 minutes = 6 missed intervals)
if (minutesSinceUpdate > 180 && isRunning) {
  // Remove CB004 if CB005 triggers (more severe)
  const cb004Index = circuitBreakers.findIndex(cb => cb.id === 'CB004');
  if (cb004Index !== -1) circuitBreakers.splice(cb004Index, 1);

  circuitBreakers.push({
    id: 'CB005',
    name: 'Heartbeat Timeout Critical',
    severity: 'PAUSE',
    message: `No state update for ${Math.round(minutesSinceUpdate)} minutes. System may have failed.`
  });
}

// CB006: Rapid Escalation Pattern (5+ in 30 min)
// Check recent escalations from state
const escalationCount = state.escalations?.total_count || 0;
const lastEscalation = state.escalations?.last_escalation;
if (lastEscalation) {
  const lastEscTime = new Date(lastEscalation.timestamp);
  const minsSinceLastEsc = (now - lastEscTime) / (1000 * 60);
  if (minsSinceLastEsc < 30 && escalationCount >= 5) {
    circuitBreakers.push({
      id: 'CB006',
      name: 'Rapid Escalation Pattern',
      severity: 'PAUSE',
      message: `${escalationCount} escalations within 30 minutes. System may be unstable.`
    });
  }
}

// Calculate progress
const completedMilestones = state.progress?.milestones_completed?.length || 0;
const remainingMilestones = state.progress?.milestones_remaining?.length || 0;
const totalMilestones = completedMilestones + remainingMilestones;
const completedTasks = state.progress?.current_milestone_tasks?.completed?.length || 0;
const remainingTasks = state.progress?.current_milestone_tasks?.remaining?.length || 0;
const totalTasks = completedTasks + remainingTasks;

// Determine highest severity
let highestSeverity = 'INFO';
circuitBreakers.forEach(cb => {
  if (cb.severity === 'EMERGENCY') highestSeverity = 'EMERGENCY';
  else if (cb.severity === 'PAUSE' && highestSeverity !== 'EMERGENCY') highestSeverity = 'PAUSE';
  else if (cb.severity === 'WARNING' && highestSeverity === 'INFO') highestSeverity = 'WARNING';
});

// Format next heartbeat time
const nextHeartbeat = new Date(now.getTime() + 30 * 60 * 1000);

return [{
  json: {
    status: state.sprint.status,
    is_running: isRunning,
    is_paused: isPaused,
    project_name: state.sprint.project_name,
    prd_file: state.sprint.prd_file,
    current_milestone: state.current_position?.milestone_name || 'Unknown',
    milestone_id: state.current_position?.milestone_id,
    progress: {
      milestones: `${completedMilestones}/${totalMilestones}`,
      tasks: totalTasks > 0 ? `${completedTasks}/${totalTasks}` : 'N/A'
    },
    last_updated: state.sprint.last_updated,
    minutes_since_update: Math.round(minutesSinceUpdate),
    target_end: state.sprint.target_end,
    escalations: state.escalations,
    circuit_breakers: circuitBreakers,
    has_circuit_breaker: circuitBreakers.length > 0,
    highest_severity: highestSeverity,
    timestamp: timestamp,
    next_heartbeat: nextHeartbeat.toISOString()
  }
}];
```

---

### Node 4: Sprint Running? (IF)

**Type:** `n8n-nodes-base.if`

**Condition:**
- Value 1: `{{ $json.is_running }}`
- Operation: `equals`
- Value 2: `true`

**Note:** Also returns true for `is_paused` if you want to monitor paused sprints

---

### Node 5: Post Heartbeat (Slack)

**Type:** `n8n-nodes-base.slack`

**Credentials:** `grimlock-slack-bot`

**Settings:**
- Channel: `#grimlock-ops`
- Text:
```
💓 *Heartbeat* [{{ $json.timestamp }}]
*Status:* {{ $json.status }}
*Project:* {{ $json.project_name }}
*Current Milestone:* {{ $json.milestone_id }} - {{ $json.current_milestone }}
*Progress:* {{ $json.progress.tasks }} tasks ({{ $json.progress.milestones }} milestones)
*Last Update:* {{ $json.minutes_since_update }} minutes ago
*Next Check:* in 30 minutes
```

---

### Node 6: Circuit Breaker Triggered? (IF)

**Type:** `n8n-nodes-base.if`

**Condition:**
- Value 1: `{{ $json.has_circuit_breaker }}`
- Operation: `equals`
- Value 2: `true`

---

### Node 7: Post CB Alert (Slack)

**Type:** `n8n-nodes-base.slack`

**Credentials:** `grimlock-slack-bot`

**Settings:**
- Channel: `#grimlock-ops`
- Text:
```
={{ $json.highest_severity === 'PAUSE' ? '🛑' : '⚠️' }} *{{ $json.highest_severity }}*
━━━━━━━━━━━━━━━━━━━
*Circuit Breaker(s) Triggered:*
{{ $json.circuit_breakers.map(cb => '• ' + cb.id + ': ' + cb.message).join('\n') }}

*Project:* {{ $json.project_name }}
*Last State Update:* {{ $json.minutes_since_update }} minutes ago
━━━━━━━━━━━━━━━━━━━
{{ $json.highest_severity === 'PAUSE' ? 'Reply `/grimlock resume` to continue or `/grimlock abort` to cancel.' : 'Monitoring continues. No immediate action required.' }}
```

---

### Node 8: Is PAUSE Severity? (IF)

**Type:** `n8n-nodes-base.if`

**Condition:**
- Value 1: `{{ $json.highest_severity }}`
- Operation: `equals`
- Value 2: `PAUSE`

---

### Node 9: DM Operator (Slack)

**Type:** `n8n-nodes-base.slack`

**Credentials:** `grimlock-slack-bot`

**Settings:**
- Channel: `@matthew` (or operator's Slack handle)
- Text:
```
🛑 *GRIMLOCK Requires Your Attention*

*Project:* {{ $json.project_name }}
*Issue:* {{ $json.circuit_breakers.map(cb => cb.id + ': ' + cb.message).join('; ') }}

Check #grimlock-ops for full details.
Reply with:
• `/grimlock resume` to continue
• `/grimlock abort` to cancel
```

---

## Circuit Breakers Monitored

| ID | Condition | Severity | Action |
|----|-----------|----------|--------|
| CB001 | `now > target_end` | PAUSE | Alert + DM |
| CB004 | `minutes_since_update > 90` | WARNING | Alert only |
| CB005 | `minutes_since_update > 180` | PAUSE | Alert + DM |
| CB006 | `5+ escalations in 30 min` | PAUSE | Alert + DM |

---

## Test Scenarios

### Test 1: Normal Heartbeat
1. Start a sprint
2. Wait for 30-minute interval
3. Verify heartbeat appears in Slack

### Test 2: CB004 Warning
1. Start a sprint
2. Manually set `last_updated` to 100 minutes ago
3. Wait for heartbeat
4. Verify WARNING message appears

### Test 3: CB005 Critical
1. Start a sprint
2. Manually set `last_updated` to 200 minutes ago
3. Wait for heartbeat
4. Verify PAUSE message + DM

### Test 4: No Active Sprint
1. Ensure no sprint is running
2. Wait for heartbeat interval
3. Verify no message posted (workflow exits silently)

---

## Validation Checklist

- [ ] Schedule trigger fires every 30 minutes
- [ ] State file read successfully via SSH
- [ ] YAML parsing handles valid state files
- [ ] YAML parsing catches corrupted files
- [ ] Non-running sprints exit silently (no spam)
- [ ] Heartbeat message contains accurate info
- [ ] CB004 triggers at 90+ minutes
- [ ] CB005 triggers at 180+ minutes and supersedes CB004
- [ ] CB001 triggers when past target_end
- [ ] WARNING severity posts to channel only
- [ ] PAUSE severity posts to channel + DM
- [ ] DM contains actionable instructions

---

*Workflow Spec v1.0 - December 2024*
