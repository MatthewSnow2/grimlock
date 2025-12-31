# GRIMLOCK Build Logging Architecture - Visual Guide

**Status:** Design Reference
**Last Updated:** 2025-12-30

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────────┘

                              PHASE 1: CAPTURE
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Claude Code on EC2                                                          │
│ ────────────────────────────────────────────────────────────────────────    │
│                                                                             │
│  During Sprint Execution:                                                  │
│  • PRD uploaded → emit event                                               │
│  • PRD reviewed → emit event                                               │
│  • Build started → emit event                                              │
│  • Tool 1 implemented → emit event                                          │
│  • Tool 2 implemented → emit event                                          │
│  • ... (up to 16 tools)                                                    │
│  • All tests pass → emit event                                              │
│  • Build completed → emit event                                             │
│                                                                             │
│ Using: emitBuildEvent({...})  from build-logger.ts                         │
└────────────────────┬──────────────────────────────────────────────────────┘
                     │ Write JSON event line
                     │ (1 event = 1 JSON line)
                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Build Log Storage (EC2 Filesystem)                                         │
│ ────────────────────────────────────────────────────────────────────────    │
│ /home/ubuntu/projects/grimlock/build-logs/                                │
│                                                                             │
│ ├─ events.jsonl ←──── Global event stream (all builds, all time)          │
│ │  └─ Line 1: {"buildId":"n8n-mcp-20251230-001","phase":"prd_uploaded"...│
│ │  └─ Line 2: {"buildId":"n8n-mcp-20251230-001","phase":"prd_reviewed"...│
│ │  └─ Line 3: {"buildId":"n8n-mcp-20251230-001","phase":"mcp_build_start" │
│ │  └─ ... (more events)                                                   │
│ │                                                                          │
│ ├─ builds.json ←────── Index of all builds (for fast queries)            │
│ │  └─ {                                                                   │
│ │      "builds": [                                                        │
│ │        { "buildId": "...", "projectName": "...", "status": "...", ... }│
│ │      ],                                                                 │
│ │      "stats": { "totalBuilds": 4, "successCount": 3, ... }             │
│ │    }                                                                    │
│ │                                                                          │
│ └─ 2025-12-30/ ←────── Date-partitioned detailed logs                     │
│    ├─ n8n-mcp-20251230-001.jsonl (per-build detailed trace)              │
│    ├─ mcp-dyson-20251230-002.jsonl                                        │
│    └─ ...                                                                  │
│                                                                             │
└────────────────────┬──────────────────────────────────────────────────────┘
                     │
                     │ n8n reads logs
                     ▼
                              PHASE 2: TRANSFORM

┌─────────────────────────────────────────────────────────────────────────────┐
│ n8n Workflows (API Layer)                                                   │
│ ────────────────────────────────────────────────────────────────────────    │
│                                                                             │
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │ Workflow: Build Status Webhook                                       │  │
│ │ Path: /grimlock/build-status                                         │  │
│ │ Response: Current running build                                      │  │
│ │ Speed: <100ms (just find running build)                              │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │ Workflow: Build History Webhook                                      │  │
│ │ Path: /grimlock/build-history                                        │  │
│ │ Response: All builds + stats                                         │  │
│ │ Speed: <500ms (scan all builds)                                      │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │ Workflow: Analytics Webhook                                          │  │
│ │ Path: /grimlock/analytics                                            │  │
│ │ Response: 7-day activity + MCP frequency                             │  │
│ │ Speed: <1s (aggregate all events)                                    │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │ Workflow: Build Details Webhook                                      │  │
│ │ Path: /grimlock/build-details?buildId={id}                           │  │
│ │ Response: Full execution trace for 1 build                           │  │
│ │ Speed: <500ms (read single build log file)                           │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└────────────────────┬──────────────────────────────────────────────────────┘
                     │
                     │ HTTP JSON response
                     ▼
                              PHASE 3: DISPLAY

┌─────────────────────────────────────────────────────────────────────────────┐
│ Dashboard (Netlify - Static SPA)                                            │
│ ────────────────────────────────────────────────────────────────────────    │
│ https://grimlock-dashboard.netlify.app                                    │
│                                                                             │
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │ Component: Build Activity Chart                                      │  │
│ │ • Bar chart with 7 days                                              │  │
│ │ • Updates every 2 minutes (from /grimlock/analytics)                 │  │
│ │ • Shows builds-per-day trend                                         │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │ Component: Most Built MCPs Chart                                     │  │
│ │ • Horizontal bar chart with frequency                                │  │
│ │ • Updates every 2 minutes (from /grimlock/analytics)                 │  │
│ │ • Shows top 10 MCPs by build count                                   │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │ Component: Current Build Status Card                                 │  │
│ │ • "Building n8n-mcp (62.5% complete)"                                │  │
│ │ • Updates every 30 seconds (from /grimlock/build-status)             │  │
│ │ • Shows progress bar & elapsed time                                  │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │ Component: Build History Table                                       │  │
│ │ • All completed builds, sorted by date                               │  │
│ │ • Updates every 60 seconds (from /grimlock/build-history)            │  │
│ │ • Click to view detailed timeline                                    │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Event Flow Timeline

```
Build Execution Timeline
═════════════════════════════════════════════════════════════════════════════

Time    Event                          Logged To                  Webhook Updated
────    ─────                          ───────────                ───────────────

17:00   Sprint Started                 events.jsonl (line 1)      build-status ✓
        buildId generated               builds.json created       build-history ✓

17:05   PRD Validated                  events.jsonl (line 2)      build-status ✓

17:10   MCP Build Started              events.jsonl (line 3)      build-status ✓

17:15   Tool 1 Implemented             events.jsonl (line 4)      build-status ✓
        Progress: 1/16 tools                                       analytics ✓

17:20   Tool 2 Implemented             events.jsonl (line 5)      build-status ✓
        Progress: 2/16 tools                                       (cached until 17:22)

...     (10 more tools)                ...                         ...

18:30   All Tools Implemented          events.jsonl (line 15)     build-status ✓
        Progress: 16/16 tools                                      build-history ✓

18:40   All Tests Pass                 events.jsonl (line 16)     build-status ✓

18:45   Build Complete (Success)       events.jsonl (line 17)     build-status ✓
        builds.json updated            builds.json updated        build-history ✓
        per-build log finalized        /2025-12-30/*.jsonl        analytics ✓ (refresh)

        Total Duration: 1h 45m (6300 seconds)

Dashboard Polling
═════════════════════════════════════════════════════════════════════════════

Endpoint               Interval    First Call      Subsequent Calls
────────────          ────────    ──────────      ──────────────────
/build-status         30s         17:00           17:30, 18:00, 18:30, 18:45, 19:15...
/build-history        60s         17:00           18:00, 19:00, ...
/analytics            2min        17:00           17:02, 17:04, 17:06, ..., 18:46...
/build-details        On click    (user action)   Fetch full timeline
```

---

## Data Schema Relationships

```
Builds Index (builds.json)
═════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────┐
│ Build #1: n8n-mcp-20251230-001         │
├─────────────────────────────────────────┤
│ buildId: "n8n-mcp-20251230-001"        │
│ projectName: "n8n-mcp"                 │
│ status: "success"                      │
│ startedAt: "2025-12-30T17:00:00Z"      │
│ completedAt: "2025-12-30T18:45:00Z"    │
│ durationSeconds: 6300                  │
│ toolsImplemented: 16                   │
│ testsWritten: 18                       │
│                                        │
│  └─ Points to detailed log:            │
│     build-logs/2025-12-30/             │
│     n8n-mcp-20251230-001.jsonl         │
└─────────────────────────────────────────┘

Event Stream (events.jsonl)
═════════════════════════════════════════════════════════════════════════════

All builds concatenated in chronological order:

┌─────────────────────────────────────────┐
│ Event: PRD Uploaded                     │
│ buildId: "n8n-mcp-20251230-001"        │ ──→ Cross-reference
│ timestamp: "2025-12-30T17:00:00Z"      │    to Build #1
│ phase: "prd_uploaded"                  │
│ status: "success"                      │
│ details: { prdFile: "...", ... }       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Event: PRD Reviewed                     │
│ buildId: "n8n-mcp-20251230-001"        │ ──→ Cross-reference
│ timestamp: "2025-12-30T17:05:23Z"      │    to Build #1
│ phase: "prd_reviewed"                  │
│ status: "success"                      │
│ details: { validationResult: "pass" }  │
└─────────────────────────────────────────┘

... (more events) ...

Per-Build Detailed Log (2025-12-30/n8n-mcp-20251230-001.jsonl)
═════════════════════════════════════════════════════════════════════════════

Extracted from events.jsonl, filtered to single buildId:

┌─────────────────────────────────────────┐
│ Event: Tool Implementation Progress     │
│ buildId: "n8n-mcp-20251230-001"        │
│ timestamp: "2025-12-30T17:20:00Z"      │
│ phase: "tool_implementation"           │
│ status: "success"                      │
│ details:                                │
│   toolName: "list_workflows"           │
│   toolIndex: 3                         │
│   totalTools: 16                       │
│   percentProgress: 18.75               │
└─────────────────────────────────────────┘

... (more events for this build) ...
```

---

## File I/O Operations

```
Event Emission (1 event)
═════════════════════════════════════════════════════════════════════════════

emitBuildEvent({
  timestamp: "2025-12-30T17:20:00Z",
  buildId: "n8n-mcp-20251230-001",
  phase: "tool_implementation",
  status: "success",
  details: { ... },
  context: "build_execution"
})

    ↓ (serialized to JSON string)

    "{\"timestamp\":\"2025-12-30T17:20:00Z\",\"buildId\":\"n8n-mcp-20251230-001\",...}"

    ├─→ Append to events.jsonl
    │   fs.appendFileSync(EVENTS_LOG, json + '\n')
    │   Size: ~500 bytes per event
    │   Operation: O(1) - just filesystem append
    │
    └─→ Append to per-build log
        fs.appendFileSync(build-logs/2025-12-30/n8n-mcp-20251230-001.jsonl, json + '\n')
        Size: ~500 bytes per event
        Operation: O(1) - just filesystem append


Build Summary Update (1 build)
═════════════════════════════════════════════════════════════════════════════

updateBuildSummary({
  buildId: "n8n-mcp-20251230-001",
  projectName: "n8n-mcp",
  status: "success",
  toolsImplemented: 16,
  testsWritten: 18,
  ...
})

    ↓ (read entire builds.json)

    fs.readFileSync(BUILDS_INDEX, 'utf-8')
    → JSON.parse() → Array of 100 builds
    Size: ~50 KB file

    ↓ (find & update)

    builds.find(b => b.buildId === "n8n-mcp-20251230-001")
    builds[i] = newSummary
    recalculate stats

    ↓ (write entire file back)

    fs.writeFileSync(BUILDS_INDEX, JSON.stringify(builds))
    Operation: O(n) - must rewrite all builds
    Acceptable for <10,000 builds


Webhook Response: Build Status (cache-friendly)
═════════════════════════════════════════════════════════════════════════════

GET /grimlock/build-status
    ↓
    Read builds.json (~50 KB)
    ↓
    Find builds.find(b => b.status === 'running')
    ↓
    Return JSON (< 2 KB)
    ↓
    HTTP 200 OK

Cache: 30 seconds (very fast, refresh every 30s)


Webhook Response: Analytics (heavier query)
═════════════════════════════════════════════════════════════════════════════

GET /grimlock/analytics
    ↓
    Read events.jsonl (all events, ~10 MB for 1 year)
    ↓
    Parse JSONL line-by-line
    ↓
    Filter last 7 days (most events)
    ↓
    Group by date
    ↓
    Count per date
    ↓
    Aggregate MCP frequency
    ↓
    Return JSON (< 5 KB)
    ↓
    HTTP 200 OK

Cache: 2 minutes (slower, refresh less often)
Optimization: Could add daily aggregation file to avoid parsing all events
```

---

## Query Patterns

```
Query: "What's the current build status?"
═════════════════════════════════════════════════════════════════════════════

builds.json → find(status === 'running') → Return 1 object

Complexity: O(n) where n = total builds
Speed: <100ms (n < 100)
Cached: 30 seconds


Query: "Show me all builds this week"
═════════════════════════════════════════════════════════════════════════════

builds.json → filter(startedAt >= lastWeek) → Return array

Complexity: O(n) where n = total builds
Speed: <500ms (n < 1000)
Cached: 60 seconds


Query: "Show build activity for last 7 days"
═════════════════════════════════════════════════════════════════════════════

events.jsonl (scan all lines) → filter(timestamp >= 7 days ago)
                             → filter(phase === 'mcp_build_complete')
                             → group by date
                             → count

Complexity: O(m) where m = total events across all time
Speed: <1s (m < 10,000)
Cached: 2 minutes
Optimization: Add daily aggregation cache


Query: "What happened during build n8n-mcp-20251230-001?"
═════════════════════════════════════════════════════════════════════════════

2025-12-30/n8n-mcp-20251230-001.jsonl → parse all lines
                                      → return array of events

Complexity: O(k) where k = events in single build
Speed: <500ms (k < 100)
Cached: 60 seconds


Query: "Which MCPs are most frequently built?"
═════════════════════════════════════════════════════════════════════════════

events.jsonl → filter(phase === 'mcp_build_complete')
            → extract projectName from each
            → count by projectName
            → sort descending
            → return top 10

Complexity: O(m) where m = total events
Speed: <1s (m < 10,000)
Cached: 2 minutes
```

---

## Scaling Considerations

```
Current Capacity
═════════════════════════════════════════════════════════════════════════════

Assumption: 1-2 builds per week

Daily Storage:
• events.jsonl: ~20 KB/day (40 events × 500 bytes)
• builds.json: Updated in-place, minimal growth
• Per-build log: ~20 KB for one build

Weekly: ~140 KB
Yearly: ~7.3 MB

File Sizes at Year 1:
• events.jsonl: ~7.3 MB (grows linearly)
• builds.json: ~50 KB (bounded)
• Date partitions: 52 directories × 20 KB = ~1 MB

Query Performance:
• build-status: <100ms (fixed)
• build-history: <500ms (fixed, bounded queries)
• analytics: <1s (reads all events, acceptable)
• build-details: <500ms (fixed per build)


At 10x Scale (10-20 builds per week)
═════════════════════════════════════════════════════════════════════════════

Annual Events: ~25,000
events.jsonl: ~73 MB
Query Performance:
• analytics: ~5-10s (now slower, may need optimization)

Optimization Needed:
• Add daily aggregation file (1 line per day)
• analytics reads daily file instead of all events
• Performance restored to <1s


At 100x Scale (100-200 builds per week)
═════════════════════════════════════════════════════════════════════════════

Annual Events: ~250,000
events.jsonl: ~730 MB
Query Performance:
• build-history: Slow (>1s to scan all builds)
• build-details: Slow if querying historical build

Optimization Needed:
• Implement pagination in build-history
• Add database indexes (move to PostgreSQL)
• Archive old events (>1 year)
• Implement Elasticsearch for full-text search


Recommendation
═════════════════════════════════════════════════════════════════════════════

Current design (file-based) is optimal for:
• 1-50 builds total (~1-2 years at current rate)
• <100 events per build
• <10,000 total events

When ready to scale:
1. Upgrade to daily aggregation (10x capacity)
2. Add database backend (100x+ capacity)
3. Implement full search (1000x+ capacity)

All upgrades can be transparent to Claude Code (emitBuildEvent stays same)
and dashboard (webhook endpoints stay same) - only n8n workflows change.
```

---

## Component Interaction Sequence

```
1. User Clicks: "/grimlock start my-mcp-PRD.yaml"
   │
   ├─ Claude Code: parseAndValidatePRD()
   │  └─ generateBuildId("my-mcp")
   │
   ├─ Claude Code: emitBuildEvent({ phase: "prd_uploaded", ... })
   │  └─ File I/O: append to events.jsonl
   │  └─ File I/O: create 2025-12-30/my-mcp-20251230-001.jsonl
   │
   ├─ Claude Code: updateBuildSummary({ status: "running", ... })
   │  └─ File I/O: update builds.json
   │
   └─ Dashboard polls /grimlock/build-status (30s interval)
      ├─ n8n: Read builds.json
      ├─ n8n: find(status === 'running')
      ├─ HTTP: Return JSON with current build
      └─ Dashboard: Render "Building my-mcp (0% complete)"


2. Claude Code: Implements Tools
   │
   ├─ Tool 1: emitBuildEvent({ phase: "tool_implementation", ... })
   │  └─ File I/O: append to logs
   │
   ├─ Tool 2: emitBuildEvent({ phase: "tool_implementation", ... })
   │  └─ File I/O: append to logs
   │
   └─ Dashboard polls /grimlock/build-status (30s later)
      ├─ n8n: Read builds.json (unchanged, still status: running)
      ├─ HTTP: Return updated elapsed time
      └─ Dashboard: Render "Building my-mcp (12.5% complete)"


3. Claude Code: Completes Build
   │
   ├─ emitBuildEvent({ phase: "mcp_build_complete", status: "success", ... })
   │  └─ File I/O: append final event
   │
   ├─ updateBuildSummary({ status: "success", completedAt: "...", ... })
   │  └─ File I/O: update builds.json
   │
   └─ Dashboard polls /grimlock/build-status (30s later)
      ├─ n8n: Read builds.json
      ├─ n8n: find(status === 'running') → returns null
      ├─ HTTP: Return "currentBuild": null
      └─ Dashboard: Render "No active builds"


4. Dashboard polls /grimlock/analytics (2min interval)
   │
   ├─ n8n: Read events.jsonl
   ├─ n8n: Filter last 7 days
   ├─ n8n: Group by date, count builds
   ├─ n8n: Extract MCPs, count frequency
   └─ Dashboard: Render Build Activity & Most Built MCPs charts
      ├─ Activity: [1, 0, 1, 0, 1, 1, 2] for past 7 days
      └─ MCPs: [{ name: "my-mcp", count: 1 }, ...]


5. User Clicks Build in History Table
   │
   ├─ Dashboard: GET /grimlock/build-details?buildId=my-mcp-20251230-001
   │  └─ n8n: Read 2025-12-30/my-mcp-20251230-001.jsonl
   │  └─ n8n: Parse all events
   │  └─ n8n: Return timeline array
   │
   └─ Dashboard: Render detailed timeline
      ├─ 17:00 - PRD uploaded
      ├─ 17:05 - PRD reviewed
      ├─ 17:10 - Build started
      ├─ 17:15 - Tool 1 implemented
      ├─ ... (more events)
      └─ 18:45 - Build completed
```

---

## Error Recovery Flows

```
Scenario: Event Emission Fails (Disk Full, Permission Error)
═════════════════════════════════════════════════════════════════════════════

Claude Code: try { emitBuildEvent(event) }
             catch (error) {
               console.error("Failed to emit event");
               // Emit error event itself (meta!)
               emitBuildEvent({
                 phase: "error_occurred",
                 error: { code: "LOG_EMISSION_FAILED", ... }
               });
               // Continue build (don't block)
             }

Result: Event lost, but build continues
       Error event may also fail to emit (give up gracefully)
       Manual recovery: operator can restart


Scenario: builds.json Gets Corrupted
═════════════════════════════════════════════════════════════════════════════

n8n Analytics Workflow: try { JSON.parse(builds.json) }
                        catch {
                          // Rebuild from events.jsonl
                          rebuildBuildIndex()
                        }

Result: Self-healing - analytics endpoint auto-recovers
        Missing recent summaries, but history still available


Scenario: Webhook Endpoint Down (n8n Crashed)
═════════════════════════════════════════════════════════════════════════════

Dashboard: try { fetch(endpoint) }
           catch {
             // Return cached response (TTL 30s-2min)
             return cache.get(endpoint)
           }

Result: Dashboard shows last known good state + "stale data" label
        Manual recovery: restart n8n, clear cache after recovery


Scenario: Events Accumulate Faster Than Dashboard Can Consume
═════════════════════════════════════════════════════════════════════════════

Result: Buildup in events.jsonl (not a problem)
        Webhook queries become slower over time (analytics)

Solution: Add daily aggregation file to cache historical data
          This prevents O(total_events) queries from slowing down
```

---

## Monitoring Checklist

```
Daily Checks
═════════════════════════════════════════════════════════════════════════════

□ events.jsonl grows (new events being logged)
  Command: ls -lah build-logs/events.jsonl

□ builds.json updates (summaries being saved)
  Command: stat build-logs/builds.json | grep Modify

□ Disk space available (EC2 has room)
  Command: df -h /home/ubuntu

□ Dashboard shows real data (not stale)
  Command: curl https://im4tlai.app.n8n.cloud/webhook/grimlock/build-status

□ No permissions issues (can write logs)
  Command: touch build-logs/test.txt && rm build-logs/test.txt


Weekly Checks
═════════════════════════════════════════════════════════════════════════════

□ Archive old logs (>90 days)
  Command: find build-logs -type d -mtime +90

□ Analyze event volume (growing as expected?)
  Command: wc -l build-logs/events.jsonl

□ Check for corrupt JSON (bad lines)
  Command: cat build-logs/events.jsonl | jq . > /dev/null 2>&1

□ Verify webhook response times (<1s for analytics)
  Command: time curl https://im4tlai.app.n8n.cloud/webhook/grimlock/analytics


Monthly Checks
═════════════════════════════════════════════════════════════════════════════

□ Rebuild builds.json from events (verify consistency)
□ Rotate logs (move >3 month old dates to archive)
□ Analyze storage growth rate (project into future)
□ Review webhook query patterns (identify slow queries)
```

---

**Document Status:** COMPLETE
**Last Updated:** 2025-12-30
