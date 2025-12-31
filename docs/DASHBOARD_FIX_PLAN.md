# Dashboard Data Fix Plan

## Problem Summary

The dashboard displays incorrect data because of a **data source mismatch**:

| Component | Data Source | Issue |
|-----------|-------------|-------|
| n8n Sprint Initiator | Writes to JSONL files | ✅ Working |
| FastAPI Backend | Reads from PostgreSQL | ✅ Working |
| Dashboard | Calls FastAPI | ✅ Working |
| **GAP** | JSONL ↛ PostgreSQL | ❌ No sync |

### Current Data Flow
```
PRD Upload → FastAPI → Triggers n8n → SSH writes JSONL → (dead end)
                                                      ↓
Dashboard ← FastAPI ← PostgreSQL ← (never updated)
```

### Required Data Flow
```
PRD Upload → FastAPI → Triggers n8n → HTTP calls FastAPI → PostgreSQL
                                                              ↓
Dashboard ← FastAPI ← PostgreSQL ← (updated in real-time)
```

---

## Affected Pages

### 1. Build Page
- **MCP Name:** Shows wrong name (should be `windows-mcp`)
- **Progress:** Not updating
- **Status:** Stuck on old data

### 2. Build Logs Page
- **Logs:** Empty or showing sample data
- **Timeline:** Not updating with real events

### 3. Analytics Page
- **Total Builds:** Shows 4 (only DB entries, not real builds)
- **Most Built MCPs:** Based on stale test data
- **Success Rate:** Incorrect

---

## Solution: Update n8n Workflow

Modify the **GRIMLOCK Sprint Initiator** workflow to call FastAPI endpoints instead of writing JSONL files via SSH.

### Current Workflow
```
Webhook → Set Build Info → Respond → SSH (write JSONL) → SSH (update state)
```

### New Workflow
```
Webhook → Set Build Info → Respond → HTTP POST /api/builds → SSH (launch Claude) → HTTP POST /api/builds/{id}/logs
```

### Implementation Steps

#### Step 1: Replace SSH "Update Build State" with HTTP Request

**Remove:** SSH node that writes to JSONL

**Add:** HTTP Request node:
```
POST http://54.225.171.108:8000/api/builds
{
  "id": "{{ $('Set Build Info').item.json.buildId }}",
  "name": "{{ $('Set Build Info').item.json.prdFile.replace('.yaml', '').replace('.yml', '') }}",
  "status": "running",
  "phase": "claude_launched",
  "prd_id": null,
  "project_id": null
}
```

#### Step 2: Add Log Event Posting

After Claude launches, post log event:
```
POST http://54.225.171.108:8000/api/builds/{{ buildId }}/logs
{
  "event": "build_start",
  "phase": "claude_launched",
  "message": "Claude Code launched for MCP build",
  "level": "info",
  "metadata": {
    "prd_file": "{{ prdFile }}",
    "claude_pid": "{{ pid }}"
  }
}
```

#### Step 3: Have Claude Code Call API on Completion

When Claude finishes building, it should call:
```
POST /api/builds/{{ buildId }}/logs
{
  "event": "build_complete",
  "phase": "complete",
  "message": "MCP build completed successfully",
  "level": "info"
}
```

This will automatically update the build status to "success" (see builds.py:218-223).

---

## API Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/builds` | POST | Create new build |
| `/api/builds/{id}` | GET | Get build details |
| `/api/builds/{id}/logs` | POST | Add log entry (also updates status) |
| `/api/builds/{id}/logs` | GET | Get build logs |
| `/api/builds/current` | GET | Get running builds |
| `/api/builds/history` | GET | Get build history |
| `/api/analytics` | GET | Get analytics |

---

## Data Model

### Build Create (POST /api/builds)
```json
{
  "id": "string",      // Build ID (e.g., "windows-mcp-PRD-1767150575928")
  "name": "string",    // MCP name (e.g., "windows-mcp-PRD")
  "status": "running", // Initial status
  "phase": "string",   // Initial phase
  "prd_id": "string",  // Optional PRD reference
  "project_id": "string" // Optional project reference
}
```

### Log Create (POST /api/builds/{id}/logs)
```json
{
  "event": "string",      // Event type (build_start, phase_change, build_complete, build_error)
  "phase": "string",      // Current phase
  "message": "string",    // Log message
  "level": "info",        // Log level (debug, info, warning, error)
  "timestamp": "ISO8601", // Optional, defaults to now
  "metadata": {}          // Optional extra data
}
```

### Special Events

| Event | Effect |
|-------|--------|
| `build_complete` or `build_success` | Sets status="success", phase="complete", stopped_at=now |
| `build_error` or `build_failed` | Sets status="error", stopped_at=now |
| Any other event | Updates phase if provided |

---

## Testing Plan

1. **Update n8n workflow** with HTTP Request nodes
2. **Trigger test build** via dashboard PRD upload
3. **Verify database** has new build entry
4. **Check dashboard** displays correct data
5. **Verify analytics** updates with new build

---

## Cleanup

After implementing, consider:
- Removing JSONL file writing (or keep as backup)
- Removing `/home/ubuntu/projects/grimlock/build-logs/` stale files
- Updating `index.json` handling in migration service
