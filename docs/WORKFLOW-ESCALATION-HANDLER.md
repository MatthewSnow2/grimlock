# Workflow: Escalation Handler

## Overview

**Purpose:** Route escalations by severity level with multi-channel notification and audit logging

**Trigger:** Webhook `POST /grimlock/escalate`

**Success Criteria:** SC004 - Escalation Handler routes by severity correctly

---

## Severity Level Routing

| Severity | Slack Channel | Slack DM | Process Action | Google Sheets |
|----------|---------------|----------|----------------|---------------|
| INFO | No | No | None | Yes |
| WARNING | Yes | No | None | Yes |
| PAUSE | Yes | Yes | Halt execution | Yes |
| EMERGENCY | Yes | Yes | Kill CC process | Yes |

---

## Node Flow Diagram

```
┌──────────────────────┐
│       Webhook        │
│  /grimlock/escalate  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Parse & Validate   │
│     (Code Node)      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Route by Severity   │
│    (Switch Node)     │
└──────────┬───────────┘
           │
    ┌──────┼──────┬──────┐
    │      │      │      │
    ▼      ▼      ▼      ▼
┌──────┐ ┌────┐ ┌─────┐ ┌─────────┐
│ INFO │ │WARN│ │PAUSE│ │EMERGENCY│
└──┬───┘ └─┬──┘ └──┬──┘ └────┬────┘
   │       │       │         │
   │       ▼       ▼         ▼
   │  ┌────────────────────────┐
   │  │  Post to Channel       │
   │  │    (Slack Node)        │
   │  └───────────┬────────────┘
   │              │
   │       ┌──────┴──────┐
   │       │             │
   │       ▼             ▼
   │  ┌─────────┐  ┌─────────────┐
   │  │  PAUSE  │  │  EMERGENCY  │
   │  └────┬────┘  └──────┬──────┘
   │       │              │
   │       ▼              ▼
   │  ┌─────────┐  ┌─────────────┐
   │  │   DM    │  │    DM       │
   │  │ Operator│  │  Operator   │
   │  └────┬────┘  └──────┬──────┘
   │       │              │
   │       │              ▼
   │       │        ┌─────────────┐
   │       │        │  Kill CC    │
   │       │        │ (SSH Node)  │
   │       │        └──────┬──────┘
   │       │               │
   └───────┴───────┬───────┘
                   │
                   ▼
         ┌─────────────────────┐
         │      Merge          │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  Log to Sheets      │
         │ (Google Sheets)     │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  Respond Webhook    │
         └─────────────────────┘
```

---

## Node Configurations

### Node 1: Webhook

**Type:** `n8n-nodes-base.webhook`

**Settings:**
- HTTP Method: `POST`
- Path: `grimlock/escalate`
- Response Mode: `Response Node`

**Expected Payload:**
```json
{
  "severity": "WARNING|PAUSE|EMERGENCY",
  "message": "Description of the issue",
  "circuit_breaker": "CB001",
  "project_name": "GRIMLOCK",
  "sprint_id": "GRIMLOCK-1234567890",
  "context": {
    "additional": "details"
  }
}
```

---

### Node 2: Parse & Validate (Code)

**Type:** `n8n-nodes-base.code`

**Language:** JavaScript

**Code:**
```javascript
// Parse and validate escalation payload
const body = $input.first().json.body;
const timestamp = new Date().toISOString();

// Valid severity levels
const validSeverities = ['INFO', 'WARNING', 'PAUSE', 'EMERGENCY'];

// Normalize and validate severity
let severity = (body.severity || 'WARNING').toUpperCase();
if (!validSeverities.includes(severity)) {
  severity = 'WARNING'; // Default to WARNING if invalid
}

// Validate message
if (!body.message || typeof body.message !== 'string') {
  return [{
    json: {
      error: true,
      error_message: 'Missing or invalid required field: message',
      timestamp: timestamp
    }
  }];
}

// Generate unique escalation ID
const escalationId = `ESC-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

// Format timestamp for display
const displayTime = new Date().toLocaleString('en-US', {
  timeZone: 'America/Chicago',
  dateStyle: 'short',
  timeStyle: 'medium'
});

// Determine notification targets
const notifyChannel = severity !== 'INFO';
const notifyDM = severity === 'PAUSE' || severity === 'EMERGENCY';
const killProcess = severity === 'EMERGENCY';

// Select emoji
const emojiMap = {
  'INFO': 'ℹ️',
  'WARNING': '⚠️',
  'PAUSE': '🛑',
  'EMERGENCY': '🚨'
};

return [{
  json: {
    error: false,
    escalation_id: escalationId,
    severity: severity,
    message: body.message,
    circuit_breaker: body.circuit_breaker || null,
    project_name: body.project_name || 'Unknown',
    sprint_id: body.sprint_id || 'Unknown',
    context: body.context || {},
    context_json: JSON.stringify(body.context || {}),
    timestamp: timestamp,
    display_time: displayTime,
    emoji: emojiMap[severity],
    notify_channel: notifyChannel,
    notify_dm: notifyDM,
    kill_process: killProcess
  }
}];
```

---

### Node 3: Route by Severity (Switch)

**Type:** `n8n-nodes-base.switch`

**Settings:**
- Data Type: `String`
- Value: `{{ $json.severity }}`
- Rules:
  - Rule 1: `INFO`
  - Rule 2: `WARNING`
  - Rule 3: `PAUSE`
  - Rule 4: `EMERGENCY`

---

### Node 4a: INFO Path (Set)

**Type:** `n8n-nodes-base.set`

**Purpose:** INFO only logs, no notifications

**Values:**

| Name | Value |
|------|-------|
| notification_sent | `log_only` |
| process_action | `none` |
| slack_posted | `false` |
| dm_sent | `false` |

---

### Node 4b: WARNING Channel Post (Slack)

**Type:** `n8n-nodes-base.slack`

**Credentials:** `grimlock-slack-bot`

**Settings:**
- Channel: `#grimlock-ops`
- Text:
```
⚠️ *Warning*
━━━━━━━━━━━━━━━━━━━
*Issue:* {{ $json.message }}
*Project:* {{ $json.project_name }}
{{ $json.circuit_breaker ? '*Circuit Breaker:* ' + $json.circuit_breaker : '' }}
*Escalation ID:* {{ $json.escalation_id }}
*Time:* {{ $json.display_time }}
━━━━━━━━━━━━━━━━━━━
_No intervention required unless repeated._
```

---

### Node 4c: PAUSE Channel Post (Slack)

**Type:** `n8n-nodes-base.slack`

**Credentials:** `grimlock-slack-bot`

**Settings:**
- Channel: `#grimlock-ops`
- Text:
```
🛑 *GRIMLOCK Paused*
━━━━━━━━━━━━━━━━━━━
*Reason:* {{ $json.message }}
*Project:* {{ $json.project_name }}
{{ $json.circuit_breaker ? '*Circuit Breaker:* ' + $json.circuit_breaker : '*Trigger:* Manual' }}
*Escalation ID:* {{ $json.escalation_id }}
*State Preserved:* Yes
━━━━━━━━━━━━━━━━━━━
*Options:*
• `/grimlock resume` - Continue from current state
• `/grimlock status` - View full state details
• `/grimlock abort` - Cancel sprint
```

---

### Node 4d: EMERGENCY Channel Post (Slack)

**Type:** `n8n-nodes-base.slack`

**Credentials:** `grimlock-slack-bot`

**Settings:**
- Channel: `#grimlock-ops`
- Text:
```
🚨 *EMERGENCY - GRIMLOCK Halted*
━━━━━━━━━━━━━━━━━━━
*Critical Issue:* {{ $json.message }}
*Project:* {{ $json.project_name }}
{{ $json.circuit_breaker ? '*Trigger:* ' + $json.circuit_breaker : '*Trigger:* Manual Emergency' }}
*Escalation ID:* {{ $json.escalation_id }}
*Process Status:* TERMINATED
━━━━━━━━━━━━━━━━━━━
Immediate human review required.
Claude Code process has been killed.
```

---

### Node 5c: PAUSE DM (Slack)

**Type:** `n8n-nodes-base.slack`

**Credentials:** `grimlock-slack-bot`

**Settings:**
- Channel: `@matthew` (or operator handle)
- Text:
```
🛑 *GRIMLOCK Requires Your Attention*

*Project:* {{ $json.project_name }}
*Issue:* {{ $json.message }}
{{ $json.circuit_breaker ? '*Circuit Breaker:* ' + $json.circuit_breaker : '' }}
*Escalation ID:* {{ $json.escalation_id }}

Check #grimlock-ops for full details.

Reply with:
• `/grimlock resume` to continue
• `/grimlock status` to check state
• `/grimlock abort` to cancel
```

---

### Node 5d: EMERGENCY DM (Slack)

**Type:** `n8n-nodes-base.slack`

**Credentials:** `grimlock-slack-bot`

**Settings:**
- Channel: `@matthew` (or operator handle)
- Text:
```
🚨 *GRIMLOCK EMERGENCY*

*Critical Issue:* {{ $json.message }}
*Project:* {{ $json.project_name }}
*Escalation ID:* {{ $json.escalation_id }}

Claude Code process has been TERMINATED.
Immediate review required.

This is an automated emergency alert.
```

---

### Node 6: Kill CC Process (SSH) - EMERGENCY Only

**Type:** `n8n-nodes-base.ssh`

**Credentials:** `ec2-grimlock`

**Command:**
```bash
# Kill Claude Code process
pkill -f 'claude' || echo 'No claude process found'

# Update state to aborted
cd /home/ubuntu/projects/grimlock && \
sed -i 's/status: "[^"]*"/status: "aborted"/' GRIMLOCK_STATE.md && \
sed -i 's/last_updated: "[^"]*"/last_updated: "{{ $json.timestamp }}"/' GRIMLOCK_STATE.md && \
git add GRIMLOCK_STATE.md && \
git commit -m "state: EMERGENCY - process terminated ({{ $json.escalation_id }})"

echo "EMERGENCY_HANDLED"
```

---

### Node 7: Merge Paths

**Type:** `n8n-nodes-base.merge`

**Settings:**
- Mode: `Choose Branch`

**Purpose:** Merge all paths before logging to ensure all escalations are logged

---

### Node 8: Log to Google Sheets

**Type:** `n8n-nodes-base.googleSheets`

**Credentials:** `grimlock-sheets`

**Settings:**
- Operation: `Append Row`
- Document ID: `YOUR_SPREADSHEET_ID`
- Sheet Name: `Escalations`
- Data Mapping Mode: `Map Each Column Manually`

**Column Mapping:**

| Column | Value |
|--------|-------|
| Timestamp | `{{ $json.timestamp }}` |
| Sprint ID | `{{ $json.sprint_id }}` |
| Project | `{{ $json.project_name }}` |
| Severity | `{{ $json.severity }}` |
| Circuit Breaker | `{{ $json.circuit_breaker || '' }}` |
| Message | `{{ $json.message }}` |
| Context | `{{ $json.context_json }}` |
| Escalation ID | `{{ $json.escalation_id }}` |
| Resolution | (leave empty - filled later) |
| Resolved At | (leave empty - filled later) |

---

### Node 9: Respond to Webhook

**Type:** `n8n-nodes-base.respondToWebhook`

**Settings:**
- Respond With: `JSON`
- Response Body:
```javascript
={{
  {
    logged: true,
    escalation_id: $json.escalation_id,
    severity: $json.severity,
    notification_sent: $json.notify_channel ? ($json.notify_dm ? 'channel_and_dm' : 'channel') : 'log_only',
    process_action: $json.kill_process ? 'terminated' : 'none',
    timestamp: $json.timestamp
  }
}}
```

---

## Test Payloads

### Test 1: INFO Escalation (Log Only)
```bash
curl -X POST https://<n8n-instance>.app.n8n.cloud/webhook/grimlock/escalate \
  -H "Content-Type: application/json" \
  -d '{
    "severity": "INFO",
    "message": "Milestone M1 started",
    "project_name": "GRIMLOCK"
  }'
```

**Expected:** Logged to Sheets only, no Slack messages

### Test 2: WARNING Escalation (Channel Only)
```bash
curl -X POST https://<n8n-instance>.app.n8n.cloud/webhook/grimlock/escalate \
  -H "Content-Type: application/json" \
  -d '{
    "severity": "WARNING",
    "message": "SSH connection retry 2 of 3",
    "project_name": "GRIMLOCK",
    "context": {"retry_count": 2, "error": "Connection timeout"}
  }'
```

**Expected:** Message in #grimlock-ops, logged to Sheets

### Test 3: PAUSE Escalation (Channel + DM)
```bash
curl -X POST https://<n8n-instance>.app.n8n.cloud/webhook/grimlock/escalate \
  -H "Content-Type: application/json" \
  -d '{
    "severity": "PAUSE",
    "message": "Milestone validation failed after 3 attempts",
    "circuit_breaker": "CB002",
    "project_name": "GRIMLOCK",
    "sprint_id": "GRIMLOCK-1702677600000"
  }'
```

**Expected:** Message in #grimlock-ops, DM to operator, logged to Sheets

### Test 4: EMERGENCY Escalation (Full Response)
```bash
curl -X POST https://<n8n-instance>.app.n8n.cloud/webhook/grimlock/escalate \
  -H "Content-Type: application/json" \
  -d '{
    "severity": "EMERGENCY",
    "message": "Runaway loop detected - resource exhaustion imminent",
    "project_name": "GRIMLOCK",
    "context": {"cpu_usage": "98%", "memory": "95%"}
  }'
```

**Expected:** Message in #grimlock-ops, DM to operator, CC process killed, state set to aborted, logged to Sheets

---

## Google Sheets Setup

### Required Spreadsheet Structure

**Spreadsheet Name:** "GRIMLOCK Escalation Log"

**Sheet Name:** "Escalations"

**Header Row (Row 1):**
| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| Timestamp | Sprint ID | Project | Severity | Circuit Breaker | Message | Context | Escalation ID | Resolution | Resolved At |

**Column Formats:**
- A: Date/Time
- B-H: Plain text
- I: Plain text (manual entry)
- J: Date/Time (manual entry)

---

## Validation Checklist

- [ ] Webhook receives POST requests correctly
- [ ] Payload validation catches missing message
- [ ] Invalid severity defaults to WARNING
- [ ] Escalation ID generated uniquely
- [ ] INFO: No Slack messages, only Sheets log
- [ ] WARNING: Channel message only
- [ ] PAUSE: Channel + DM messages
- [ ] EMERGENCY: Channel + DM + process kill
- [ ] SSH kills CC process on EMERGENCY
- [ ] State file updated to "aborted" on EMERGENCY
- [ ] All escalations logged to Google Sheets
- [ ] Webhook returns correct JSON response
- [ ] Context JSON serialized correctly

---

## Troubleshooting

### Google Sheets Not Logging
1. Check credentials are valid
2. Verify spreadsheet ID is correct
3. Ensure sheet name matches exactly
4. Check service account has edit permissions

### DM Not Received
1. Verify operator Slack handle is correct
2. Check bot has permission to DM users
3. Ensure user hasn't blocked the bot

### Process Not Killed
1. Check SSH credentials
2. Verify EC2 is accessible
3. Check for correct process name in pkill command

---

*Workflow Spec v1.0 - December 2024*
