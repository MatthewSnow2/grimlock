# Workflow: Milestone Gate Checker

## Overview

**Purpose:** Validate milestone completion and route pass/fail decisions

**Trigger:** Webhook `POST /grimlock/milestone`

**Success Criteria:** SC003 - Milestone Gate Checker validates and routes correctly

---

## Node Flow Diagram

```
┌─────────────────────┐
│      Webhook        │
│ /grimlock/milestone │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Parse Payload     │
│    (Code Node)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Read Current State │
│    (SSH Node)       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Evaluate Validation │
│  Results (Code)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  All Checks Pass?   │
│    (Switch Node)    │
└──────────┬──────────┘
           │
    ┌──────┼──────┐
    │      │      │
    ▼      ▼      ▼
┌──────┐ ┌────┐ ┌─────┐
│ PASS │ │FAIL│ │ERROR│
└──┬───┘ └─┬──┘ └──┬──┘
   │       │       │
   ▼       ▼       ▼
┌─────────────────────┐
│   Prepare Update    │
│    (Set Nodes)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Update State      │
│    (SSH Node)       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│    Git Commit       │
│    (SSH Node)       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Post Notification   │
│   (Slack Node)      │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌─────────┐  ┌─────────┐
│  PASS   │  │  FAIL   │
│  (End)  │  │ DM Op   │
└─────────┘  └────┬────┘
                  │
                  ▼
         ┌─────────────────┐
         │   DM Operator   │
         │  (Slack Node)   │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ Respond Webhook │
         └─────────────────┘
```

---

## Node Configurations

### Node 1: Webhook

**Type:** `n8n-nodes-base.webhook`

**Settings:**
- HTTP Method: `POST`
- Path: `grimlock/milestone`
- Response Mode: `Response Node`

**Expected Payload:**
```json
{
  "milestone_id": "M1",
  "validation_results": [
    { "check": "deliverable_1_exists", "passed": true },
    { "check": "tests_pass", "passed": true }
  ]
}
```

---

### Node 2: Parse Payload (Code)

**Type:** `n8n-nodes-base.code`

**Language:** JavaScript

**Code:**
```javascript
// Parse and validate milestone payload
const body = $input.first().json.body;
const timestamp = new Date().toISOString();

// Validate required fields
if (!body.milestone_id) {
  return [{
    json: {
      error: true,
      error_message: 'Missing required field: milestone_id',
      timestamp: timestamp
    }
  }];
}

// validation_results is optional - if not provided, we'll run default checks
const validationResults = body.validation_results || [];

// Validate structure of validation_results if provided
if (validationResults.length > 0) {
  for (let i = 0; i < validationResults.length; i++) {
    const result = validationResults[i];
    if (typeof result.check !== 'string' || typeof result.passed !== 'boolean') {
      return [{
        json: {
          error: true,
          error_message: `Invalid validation_result at index ${i}: requires 'check' (string) and 'passed' (boolean)`,
          timestamp: timestamp
        }
      }];
    }
  }
}

return [{
  json: {
    error: false,
    milestone_id: body.milestone_id,
    validation_results: validationResults,
    has_custom_validation: validationResults.length > 0,
    custom_checks: body.custom_checks || [],
    timestamp: timestamp
  }
}];
```

---

### Node 3: Read Current State (SSH)

**Type:** `n8n-nodes-base.ssh`

**Credentials:** `ec2-grimlock`

**Command:**
```bash
cat /home/ubuntu/projects/grimlock/GRIMLOCK_STATE.md
```

---

### Node 4: Evaluate Validation Results (Code)

**Type:** `n8n-nodes-base.code`

**Language:** JavaScript

**Code:**
```javascript
// Evaluate validation results
const yaml = require('js-yaml');
const input = $('Parse Payload').item.json;
const stateContent = $input.first().json.stdout;

// Check for parse errors
if (input.error) {
  return [{
    json: {
      result: 'ERROR',
      action: 'error',
      message: input.error_message,
      timestamp: input.timestamp
    }
  }];
}

// Parse state file
let state;
try {
  const yamlMatch = stateContent.match(/^---\n([\s\S]*?)\n---/);
  if (!yamlMatch) throw new Error('Invalid state file format');
  state = yaml.load(yamlMatch[1]);
} catch (e) {
  return [{
    json: {
      result: 'ERROR',
      action: 'error',
      message: `E020: State file corrupted - ${e.message}`,
      timestamp: input.timestamp
    }
  }];
}

const milestoneId = input.milestone_id;
const validationResults = input.validation_results;

// Default validation checks
let passedChecks = [];
let failedChecks = [];

if (validationResults.length > 0) {
  // Use provided validation results
  validationResults.forEach(result => {
    if (result.passed) {
      passedChecks.push(result.check);
    } else {
      failedChecks.push(result.check);
    }
  });
} else {
  // Run default validation checks

  // Check 1: Milestone ID matches current position
  if (state.current_position?.milestone_id === milestoneId) {
    passedChecks.push('Milestone ID matches current position');
  } else {
    failedChecks.push(`Milestone mismatch: expected ${milestoneId}, current is ${state.current_position?.milestone_id}`);
  }

  // Check 2: Sprint is running
  if (state.sprint?.status === 'running') {
    passedChecks.push('Sprint is running');
  } else {
    failedChecks.push(`Sprint not running (status: ${state.sprint?.status})`);
  }

  // Check 3: State file is valid
  if (state.sprint && state.current_position && state.progress) {
    passedChecks.push('State file structure valid');
  } else {
    failedChecks.push('State file missing required sections');
  }
}

const allPassed = failedChecks.length === 0;

// Determine next milestone
let nextMilestone = null;
let nextMilestoneName = null;
if (allPassed && state.progress?.milestones_remaining) {
  const remaining = state.progress.milestones_remaining;
  const currentIndex = remaining.indexOf(milestoneId);
  if (currentIndex >= 0 && currentIndex < remaining.length - 1) {
    nextMilestone = remaining[currentIndex + 1];
    // Try to get milestone name from PRD reference if available
    nextMilestoneName = nextMilestone;
  } else if (currentIndex === remaining.length - 1) {
    nextMilestone = 'COMPLETE';
    nextMilestoneName = 'Sprint Completion';
  }
}

// Calculate duration (simplified - would need milestone start time for accuracy)
const duration = 'N/A';

return [{
  json: {
    milestone_id: milestoneId,
    result: allPassed ? 'PASS' : 'FAIL',
    action: allPassed ? 'continue' : 'pause',
    passed: allPassed,
    passed_checks: passedChecks,
    failed_checks: failedChecks,
    passed_count: passedChecks.length,
    failed_count: failedChecks.length,
    next_milestone: nextMilestone,
    next_milestone_name: nextMilestoneName,
    duration: duration,
    current_state: state,
    project_name: state.sprint?.project_name || 'Unknown',
    timestamp: input.timestamp
  }
}];
```

---

### Node 5: Route by Result (Switch)

**Type:** `n8n-nodes-base.switch`

**Settings:**
- Data Type: `String`
- Value: `{{ $json.result }}`
- Rules:
  - Rule 1: `PASS`
  - Rule 2: `FAIL`
  - Fallback: `ERROR`

---

### Node 6a: Prepare Pass Update (Set) - PASS Path

**Type:** `n8n-nodes-base.set`

**Values:**

| Name | Value |
|------|-------|
| new_status | `running` |
| commit_message | `state: milestone {{ $json.milestone_id }} passed` |
| slack_message | `✅ *Milestone Complete: {{ $json.milestone_id }}*\n━━━━━━━━━━━━━━━━━━━\n*Project:* {{ $json.project_name }}\n*Checks Passed:* {{ $json.passed_count }}\n*Duration:* {{ $json.duration }}\n*Proceeding to:* {{ $json.next_milestone || 'FINAL' }} - {{ $json.next_milestone_name || 'Completion' }}` |
| slack_emoji | `✅` |

---

### Node 6b: Prepare Fail Update (Set) - FAIL Path

**Type:** `n8n-nodes-base.set`

**Values:**

| Name | Value |
|------|-------|
| new_status | `paused` |
| commit_message | `state: milestone {{ $json.milestone_id }} failed - paused` |
| slack_message | `❌ *Milestone Failed: {{ $json.milestone_id }}*\n━━━━━━━━━━━━━━━━━━━\n*Project:* {{ $json.project_name }}\n*Failed Validations:*\n• {{ $json.failed_checks.join('\n• ') }}\n*Passed Checks:* {{ $json.passed_count }}\n*System Status:* PAUSED\n━━━━━━━━━━━━━━━━━━━\nReply \`/grimlock resume\` to retry or \`/grimlock abort\` to cancel.` |
| slack_emoji | `❌` |

---

### Node 6c: Prepare Error Response (Set) - ERROR Path

**Type:** `n8n-nodes-base.set`

**Values:**

| Name | Value |
|------|-------|
| new_status | `error` |
| commit_message | `state: milestone validation error` |
| slack_message | `⚠️ *Milestone Validation Error*\n━━━━━━━━━━━━━━━━━━━\n*Error:* {{ $json.message }}\n\nCheck workflow logs for details.` |
| slack_emoji | `⚠️` |

---

### Node 7: Update State (SSH)

**Type:** `n8n-nodes-base.ssh`

**Credentials:** `ec2-grimlock`

**Command:**
```bash
cd /home/ubuntu/projects/grimlock && \
sed -i 's/status: "[^"]*"/status: "{{ $json.new_status }}"/' GRIMLOCK_STATE.md && \
sed -i 's/last_updated: "[^"]*"/last_updated: "{{ $('Evaluate Validation Results').item.json.timestamp }}"/' GRIMLOCK_STATE.md
```

**Note:** For PASS, also need to update milestones_completed and milestones_remaining. Consider using a more robust update mechanism.

---

### Node 8: Git Commit (SSH)

**Type:** `n8n-nodes-base.ssh`

**Credentials:** `ec2-grimlock`

**Command:**
```bash
cd /home/ubuntu/projects/grimlock && \
git add GRIMLOCK_STATE.md && \
git commit -m "{{ $json.commit_message }}"
```

---

### Node 9: Post Notification (Slack)

**Type:** `n8n-nodes-base.slack`

**Credentials:** `grimlock-slack-bot`

**Settings:**
- Channel: `#grimlock-ops`
- Text: `{{ $json.slack_message }}`

---

### Node 10: DM on Fail (Slack) - FAIL Path Only

**Type:** `n8n-nodes-base.slack`

**Credentials:** `grimlock-slack-bot`

**Settings:**
- Channel: `@matthew`
- Text:
```
❌ *Milestone {{ $('Evaluate Validation Results').item.json.milestone_id }} Failed*

*Project:* {{ $('Evaluate Validation Results').item.json.project_name }}

*Failed Checks:*
• {{ $('Evaluate Validation Results').item.json.failed_checks.join('\n• ') }}

Check #grimlock-ops for full details.
```

**Connection:** Only connect from FAIL path

---

### Node 11: Respond to Webhook

**Type:** `n8n-nodes-base.respondToWebhook`

**Settings:**
- Respond With: `JSON`
- Response Body:
```javascript
={{
  {
    action: $('Evaluate Validation Results').item.json.action,
    result: $('Evaluate Validation Results').item.json.result,
    milestone_id: $('Evaluate Validation Results').item.json.milestone_id,
    next_milestone: $('Evaluate Validation Results').item.json.next_milestone,
    passed_checks: $('Evaluate Validation Results').item.json.passed_count,
    failed_checks: $('Evaluate Validation Results').item.json.failed_count,
    timestamp: $('Evaluate Validation Results').item.json.timestamp
  }
}}
```

---

## Test Payloads

### Test 1: Milestone Pass
```bash
curl -X POST https://<n8n-instance>.app.n8n.cloud/webhook/grimlock/milestone \
  -H "Content-Type: application/json" \
  -d '{
    "milestone_id": "M1",
    "validation_results": [
      { "check": "Repository structure correct", "passed": true },
      { "check": "State file initialized", "passed": true },
      { "check": "Workflow deployed", "passed": true }
    ]
  }'
```

**Expected Response:**
```json
{
  "action": "continue",
  "result": "PASS",
  "milestone_id": "M1",
  "next_milestone": "M2",
  "passed_checks": 3,
  "failed_checks": 0
}
```

### Test 2: Milestone Fail
```bash
curl -X POST https://<n8n-instance>.app.n8n.cloud/webhook/grimlock/milestone \
  -H "Content-Type: application/json" \
  -d '{
    "milestone_id": "M1",
    "validation_results": [
      { "check": "Repository structure correct", "passed": true },
      { "check": "Workflow deployed", "passed": false }
    ]
  }'
```

**Expected Response:**
```json
{
  "action": "pause",
  "result": "FAIL",
  "milestone_id": "M1",
  "next_milestone": null,
  "passed_checks": 1,
  "failed_checks": 1
}
```

### Test 3: Default Validation (No Results Provided)
```bash
curl -X POST https://<n8n-instance>.app.n8n.cloud/webhook/grimlock/milestone \
  -H "Content-Type: application/json" \
  -d '{"milestone_id": "M1"}'
```

---

## Validation Checklist

- [ ] Webhook receives POST requests correctly
- [ ] Payload validation catches missing milestone_id
- [ ] Payload validation catches malformed validation_results
- [ ] State file read successfully
- [ ] Default validation runs when no results provided
- [ ] Custom validation results processed correctly
- [ ] PASS route updates state to "running"
- [ ] FAIL route updates state to "paused"
- [ ] Git commit created with correct message
- [ ] Success message posted to Slack
- [ ] Failure message posted to Slack + DM
- [ ] Webhook returns correct JSON response
- [ ] Next milestone calculated correctly

---

*Workflow Spec v1.0 - December 2024*
