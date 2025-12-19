# Workflow: Sprint Initiator

## Overview

**Purpose:** Initialize a GRIMLOCK sprint from a PRD specification

**Triggers:**
- Slack command: `/grimlock start {prd_file}`
- Webhook: `POST /grimlock/start`

**Success Criteria:** SC001 - Sprint Initiator workflow executes successfully

---

## Node Flow Diagram

```
┌─────────────────┐     ┌─────────────────┐
│  Slack Trigger  │     │    Webhook      │
│ /grimlock start │     │ /grimlock/start │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   Normalize Input     │
         │      (Set Node)       │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   Parse PRD Path      │
         │     (Code Node)       │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │     Read PRD File     │
         │      (SSH Node)       │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │    Validate PRD       │
         │     (Code Node)       │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │    PRD Valid?         │
         │      (IF Node)        │
         └───────────┬───────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│  Launch Claude  │   │   Send Error    │
│   (SSH Node)    │   │  (Slack Node)   │
└────────┬────────┘   └─────────────────┘
         │
         ▼
┌─────────────────┐
│ Initialize State│
│   (SSH Node)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Git Commit    │
│   (SSH Node)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Send Confirm    │
│  (Slack Node)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Respond Webhook │
│ (Respond Node)  │
└─────────────────┘
```

---

## Node Configurations

### Node 1a: Slack Trigger

**Type:** `n8n-nodes-base.slackTrigger`

**Settings:**
- Events: `slash_command`
- Credentials: `grimlock-slack-bot`

**Output:** Provides `$json.text` with command arguments (e.g., "start GRIMLOCK-PRD.yaml")

---

### Node 1b: Webhook

**Type:** `n8n-nodes-base.webhook`

**Settings:**
- HTTP Method: `POST`
- Path: `grimlock/start`
- Response Mode: `Response Node`

**Output:** Provides `$json.body` with JSON payload

---

### Node 2: Normalize Input (Set)

**Type:** `n8n-nodes-base.set`

**Purpose:** Extract PRD filename from either Slack or webhook input

**Values:**

| Name | Value |
|------|-------|
| prd_file | `={{ $json.text ? $json.text.split(' ').slice(1).join(' ') : $json.body.prd_file }}` |
| trigger_source | `={{ $json.command ? 'slack' : 'webhook' }}` |
| timestamp | `={{ new Date().toISOString() }}` |

---

### Node 3: Parse PRD Path (Code)

**Type:** `n8n-nodes-base.code`

**Language:** JavaScript

**Code:**
```javascript
// Parse and validate PRD path
const prdFile = $input.first().json.prd_file;

if (!prdFile) {
  throw new Error('E001: PRD file not specified. Usage: /grimlock start <prd_file>');
}

// Ensure file is in prds directory
let normalizedPath = prdFile.trim();
if (!normalizedPath.startsWith('prds/')) {
  normalizedPath = `prds/${normalizedPath}`;
}

// Ensure .yaml extension
if (!normalizedPath.endsWith('.yaml') && !normalizedPath.endsWith('.yml')) {
  normalizedPath = `${normalizedPath}.yaml`;
}

const fullPath = `/home/ubuntu/projects/grimlock/${normalizedPath}`;

return [{
  json: {
    prd_path: fullPath,
    prd_filename: normalizedPath,
    timestamp: $input.first().json.timestamp,
    trigger_source: $input.first().json.trigger_source
  }
}];
```

---

### Node 4: Read PRD File (SSH)

**Type:** `n8n-nodes-base.ssh`

**Credentials:** `ec2-grimlock`

**Command:**
```
cat {{ $json.prd_path }} 2>/dev/null || echo "FILE_NOT_FOUND"
```

---

### Node 5: Validate PRD (Code)

**Type:** `n8n-nodes-base.code`

**Language:** JavaScript

**Code:**
```javascript
// Validate PRD structure
const prdContent = $input.first().json.stdout;

// Check if file exists
if (prdContent.trim() === 'FILE_NOT_FOUND') {
  return [{
    json: {
      valid: false,
      errors: ['E001: PRD file not found at specified path'],
      prd: null
    }
  }];
}

// Parse YAML (n8n has js-yaml available)
let prd;
try {
  const yaml = require('js-yaml');
  prd = yaml.load(prdContent);
} catch (e) {
  return [{
    json: {
      valid: false,
      errors: [`E002: Invalid PRD YAML syntax - ${e.message}`],
      prd: null
    }
  }];
}

// Validate required sections
const errors = [];

// Check metadata
if (!prd.metadata) {
  errors.push('E003: Missing metadata section');
} else {
  if (!prd.metadata.project_name) {
    errors.push('E003: Missing metadata.project_name');
  }
  if (!prd.metadata.sprint?.start_datetime) {
    errors.push('E003: Missing metadata.sprint.start_datetime');
  }
  if (!prd.metadata.sprint?.end_datetime) {
    errors.push('E003: Missing metadata.sprint.end_datetime');
  }
}

// Check success criteria
if (!prd.success_criteria || prd.success_criteria.length === 0) {
  errors.push('E004: Success criteria empty or missing');
} else {
  prd.success_criteria.forEach((sc, i) => {
    if (!sc.id || !sc.description || !sc.validation_method) {
      errors.push(`E004: Success criterion ${i + 1} missing required fields (id, description, validation_method)`);
    }
  });
}

// Check milestones
if (!prd.milestones || prd.milestones.length === 0) {
  errors.push('E003: Missing milestones section');
} else {
  if (!prd.milestones[0].id || !prd.milestones[0].name) {
    errors.push('E003: First milestone missing id or name');
  }
}

// Check scope
if (!prd.scope?.in_scope || prd.scope.in_scope.length === 0) {
  errors.push('E003: Missing scope.in_scope section');
}

// Return result
if (errors.length > 0) {
  return [{
    json: {
      valid: false,
      errors: errors,
      prd: null
    }
  }];
}

// Extract useful info for next steps
const milestoneIds = prd.milestones.map(m => m.id);
const firstMilestone = prd.milestones[0];

return [{
  json: {
    valid: true,
    errors: [],
    prd: prd,
    project_name: prd.metadata.project_name,
    target_end: prd.metadata.sprint.end_datetime,
    milestones: milestoneIds,
    first_milestone: {
      id: firstMilestone.id,
      name: firstMilestone.name
    },
    success_criteria_count: prd.success_criteria.length,
    prd_path: $('Parse PRD Path').item.json.prd_path,
    prd_filename: $('Parse PRD Path').item.json.prd_filename,
    timestamp: $('Parse PRD Path').item.json.timestamp,
    trigger_source: $('Parse PRD Path').item.json.trigger_source
  }
}];
```

---

### Node 6: PRD Valid? (IF)

**Type:** `n8n-nodes-base.if`

**Condition:**
- Value 1: `{{ $json.valid }}`
- Operation: `equals`
- Value 2: `true`

**True output:** Continue to Launch Claude
**False output:** Send Error to Slack

---

### Node 7a: Launch Claude Code (SSH) - True Path

**Type:** `n8n-nodes-base.ssh`

**Credentials:** `ec2-grimlock`

**Command:**
```bash
cd /home/ubuntu/projects/grimlock && \
nohup claude --dangerously-skip-permissions \
  > /tmp/grimlock-cc-{{ $json.project_name | replace(' ', '-') }}.log 2>&1 &
echo "CC_LAUNCHED_PID=$!"
```

**Note:** Adjust the claude command based on actual Claude Code CLI syntax

---

### Node 7b: Send Error (Slack) - False Path

**Type:** `n8n-nodes-base.slack`

**Credentials:** `grimlock-slack-bot`

**Settings:**
- Channel: `#grimlock-ops`
- Text:
```
❌ *Sprint Failed to Start*
━━━━━━━━━━━━━━━━━━━
*Errors:*
• {{ $json.errors.join('\n• ') }}

Please fix the PRD and try again.
```

---

### Node 8: Initialize State (SSH)

**Type:** `n8n-nodes-base.ssh`

**Credentials:** `ec2-grimlock`

**Command:**
```bash
cat > /home/ubuntu/projects/grimlock/GRIMLOCK_STATE.md << 'STATEEOF'
---
# GRIMLOCK State File
# Auto-generated - Do not edit manually during sprint

sprint:
  status: "running"
  started_at: "{{ $json.timestamp }}"
  last_updated: "{{ $json.timestamp }}"
  prd_file: "{{ $json.prd_filename }}"
  project_name: "{{ $json.project_name }}"
  target_end: "{{ $json.target_end }}"

current_position:
  milestone_id: "{{ $json.first_milestone.id }}"
  milestone_name: "{{ $json.first_milestone.name }}"
  task_index: 0
  task_description: null

progress:
  milestones_completed: []
  milestones_remaining: {{ JSON.stringify($json.milestones) }}
  current_milestone_tasks:
    completed: []
    remaining: []

success_criteria:
  total: {{ $json.success_criteria_count }}
  evaluated: 0
  passed: 0
  failed: 0
  pending: {{ $json.success_criteria_count }}
  details: []

recent_actions:
  - timestamp: "{{ $json.timestamp }}"
    action: "Sprint initiated"

escalations:
  total_count: 0
  by_severity:
    warning: 0
    pause: 0
    emergency: 0
  last_escalation: null

checkpoints:
  last_successful_checkpoint: "{{ $json.timestamp }}"
  checkpoint_data: null
---

## Current Status Summary

Sprint active. Working on {{ $json.first_milestone.name }}.

## Steps Taken This Sprint

1. Sprint initiated at {{ $json.timestamp }}

## Blockers or Issues

None.

## Next Actions

Executing milestone {{ $json.first_milestone.id }}: {{ $json.first_milestone.name }}.
STATEEOF
```

---

### Node 9: Git Commit (SSH)

**Type:** `n8n-nodes-base.ssh`

**Credentials:** `ec2-grimlock`

**Command:**
```bash
cd /home/ubuntu/projects/grimlock && \
git add GRIMLOCK_STATE.md && \
git commit -m "state: sprint started for {{ $json.project_name }}"
```

---

### Node 10: Send Confirmation (Slack)

**Type:** `n8n-nodes-base.slack`

**Credentials:** `grimlock-slack-bot`

**Settings:**
- Channel: `#grimlock-ops`
- Text:
```
🚀 *Sprint Initiated*
━━━━━━━━━━━━━━━━━━━
*Project:* {{ $json.project_name }}
*PRD:* {{ $json.prd_filename }}
*Started:* {{ $json.timestamp }}
*Target End:* {{ $json.target_end }}
*First Milestone:* {{ $json.first_milestone.id }} - {{ $json.first_milestone.name }}
━━━━━━━━━━━━━━━━━━━
GRIMLOCK is now running autonomously.
```

---

### Node 11: Respond to Webhook

**Type:** `n8n-nodes-base.respondToWebhook`

**Settings:**
- Respond With: `JSON`
- Response Body:
```javascript
={{
  {
    status: 'initiated',
    sprint_id: $json.project_name + '-' + Date.now(),
    project: $json.project_name,
    started_at: $json.timestamp,
    target_end: $json.target_end,
    first_milestone: $json.first_milestone.id
  }
}}
```

---

## Test Payloads

### Webhook Test (Success)
```bash
curl -X POST https://<n8n-instance>.app.n8n.cloud/webhook/grimlock/start \
  -H "Content-Type: application/json" \
  -d '{"prd_file": "GRIMLOCK-PRD.yaml"}'
```

### Webhook Test (Error - Missing PRD)
```bash
curl -X POST https://<n8n-instance>.app.n8n.cloud/webhook/grimlock/start \
  -H "Content-Type: application/json" \
  -d '{"prd_file": "nonexistent.yaml"}'
```

---

## Validation Checklist

- [ ] Slack trigger receives `/grimlock start` command
- [ ] Webhook receives POST requests
- [ ] PRD file path normalized correctly
- [ ] PRD validation catches all error types
- [ ] Error message posted to Slack on failure
- [ ] Claude Code process launches on EC2
- [ ] GRIMLOCK_STATE.md created with correct content
- [ ] Git commit created with proper message
- [ ] Success message posted to Slack
- [ ] Webhook returns proper JSON response

---

*Workflow Spec v1.0 - December 2024*
