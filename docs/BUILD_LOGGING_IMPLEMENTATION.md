# GRIMLOCK Build Logging Implementation Guide

**Status:** Design Phase (Ready for Development)
**Last Updated:** 2025-12-30
**Author:** Claude Code Deployment Engineer

---

## Quick Reference

This document provides the complete technical specification for implementing real-time build logging in GRIMLOCK. It includes:

1. Data schemas (what gets logged)
2. File structure (where logs are stored)
3. Event emission API (how Claude Code writes logs)
4. n8n workflow designs (how logs become API responses)
5. Dashboard integration (how the UI consumes the data)

**Key Files:**
- Event stream: `/home/ubuntu/projects/grimlock/build-logs/events.jsonl`
- Build index: `/home/ubuntu/projects/grimlock/build-logs/builds.json`
- Per-build logs: `/home/ubuntu/projects/grimlock/build-logs/YYYY-MM-DD/{buildId}.jsonl`
- Helper code: `/home/ubuntu/projects/grimlock/src/build-logger.ts`
- Webhook workflows: `/home/ubuntu/projects/grimlock/n8n/build-logging-webhooks.json`

---

## Data Schemas

### BuildEvent Schema

Every event appended to logs follows this structure:

```typescript
interface BuildEvent {
  // Timestamp of when event occurred (ISO 8601 UTC)
  timestamp: string;

  // Unique build identifier
  // Format: {projectName}-{YYYYMMDD}-{sequence}
  // Example: "n8n-mcp-20251230-001"
  buildId: string;

  // What phase of the build is this event about?
  // Values: prd_uploaded | prd_reviewed | mcp_build_started | mcp_build_complete
  //         | test_suite_run | docs_generated | error_occurred | escalation | checkpoint
  phase: string;

  // Success/failure indicator
  // Values: "success" | "error" | "warning" | "info"
  status: "success" | "error" | "warning" | "info";

  // Phase-specific data (varies by phase)
  details: Record<string, any>;

  // Context label for grouping related events
  // Values: build_start | validation | build_execution | testing | completion
  //         | error_handling | escalation_handling
  context: string;

  // Optional: Only present if status === "error"
  error?: {
    code: string;           // Machine-readable error code
    message: string;        // Human-readable message
    stack?: string;         // Full stack trace
  };
}
```

### BuildSummary Schema

The `builds.json` index contains build summaries for quick querying:

```typescript
interface BuildSummary {
  buildId: string;           // "n8n-mcp-20251230-001"
  projectName: string;       // "n8n-mcp"
  projectPath: string;       // "/home/ubuntu/projects/mcp/n8n-mcp"
  startedAt: string;         // ISO 8601 timestamp
  completedAt: string | null; // Null if still running
  durationSeconds: number;   // Total build duration
  status: "running" | "success" | "failure" | "paused";
  prdFile: string;           // "prds/n8n-mcp-PRD.yaml"
  toolsImplemented: number;  // Number of tools completed
  testsWritten: number;      // Number of tests
  errors: string[];          // Error messages
  warnings: string[];        // Warning messages
  escalations: string[];     // Escalation summaries
}

interface BuildsIndex {
  builds: BuildSummary[];
  lastUpdated: string;       // ISO 8601 timestamp
  totalBuilds: number;
  successCount: number;
  failureCount: number;
}
```

---

## File Structure

```
/home/ubuntu/projects/grimlock/
│
├── build-logs/                          # ← NEW: Build event storage
│   ├── events.jsonl                     # Append-only event stream
│   │   # Each line is a complete JSON event
│   │   # Example content:
│   │   # {"timestamp":"2025-12-30T17:00:00Z","buildId":"n8n-mcp-20251230-001",...}
│   │   # {"timestamp":"2025-12-30T17:05:23Z","buildId":"n8n-mcp-20251230-001",...}
│   │
│   ├── builds.json                     # Index of all builds
│   │   # Structure:
│   │   # {
│   │   #   "builds": [{ buildId, projectName, status, ... }],
│   │   #   "stats": { totalBuilds, successCount, failureCount }
│   │   # }
│   │
│   └── YYYY-MM-DD/                     # Date-partitioned directories
│       ├── n8n-mcp-20251230-001.jsonl  # Per-build detailed log
│       ├── mcp-dyson-20251230-002.jsonl
│       └── ...
│
├── src/                                 # ← NEW: Build logging utilities
│   └── build-logger.ts                  # Event emission functions
│
├── n8n/                                 # n8n workflows
│   ├── build-logging-webhooks.json      # ← NEW: 4 webhook workflows
│   ├── workflow-exports/
│   │   ├── sprint-initiator.json
│   │   └── ...
│   └── README.md                        # ← NEW: Webhook documentation
│
├── dashboard/
│   ├── js/
│   │   ├── api.js                       # Already configured for endpoints
│   │   ├── app.js                       # Already configured for endpoints
│   │   └── ...
│   └── ...
│
└── ... (existing files)
```

---

## Event Emission API

### Module: `src/build-logger.ts`

This TypeScript module provides functions for emitting events. Import it in your build code:

```typescript
import {
  emitBuildEvent,
  updateBuildSummary,
  generateBuildId,
  readBuildSummary,
  readBuildEvents
} from './src/build-logger';
```

#### Function 1: emitBuildEvent()

Append an event to the log stream.

```typescript
function emitBuildEvent(event: BuildEvent): void

// Usage:
emitBuildEvent({
  timestamp: new Date().toISOString(),
  buildId: "n8n-mcp-20251230-001",
  phase: "prd_uploaded",
  status: "success",
  details: {
    prdFile: "prds/n8n-mcp-PRD.yaml",
    fileSize: 2048,
    validationResult: "pass"
  },
  context: "build_start"
});

// Result:
// - Appends 1 line to events.jsonl
// - Appends 1 line to YYYY-MM-DD/{buildId}.jsonl
```

#### Function 2: updateBuildSummary()

Create or update a build summary in the index.

```typescript
function updateBuildSummary(summary: BuildSummary): void

// Usage:
updateBuildSummary({
  buildId: "n8n-mcp-20251230-001",
  projectName: "n8n-mcp",
  projectPath: "/home/ubuntu/projects/mcp/n8n-mcp",
  startedAt: "2025-12-30T17:00:00Z",
  completedAt: "2025-12-30T18:45:00Z",
  durationSeconds: 6300,
  status: "success",
  prdFile: "prds/n8n-mcp-PRD.yaml",
  toolsImplemented: 16,
  testsWritten: 18,
  errors: [],
  warnings: [],
  escalations: []
});

// Result:
// - Updates builds.json with new/modified build summary
// - Recalculates stats (totalBuilds, successCount, failureCount)
```

#### Function 3: generateBuildId()

Create a unique build identifier.

```typescript
function generateBuildId(projectName: string): string

// Usage:
const buildId = generateBuildId("n8n-mcp");
// Returns: "n8n-mcp-20251230-001"

const buildId2 = generateBuildId("mcp-dyson-appliances");
// Returns: "mcp-dyson-appliances-20251230-002"
```

#### Function 4: readBuildSummary()

Read the complete builds.json index.

```typescript
function readBuildSummary(): BuildsIndex

// Usage:
const index = readBuildSummary();
console.log(index.totalBuilds);      // 4
console.log(index.successCount);     // 3
console.log(index.builds[0].projectName);  // "n8n-mcp"
```

#### Function 5: readBuildEvents()

Read all events for a specific build.

```typescript
function readBuildEvents(buildId: string): BuildEvent[]

// Usage:
const events = readBuildEvents("n8n-mcp-20251230-001");
events.forEach(event => {
  console.log(`${event.timestamp} - ${event.phase}: ${event.status}`);
});
```

---

## Integration Points in Claude Code

### 1. Sprint Initialization

When `/grimlock start` is invoked:

```typescript
// In sprint-initiator workflow handler
async function initiateSprint(prdFile: string) {
  const buildId = generateBuildId(getProjectName(prdFile));

  // Emit: PRD uploaded
  emitBuildEvent({
    timestamp: new Date().toISOString(),
    buildId,
    phase: "prd_uploaded",
    status: "success",
    details: {
      prdFile,
      fileSize: fs.statSync(prdFile).size
    },
    context: "build_start"
  });

  // Emit: PRD reviewed
  await validatePRD(prdFile);
  emitBuildEvent({
    timestamp: new Date().toISOString(),
    buildId,
    phase: "prd_reviewed",
    status: "success",
    details: {
      validationResult: "pass",
      issuesFound: 0
    },
    context: "validation"
  });

  // Create initial summary
  updateBuildSummary({
    buildId,
    projectName: getProjectName(prdFile),
    projectPath: getProjectPath(prdFile),
    startedAt: new Date().toISOString(),
    completedAt: null,
    durationSeconds: 0,
    status: "running",
    prdFile,
    toolsImplemented: 0,
    testsWritten: 0,
    errors: [],
    warnings: [],
    escalations: []
  });
}
```

### 2. During Build Execution

Every time a milestone or task completes:

```typescript
// In milestone handler
async function completeMilestone(buildId: string, milestoneInfo: any) {
  emitBuildEvent({
    timestamp: new Date().toISOString(),
    buildId,
    phase: "mcp_build_started",
    status: "success",
    details: {
      milestoneName: milestoneInfo.name,
      tasksCompleted: milestoneInfo.completedTasks,
      tasksTotal: milestoneInfo.totalTasks,
      estimatedProgress: (milestoneInfo.completedTasks / milestoneInfo.totalTasks) * 100
    },
    context: "build_execution"
  });
}

// Per-tool progress
async function implementTool(buildId: string, toolName: string, toolIndex: number, totalTools: number) {
  try {
    await generateToolCode(toolName);
    emitBuildEvent({
      timestamp: new Date().toISOString(),
      buildId,
      phase: "tool_implementation",
      status: "success",
      details: {
        toolName,
        toolIndex,
        totalTools,
        percentProgress: (toolIndex / totalTools) * 100
      },
      context: "build_execution"
    });
  } catch (error) {
    emitBuildEvent({
      timestamp: new Date().toISOString(),
      buildId,
      phase: "error_occurred",
      status: "error",
      details: {
        failedTask: `Implement ${toolName}`,
        phase: "Tool Implementation"
      },
      error: {
        code: "TOOL_IMPL_FAILED",
        message: `Failed to implement ${toolName}: ${error.message}`,
        stack: error.stack
      },
      context: "error_handling"
    });
  }
}
```

### 3. Build Completion

When all milestones are complete:

```typescript
// In sprint completion handler
async function completeSprint(buildId: string, results: any) {
  emitBuildEvent({
    timestamp: new Date().toISOString(),
    buildId,
    phase: "mcp_build_complete",
    status: "success",
    details: {
      toolsImplemented: results.toolCount,
      testsWritten: results.testCount,
      docsGenerated: results.hasDocs,
      successCriteriaPass: results.criteriaPass,
      successCriteriaFail: results.criteriaFail
    },
    context: "build_complete"
  });

  // Update summary with final state
  const startTime = new Date(GRIMLOCK_STATE.sprint.started_at);
  const endTime = new Date();
  const durationSeconds = Math.floor((endTime - startTime) / 1000);

  updateBuildSummary({
    buildId,
    projectName: GRIMLOCK_STATE.sprint.project_name,
    projectPath: GRIMLOCK_STATE.sprint.project_path,
    startedAt: GRIMLOCK_STATE.sprint.started_at,
    completedAt: endTime.toISOString(),
    durationSeconds,
    status: "success",
    prdFile: GRIMLOCK_STATE.sprint.prd_file,
    toolsImplemented: results.toolCount,
    testsWritten: results.testCount,
    errors: results.errors,
    warnings: results.warnings,
    escalations: results.escalations
  });
}
```

---

## n8n Webhook Workflows

### Overview

Four webhook workflows expose build logs as REST API endpoints:

| Endpoint | Purpose | Response Time |
|----------|---------|----------------|
| `/grimlock/build-status` | Current running build | <100ms |
| `/grimlock/build-history` | All builds summary | <500ms |
| `/grimlock/analytics` | 7-day trends + MCP stats | <1s |
| `/grimlock/build-details` | Full execution trace | <500ms |

### Workflow 1: Build Status

**Path:** `/grimlock/build-status`
**Method:** GET
**Purpose:** Return the currently running build

**n8n Configuration:**

```
Trigger: Webhook (GET /grimlock/build-status)
  │
  ├─→ Read files (Read builds.json)
  │
  ├─→ Function: Extract Latest Build
  │   Code:
  │   const builds = $input.all()[0].json.builds;
  │   const running = builds.find(b => b.status === 'running');
  │   if (!running) {
  │     return { currentBuild: null, note: "No build running" };
  │   }
  │   return {
  │     currentBuild: running,
  │     elapsedSeconds: Math.floor((Date.now() - new Date(running.startedAt)) / 1000)
  │   };
  │
  └─→ Respond to Webhook
      {
        "currentBuild": {
          "buildId": "...",
          "projectName": "...",
          "status": "running",
          "startedAt": "...",
          "elapsedSeconds": 3600,
          "progress": {
            "toolsCompleted": 10,
            "toolsTotal": 16,
            "percentComplete": 62.5
          }
        }
      }
```

### Workflow 2: Build History

**Path:** `/grimlock/build-history`
**Method:** GET
**Purpose:** Return all builds with stats

**n8n Configuration:**

```
Trigger: Webhook (GET /grimlock/build-history)
  │
  ├─→ Read files (Read builds.json)
  │
  ├─→ Function: Format Response
  │   Code:
  │   const data = $input.all()[0].json;
  │   return {
  │     builds: data.builds.sort((a, b) =>
  │       new Date(b.startedAt) - new Date(a.startedAt)
  │     ),
  │     stats: {
  │       totalBuilds: data.totalBuilds,
  │       successCount: data.successCount,
  │       failureCount: data.failureCount,
  │       successRate: `${((data.successCount / data.totalBuilds) * 100).toFixed(1)}%`,
  │       avgDurationMinutes: (
  │         data.builds.reduce((sum, b) => sum + (b.durationSeconds || 0), 0) /
  │         data.builds.length / 60
  │       ).toFixed(1)
  │     }
  │   };
  │
  └─→ Respond to Webhook
      {
        "builds": [...],
        "stats": {
          "totalBuilds": 4,
          "successCount": 3,
          "failureCount": 1,
          "successRate": "75.0%",
          "avgDurationMinutes": "105.0"
        }
      }
```

### Workflow 3: Analytics

**Path:** `/grimlock/analytics`
**Method:** GET
**Purpose:** Return 7-day activity and MCP frequency stats

**n8n Configuration:**

```
Trigger: Webhook (GET /grimlock/analytics)
  │
  ├─→ Read files (Read events.jsonl)
  │
  ├─→ Function: Parse JSONL
  │   Code:
  │   const fileContent = $input.all()[0].json.data;
  │   return fileContent
  │     .split('\n')
  │     .filter(line => line.trim())
  │     .map(line => JSON.parse(line));
  │
  ├─→ Function: 7-Day Activity
  │   Code:
  │   const events = $input.all();
  │   const now = new Date();
  │   const last7Days = [];
  │   for (let i = 6; i >= 0; i--) {
  │     const date = new Date(now);
  │     date.setDate(date.getDate() - i);
  │     const dateStr = date.toISOString().split('T')[0];
  │     const count = events.filter(e =>
  │       e.timestamp.startsWith(dateStr) && e.phase === 'mcp_build_complete'
  │     ).length;
  │     last7Days.push({ date: dateStr, buildCount: count });
  │   }
  │   return { buildActivity: { last7Days } };
  │
  ├─→ Function: Most Built MCPs
  │   Code:
  │   const builds = $input.all();
  │   const counts = {};
  │   builds.forEach(b => {
  │     if (b.phase === 'mcp_build_complete') {
  │       const match = b.details.projectPath?.match(/mcp-([^/]+)/);
  │       if (match) {
  │         counts[match[1]] = (counts[match[1]] || 0) + 1;
  │       }
  │     }
  │   });
  │   return {
  │     mostBuiltMCPs: Object.entries(counts)
  │       .map(([name, count]) => ({ projectName: name, buildCount: count }))
  │       .sort((a, b) => b.buildCount - a.buildCount)
  │       .slice(0, 10)
  │   };
  │
  └─→ Respond to Webhook
      {
        "buildActivity": {
          "last7Days": [
            { "date": "2025-12-24", "buildCount": 1 },
            { "date": "2025-12-25", "buildCount": 0 },
            ...
          ]
        },
        "mostBuiltMCPs": [
          { "projectName": "n8n-mcp", "buildCount": 2 },
          { "projectName": "mcp-philips-hue", "buildCount": 1 }
        ]
      }
```

### Workflow 4: Build Details

**Path:** `/grimlock/build-details`
**Parameters:** `buildId` (query parameter)
**Method:** GET
**Purpose:** Return detailed execution trace for a single build

**n8n Configuration:**

```
Trigger: Webhook (GET /grimlock/build-details)
  │
  ├─→ Read Parameter: buildId
  │   const buildId = $request.url.split('buildId=')[1];
  │
  ├─→ Read files (Read build log: build-logs/YYYY-MM-DD/{buildId}.jsonl)
  │
  ├─→ Function: Parse and Format
  │   Code:
  │   const fileContent = $input.all()[0].json.data;
  │   const events = fileContent
  │     .split('\n')
  │     .filter(line => line.trim())
  │     .map(line => JSON.parse(line));
  │
  │   return {
  │     buildId: events[0].buildId,
  │     timeline: events.map(e => ({
  │       timestamp: e.timestamp,
  │       phase: e.phase,
  │       status: e.status,
  │       details: e.details
  │     })),
  │     summary: {
  │       totalEvents: events.length,
  │       successCount: events.filter(e => e.status === 'success').length,
  │       errorCount: events.filter(e => e.status === 'error').length,
  │       duration: events.length > 1 ?
  │         new Date(events[events.length - 1].timestamp) -
  │         new Date(events[0].timestamp) : 0
  │     }
  │   };
  │
  └─→ Respond to Webhook
      {
        "buildId": "n8n-mcp-20251230-001",
        "timeline": [
          { "timestamp": "...", "phase": "prd_uploaded", "status": "success" },
          { "timestamp": "...", "phase": "prd_reviewed", "status": "success" },
          ...
        ],
        "summary": {
          "totalEvents": 42,
          "successCount": 40,
          "errorCount": 0,
          "duration": 6300000
        }
      }
```

---

## Dashboard Integration

The dashboard JavaScript is already configured to call these endpoints. In `dashboard/js/api.js`:

```javascript
const ENDPOINTS = {
  BUILD_STATUS: '/grimlock/build-status',
  BUILD_HISTORY: '/grimlock/build-history',
  BUILD_DETAILS: '/grimlock/build-details',
  ANALYTICS: '/grimlock/analytics'
};

const POLLING_INTERVALS = {
  [ENDPOINTS.BUILD_STATUS]: 30000,     // 30 seconds
  [ENDPOINTS.BUILD_HISTORY]: 60000,    // 60 seconds
  [ENDPOINTS.ANALYTICS]: 120000        // 2 minutes
};
```

The dashboard will:
1. **Render Build Activity Chart** from `/grimlock/analytics` response
2. **Render Most Built MCPs** from `/grimlock/analytics` response
3. **Display Current Build Status** from `/grimlock/build-status` response
4. **Show Build History Table** from `/grimlock/build-history` response

No changes required to dashboard code - it's already built for these endpoints.

---

## Testing Checklist

### Phase 1: Directory Setup
- [ ] Create `/home/ubuntu/projects/grimlock/build-logs/` directory
- [ ] Create empty `events.jsonl` file
- [ ] Create template `builds.json` file
- [ ] Verify write permissions on all files

### Phase 2: Event Logging
- [ ] Copy `build-logger.ts` to `/home/ubuntu/projects/grimlock/src/`
- [ ] Manually emit test event with `emitBuildEvent()`
- [ ] Verify event appears in `events.jsonl`
- [ ] Verify per-build log created in `YYYY-MM-DD/` directory
- [ ] Parse JSONL with `cat events.jsonl | jq '.'`

### Phase 3: Build Summary
- [ ] Call `updateBuildSummary()` with test data
- [ ] Verify `builds.json` updated correctly
- [ ] Verify stats recalculated (totalBuilds, etc.)
- [ ] Test with multiple builds in index

### Phase 4: n8n Webhooks
- [ ] Deploy `/grimlock/build-status` workflow
- [ ] Test with `curl` - get valid JSON response
- [ ] Deploy `/grimlock/build-history` workflow
- [ ] Test with `curl` - get valid JSON response
- [ ] Deploy `/grimlock/analytics` workflow
- [ ] Test with `curl` - get valid JSON response
- [ ] Deploy `/grimlock/build-details` workflow with buildId param
- [ ] Test with `curl` - get valid JSON response

### Phase 5: Dashboard
- [ ] Open dashboard at https://grimlock-dashboard.netlify.app
- [ ] Verify Build Activity chart appears
- [ ] Verify Most Built MCPs chart appears
- [ ] Verify real data displays (not mock data)
- [ ] Wait 30s, verify current build status updates
- [ ] Wait 60s, verify build history table updates

### Phase 6: End-to-End
- [ ] Start a real sprint with `/grimlock start`
- [ ] Monitor events.jsonl - should see events appearing
- [ ] Check dashboard - should show current build
- [ ] When build completes, check builds.json
- [ ] Verify analytics endpoint returns 7-day data

---

## Performance Considerations

**Event Emission:** O(1) - Just filesystem append, ~1ms per event

**Build History Query:** O(n builds) - Linear scan of builds.json, ~50ms for 100 builds

**Analytics Query:** O(n events) - Must parse all events for 7-day aggregation, ~500ms-1s for 1000+ events

**Optimization:** If analytics becomes slow, add:
- Daily aggregation file (pre-calculated daily stats)
- In-memory cache in n8n (30-second TTL)
- Dedicated analytics collection (separate from event stream)

---

## Error Handling

### Event Emission Failures

If `emitBuildEvent()` fails:
1. Log error to console
2. Continue build (non-blocking)
3. Emit `error_occurred` event with error details
4. Escalate to dashboard notification

```typescript
try {
  emitBuildEvent(event);
} catch (error) {
  console.error('Failed to emit event:', error);
  // Continue build, don't block
  emitBuildEvent({
    timestamp: new Date().toISOString(),
    buildId,
    phase: 'error_occurred',
    status: 'error',
    details: { failedTask: 'Event emission', phase: 'Logging' },
    error: {
      code: 'LOG_EMISSION_FAILED',
      message: error.message
    },
    context: 'error_handling'
  });
}
```

### Webhook Failures

If n8n webhook endpoint is down:
1. Dashboard caches previous response (TTL 30s)
2. Shows "Last updated: X seconds ago" label
3. Retries with exponential backoff

```javascript
// In dashboard/js/api.js
async fetchWithCache(endpoint) {
  try {
    const response = await fetch(this.getUrl(endpoint));
    cache.set(endpoint, response, POLLING_INTERVALS[endpoint]);
    return response;
  } catch (error) {
    const cached = cache.get(endpoint);
    if (cached) {
      return cached; // Return stale data
    }
    throw error;
  }
}
```

---

## Maintenance

### Log Cleanup

After 90 days, archive old logs:

```bash
# Archive logs older than 90 days
find /home/ubuntu/projects/grimlock/build-logs -type d -mtime +90 -exec tar -czf {}.tar.gz {} \;
find /home/ubuntu/projects/grimlock/build-logs -type d -mtime +90 -exec rm -rf {} \;
```

### Index Rebuild

If `builds.json` gets corrupted, rebuild from events:

```typescript
function rebuildBuildIndex(): void {
  const events = fs.readFileSync(EVENTS_LOG, 'utf-8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));

  const builds: Record<string, BuildSummary> = {};

  events.forEach(event => {
    if (!builds[event.buildId]) {
      builds[event.buildId] = {
        buildId: event.buildId,
        projectName: event.details.projectName || 'unknown',
        status: 'running',
        errors: [],
        warnings: [],
        escalations: []
      };
    }

    if (event.phase === 'mcp_build_complete') {
      builds[event.buildId].status = event.status === 'success' ? 'success' : 'failure';
      builds[event.buildId].completedAt = event.timestamp;
      Object.assign(builds[event.buildId], event.details);
    }
  });

  const index: BuildsIndex = {
    builds: Object.values(builds),
    lastUpdated: new Date().toISOString(),
    totalBuilds: Object.keys(builds).length,
    successCount: Object.values(builds).filter(b => b.status === 'success').length,
    failureCount: Object.values(builds).filter(b => b.status === 'failure').length
  };

  fs.writeFileSync(BUILDS_INDEX, JSON.stringify(index, null, 2));
}
```

---

## Appendix: Full build-logger.ts Implementation

```typescript
/**
 * GRIMLOCK Build Logger
 * Handles event emission and storage for build logging
 */

import * as fs from 'fs';
import * as path from 'path';

const LOGS_DIR = '/home/ubuntu/projects/grimlock/build-logs';
const EVENTS_LOG = path.join(LOGS_DIR, 'events.jsonl');
const BUILDS_INDEX = path.join(LOGS_DIR, 'builds.json');

export interface BuildEvent {
  timestamp: string;
  buildId: string;
  phase: string;
  status: 'success' | 'error' | 'warning' | 'info';
  details: Record<string, any>;
  context: string;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
}

export interface BuildSummary {
  buildId: string;
  projectName: string;
  projectPath: string;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number;
  status: 'running' | 'success' | 'failure' | 'paused';
  prdFile: string;
  toolsImplemented: number;
  testsWritten: number;
  errors: string[];
  warnings: string[];
  escalations: string[];
}

export interface BuildsIndex {
  builds: BuildSummary[];
  lastUpdated: string;
  totalBuilds: number;
  successCount: number;
  failureCount: number;
}

/**
 * Emit a build event to both global and per-build logs
 */
export function emitBuildEvent(event: BuildEvent): void {
  ensureLogsDirectory();

  // Append to global event stream
  fs.appendFileSync(EVENTS_LOG, JSON.stringify(event) + '\n');

  // Append to per-build log
  const dateDir = event.timestamp.split('T')[0];
  const dayDir = path.join(LOGS_DIR, dateDir);

  if (!fs.existsSync(dayDir)) {
    fs.mkdirSync(dayDir, { recursive: true });
  }

  const buildLogPath = path.join(dayDir, `${event.buildId}.jsonl`);
  fs.appendFileSync(buildLogPath, JSON.stringify(event) + '\n');
}

/**
 * Update or create a build summary in the index
 */
export function updateBuildSummary(summary: BuildSummary): void {
  ensureLogsDirectory();

  let index: BuildsIndex = {
    builds: [],
    lastUpdated: new Date().toISOString(),
    totalBuilds: 0,
    successCount: 0,
    failureCount: 0
  };

  if (fs.existsSync(BUILDS_INDEX)) {
    try {
      index = JSON.parse(fs.readFileSync(BUILDS_INDEX, 'utf-8'));
    } catch {
      // If file is corrupted, start fresh
      index = {
        builds: [],
        lastUpdated: new Date().toISOString(),
        totalBuilds: 0,
        successCount: 0,
        failureCount: 0
      };
    }
  }

  // Update or insert build
  const existingIndex = index.builds.findIndex(b => b.buildId === summary.buildId);
  if (existingIndex >= 0) {
    index.builds[existingIndex] = summary;
  } else {
    index.builds.push(summary);
  }

  // Recalculate stats
  index.totalBuilds = index.builds.length;
  index.successCount = index.builds.filter(b => b.status === 'success').length;
  index.failureCount = index.builds.filter(b => b.status === 'failure').length;
  index.lastUpdated = new Date().toISOString();

  fs.writeFileSync(BUILDS_INDEX, JSON.stringify(index, null, 2));
}

/**
 * Generate a unique build ID
 */
export function generateBuildId(projectName: string): string {
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const sequence = Date.now().toString().slice(-3);
  return `${projectName}-${dateStr}-${sequence}`;
}

/**
 * Read the complete builds index
 */
export function readBuildSummary(): BuildsIndex {
  if (!fs.existsSync(BUILDS_INDEX)) {
    return {
      builds: [],
      lastUpdated: new Date().toISOString(),
      totalBuilds: 0,
      successCount: 0,
      failureCount: 0
    };
  }

  return JSON.parse(fs.readFileSync(BUILDS_INDEX, 'utf-8'));
}

/**
 * Read all events for a specific build
 */
export function readBuildEvents(buildId: string): BuildEvent[] {
  const lines = fs.readFileSync(EVENTS_LOG, 'utf-8')
    .split('\n')
    .filter(line => line.trim());

  return lines
    .map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((event): event is BuildEvent => event !== null && event.buildId === buildId);
}

/**
 * Ensure logs directory and files exist
 */
function ensureLogsDirectory(): void {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }

  if (!fs.existsSync(EVENTS_LOG)) {
    fs.writeFileSync(EVENTS_LOG, '');
  }

  if (!fs.existsSync(BUILDS_INDEX)) {
    const emptyIndex: BuildsIndex = {
      builds: [],
      lastUpdated: new Date().toISOString(),
      totalBuilds: 0,
      successCount: 0,
      failureCount: 0
    };
    fs.writeFileSync(BUILDS_INDEX, JSON.stringify(emptyIndex, null, 2));
  }
}
```

---

**Document Status:** COMPLETE - Ready for Development
**Last Updated:** 2025-12-30
