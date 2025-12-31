# GRIMLOCK Webhook Configuration Guide

**Status:** Implementation Reference
**Last Updated:** 2025-12-30

---

## Webhook Endpoints Summary

| Endpoint | Method | Purpose | Response Time | Cache |
|----------|--------|---------|----------------|-------|
| `/grimlock/build-status` | GET | Current running build | <100ms | 30s |
| `/grimlock/build-history` | GET | All builds + stats | <500ms | 60s |
| `/grimlock/analytics` | GET | 7-day trends + MCP stats | <1s | 2min |
| `/grimlock/build-details` | GET | Single build execution trace | <500ms | 60s |

---

## Base URL

All webhooks are relative to:
```
https://im4tlai.app.n8n.cloud/webhook
```

Full URLs:
- `https://im4tlai.app.n8n.cloud/webhook/grimlock/build-status`
- `https://im4tlai.app.n8n.cloud/webhook/grimlock/build-history`
- `https://im4tlai.app.n8n.cloud/webhook/grimlock/analytics`
- `https://im4tlai.app.n8n.cloud/webhook/grimlock/build-details`

---

## Endpoint 1: Build Status

### Purpose
Get current running build status for real-time monitoring.

### Request

```bash
curl -X GET https://im4tlai.app.n8n.cloud/webhook/grimlock/build-status
```

### Response Format

```json
{
  "currentBuild": {
    "buildId": "n8n-mcp-20251230-001",
    "projectName": "n8n-mcp",
    "phase": "mcp_build_started",
    "status": "running",
    "startedAt": "2025-12-30T17:00:00Z",
    "elapsedSeconds": 3600,
    "progress": {
      "toolsCompleted": 10,
      "toolsTotal": 16,
      "percentComplete": 62.5
    }
  },
  "lastUpdated": "2025-12-30T18:00:00Z"
}
```

### Response When No Build Running

```json
{
  "currentBuild": null,
  "message": "No build currently running",
  "lastUpdated": "2025-12-30T18:00:00Z"
}
```

### Dashboard Usage

```javascript
// Fetch every 30 seconds
async function updateBuildStatus() {
  const response = await fetch(
    'https://im4tlai.app.n8n.cloud/webhook/grimlock/build-status'
  );
  const data = await response.json();

  if (data.currentBuild) {
    updateStatusUI({
      title: `Building ${data.currentBuild.projectName}`,
      progress: data.currentBuild.progress.percentComplete,
      phase: data.currentBuild.phase,
      elapsed: data.currentBuild.elapsedSeconds
    });
  } else {
    showNoActiveBuildsUI();
  }
}
```

---

## Endpoint 2: Build History

### Purpose
Get list of all builds with summary statistics.

### Request

```bash
curl -X GET https://im4tlai.app.n8n.cloud/webhook/grimlock/build-history
```

### Response Format

```json
{
  "builds": [
    {
      "buildId": "n8n-mcp-20251230-001",
      "projectName": "n8n-mcp",
      "projectPath": "/home/ubuntu/projects/mcp/n8n-mcp",
      "startedAt": "2025-12-30T17:00:00Z",
      "completedAt": "2025-12-30T18:45:00Z",
      "durationSeconds": 6300,
      "durationFormatted": "1h 45m",
      "status": "success",
      "prdFile": "prds/n8n-mcp-PRD.yaml",
      "toolsImplemented": 16,
      "testsWritten": 18,
      "errors": [],
      "warnings": [],
      "escalations": []
    },
    {
      "buildId": "mcp-philips-hue-20251229-001",
      "projectName": "mcp-philips-hue",
      "projectPath": "/home/ubuntu/projects/mcp/mcp-philips-hue",
      "startedAt": "2025-12-29T10:00:00Z",
      "completedAt": "2025-12-29T14:30:00Z",
      "durationSeconds": 16200,
      "durationFormatted": "4h 30m",
      "status": "success",
      "prdFile": "prds/mcp-philips-hue-PRD.yaml",
      "toolsImplemented": 4,
      "testsWritten": 8,
      "errors": [],
      "warnings": [],
      "escalations": []
    }
  ],
  "stats": {
    "totalBuilds": 4,
    "successCount": 3,
    "failureCount": 1,
    "successRate": "75.0%",
    "avgDurationMinutes": "105.0",
    "avgToolsImplemented": 8.25,
    "avgTestsWritten": 11
  },
  "lastUpdated": "2025-12-30T18:45:00Z"
}
```

### Dashboard Usage

```javascript
// Fetch every 60 seconds
async function updateBuildHistory() {
  const response = await fetch(
    'https://im4tlai.app.n8n.cloud/webhook/grimlock/build-history'
  );
  const data = await response.json();

  // Render table
  const table = document.getElementById('build-history-table');
  table.innerHTML = data.builds.map(build => `
    <tr class="${build.status === 'success' ? 'success' : 'error'}">
      <td>${build.projectName}</td>
      <td>${new Date(build.startedAt).toLocaleDateString()}</td>
      <td>${build.durationFormatted}</td>
      <td>${build.toolsImplemented}/${build.testsWritten}</td>
      <td class="status-${build.status}">${build.status}</td>
    </tr>
  `).join('');

  // Update stats
  document.getElementById('total-builds').textContent = data.stats.totalBuilds;
  document.getElementById('success-rate').textContent = data.stats.successRate;
  document.getElementById('avg-duration').textContent = data.stats.avgDurationMinutes + 'min';
}
```

---

## Endpoint 3: Analytics

### Purpose
Get build activity for last 7 days and MCP frequency statistics for charts.

### Request

```bash
curl -X GET https://im4tlai.app.n8n.cloud/webhook/grimlock/analytics
```

### Response Format

```json
{
  "buildActivity": {
    "last7Days": [
      {
        "date": "2025-12-24",
        "dayOfWeek": "Wed",
        "buildCount": 1
      },
      {
        "date": "2025-12-25",
        "dayOfWeek": "Thu",
        "buildCount": 0
      },
      {
        "date": "2025-12-26",
        "dayOfWeek": "Fri",
        "buildCount": 1
      },
      {
        "date": "2025-12-27",
        "dayOfWeek": "Sat",
        "buildCount": 0
      },
      {
        "date": "2025-12-28",
        "dayOfWeek": "Sun",
        "buildCount": 1
      },
      {
        "date": "2025-12-29",
        "dayOfWeek": "Mon",
        "buildCount": 1
      },
      {
        "date": "2025-12-30",
        "dayOfWeek": "Tue",
        "buildCount": 2
      }
    ],
    "totalThisWeek": 6,
    "peakDay": "2025-12-30",
    "peakCount": 2
  },
  "mostBuiltMCPs": [
    {
      "projectName": "n8n-mcp",
      "buildCount": 2,
      "lastBuild": "2025-12-30T18:45:00Z"
    },
    {
      "projectName": "mcp-philips-hue",
      "buildCount": 1,
      "lastBuild": "2025-12-29T14:30:00Z"
    },
    {
      "projectName": "mcp-dyson-appliances",
      "buildCount": 1,
      "lastBuild": "2025-12-28T12:00:00Z"
    }
  ],
  "lastUpdated": "2025-12-30T18:45:00Z"
}
```

### Dashboard Usage

```javascript
// Fetch every 2 minutes
async function updateAnalytics() {
  const response = await fetch(
    'https://im4tlai.app.n8n.cloud/webhook/grimlock/analytics'
  );
  const data = await response.json();

  // Render Build Activity Chart (bar chart)
  const labels = data.buildActivity.last7Days.map(d => d.dayOfWeek);
  const counts = data.buildActivity.last7Days.map(d => d.buildCount);

  renderBarChart('build-activity-chart', {
    labels,
    datasets: [{
      label: 'Builds per Day',
      data: counts,
      backgroundColor: '#135bec',
      borderRadius: 4
    }]
  });

  // Render Most Built MCPs Chart (horizontal bar)
  renderHorizontalBarChart('most-built-mcps-chart', {
    labels: data.mostBuiltMCPs.map(m => m.projectName),
    datasets: [{
      label: 'Build Count',
      data: data.mostBuiltMCPs.map(m => m.buildCount),
      backgroundColor: ['#135bec', '#1d6bf5', '#2563eb']
    }]
  });
}
```

---

## Endpoint 4: Build Details

### Purpose
Get detailed execution trace for a specific build.

### Request

```bash
curl -X GET 'https://im4tlai.app.n8n.cloud/webhook/grimlock/build-details?buildId=n8n-mcp-20251230-001'
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `buildId` | string | Yes | Build identifier (e.g., "n8n-mcp-20251230-001") |

### Response Format

```json
{
  "buildId": "n8n-mcp-20251230-001",
  "projectName": "n8n-mcp",
  "projectPath": "/home/ubuntu/projects/mcp/n8n-mcp",
  "status": "success",
  "startTime": "2025-12-30T17:00:00Z",
  "endTime": "2025-12-30T18:45:00Z",
  "totalDurationSeconds": 6300,
  "timeline": [
    {
      "timestamp": "2025-12-30T17:00:00Z",
      "phase": "prd_uploaded",
      "status": "success",
      "details": {
        "prdFile": "prds/n8n-mcp-PRD.yaml",
        "fileSize": 2048
      }
    },
    {
      "timestamp": "2025-12-30T17:05:23Z",
      "phase": "prd_reviewed",
      "status": "success",
      "details": {
        "validationResult": "pass",
        "issuesFound": 0
      }
    },
    {
      "timestamp": "2025-12-30T17:10:45Z",
      "phase": "mcp_build_started",
      "status": "success",
      "details": {
        "projectPath": "/home/ubuntu/projects/mcp/n8n-mcp",
        "targetSDK": "typescript"
      }
    },
    {
      "timestamp": "2025-12-30T18:45:00Z",
      "phase": "mcp_build_complete",
      "status": "success",
      "details": {
        "toolsImplemented": 16,
        "testsWritten": 18,
        "docsGenerated": true
      }
    }
  ],
  "summary": {
    "totalEvents": 42,
    "successCount": 40,
    "warningCount": 1,
    "errorCount": 0,
    "toolsImplemented": 16,
    "testsWritten": 18,
    "docsGenerated": true
  },
  "errors": []
}
```

### Response When Build Not Found

```json
{
  "error": "Build not found",
  "buildId": "invalid-id-20251230-999",
  "message": "No build found with this ID. Check the buildId parameter and try again.",
  "lastUpdated": "2025-12-30T18:45:00Z"
}
```

### Dashboard Usage

```javascript
// Called when user clicks a build in history table
async function showBuildDetails(buildId) {
  const response = await fetch(
    `https://im4tlai.app.n8n.cloud/webhook/grimlock/build-details?buildId=${buildId}`
  );
  const data = await response.json();

  if (data.error) {
    showError('Build not found');
    return;
  }

  // Render timeline
  const timeline = document.getElementById('build-timeline');
  timeline.innerHTML = data.timeline.map(event => `
    <div class="timeline-event status-${event.status}">
      <time>${new Date(event.timestamp).toLocaleTimeString()}</time>
      <span class="phase">${event.phase}</span>
      <span class="badge status-${event.status}">${event.status}</span>
    </div>
  `).join('');

  // Show summary
  document.getElementById('build-summary').innerHTML = `
    <p><strong>Tools Implemented:</strong> ${data.summary.toolsImplemented}</p>
    <p><strong>Tests Written:</strong> ${data.summary.testsWritten}</p>
    <p><strong>Duration:</strong> ${formatSeconds(data.totalDurationSeconds)}</p>
    <p><strong>Success Rate:</strong> ${(data.summary.successCount / data.summary.totalEvents * 100).toFixed(1)}%</p>
  `;
}
```

---

## Testing Webhooks Locally

### 1. Test Build Status

```bash
curl -v https://im4tlai.app.n8n.cloud/webhook/grimlock/build-status | jq '.'
```

Expected:
- HTTP 200 OK
- JSON response with `currentBuild` or `null`
- Response time <100ms

### 2. Test Build History

```bash
curl -v https://im4tlai.app.n8n.cloud/webhook/grimlock/build-history | jq '.stats'
```

Expected:
- HTTP 200 OK
- Stats object with totalBuilds, successCount, failureCount
- Response time <500ms

### 3. Test Analytics

```bash
curl -v https://im4tlai.app.n8n.cloud/webhook/grimlock/analytics | jq '.buildActivity'
```

Expected:
- HTTP 200 OK
- 7 days of data in `last7Days` array
- `mostBuiltMCPs` list
- Response time <1s

### 4. Test Build Details

```bash
# First, get a buildId from history
curl https://im4tlai.app.n8n.cloud/webhook/grimlock/build-history | jq '.builds[0].buildId'

# Then fetch details
curl -v 'https://im4tlai.app.n8n.cloud/webhook/grimlock/build-details?buildId=n8n-mcp-20251230-001' | jq '.timeline | length'
```

Expected:
- HTTP 200 OK
- `timeline` array with events
- Response time <500ms

---

## Error Handling

### Network Errors

The dashboard has built-in retry logic:

```javascript
async fetchWithRetry(url, maxRetries = 3) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        timeout: 10000
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i))); // Exponential backoff
    }
  }

  throw lastError;
}
```

### Stale Data Handling

If webhook is unavailable, dashboard shows last known good state:

```javascript
async updateWithFallback(endpoint) {
  try {
    const fresh = await this.fetchWithRetry(endpoint);
    cache.set(endpoint, fresh);
    showFreshUI(fresh);
  } catch (error) {
    const stale = cache.get(endpoint);
    if (stale) {
      showStaleUI(stale, 'Data from ' + new Date(stale.lastUpdated).toLocaleTimeString());
    } else {
      showErrorUI('Unable to load data');
    }
  }
}
```

---

## Performance Tuning

### For Large Build Histories (100+ builds)

**Option 1: Pagination**

Add `offset` and `limit` parameters:
```bash
curl 'https://im4tlai.app.n8n.cloud/webhook/grimlock/build-history?offset=0&limit=10'
```

**Option 2: Filtering**

Add `status` and `dateRange` parameters:
```bash
curl 'https://im4tlai.app.n8n.cloud/webhook/grimlock/build-history?status=success&since=2025-12-01'
```

**Option 3: Caching**

Increase polling intervals:
```javascript
const POLLING_INTERVALS = {
  '/grimlock/build-status': 30000,      // 30 seconds
  '/grimlock/build-history': 300000,    // 5 minutes
  '/grimlock/analytics': 600000         // 10 minutes
};
```

---

## Webhook Deployment Steps

### 1. Create Workflows in n8n

1. Log in to n8n Cloud
2. Create new workflow: "GRIMLOCK Build Status Webhook"
3. Add webhook trigger with path `/grimlock/build-status`
4. Add function nodes to read build-logs and format response
5. Deploy and activate

### 2. Repeat for Other Endpoints

- `/grimlock/build-history`
- `/grimlock/analytics`
- `/grimlock/build-details`

### 3. Test All Endpoints

Run the curl tests in "Testing Webhooks Locally" section above.

### 4. Update Dashboard Configuration

The dashboard already has these URLs configured in `js/api.js`:

```javascript
const CONFIG = {
  apiUrl: 'https://im4tlai.app.n8n.cloud/webhook'
};

const ENDPOINTS = {
  BUILD_STATUS: '/grimlock/build-status',
  BUILD_HISTORY: '/grimlock/build-history',
  ANALYTICS: '/grimlock/analytics',
  BUILD_DETAILS: '/grimlock/build-details'
};
```

No changes needed to dashboard code.

### 5. Verify Dashboard

1. Open https://grimlock-dashboard.netlify.app
2. Check Build Activity chart (should show 7-day data)
3. Check Most Built MCPs chart (should show frequency stats)
4. Check current build status (should be live or "No active builds")
5. Click a build in history to see detailed timeline

---

## Troubleshooting

### Webhook Returns Empty Data

**Cause:** build-logs directory doesn't exist or is empty

**Solution:**
```bash
# Verify directory structure
ls -la /home/ubuntu/projects/grimlock/build-logs/

# Verify files have content
wc -l /home/ubuntu/projects/grimlock/build-logs/events.jsonl
head -5 /home/ubuntu/projects/grimlock/build-logs/builds.json

# Manually emit test event
# (Run build-logger test script)
```

### Build Status Shows Old Data

**Cause:** builds.json not being updated

**Solution:**
```bash
# Check if builds.json is writable
ls -l /home/ubuntu/projects/grimlock/build-logs/builds.json

# Check file modification time
stat /home/ubuntu/projects/grimlock/build-logs/builds.json

# Verify recent events in events.jsonl
tail -10 /home/ubuntu/projects/grimlock/build-logs/events.jsonl | jq '.'
```

### Analytics Shows Wrong Dates

**Cause:** Events have incorrect timestamp format

**Solution:**
```bash
# Verify timestamp format (should be ISO 8601)
head -1 /home/ubuntu/projects/grimlock/build-logs/events.jsonl | jq '.timestamp'
# Output should be: "2025-12-30T17:00:00Z"

# Check for invalid timestamps
grep -v 'T.*Z' /home/ubuntu/projects/grimlock/build-logs/events.jsonl
# Should return nothing
```

### Build Details 404

**Cause:** buildId parameter not passed or file doesn't exist

**Solution:**
```bash
# Get valid buildId from history
curl https://im4tlai.app.n8n.cloud/webhook/grimlock/build-history | jq '.builds[0].buildId'

# Verify build log file exists
# Format: build-logs/YYYY-MM-DD/{buildId}.jsonl
ls /home/ubuntu/projects/grimlock/build-logs/2025-12-30/ | grep -E '.*-20251230-.*\.jsonl'
```

---

## Monitoring

### Check n8n Workflow Health

```bash
# Test each webhook once
for endpoint in build-status build-history analytics; do
  echo "Testing $endpoint..."
  curl -w "Status: %{http_code}\n" \
    "https://im4tlai.app.n8n.cloud/webhook/grimlock/$endpoint" > /dev/null 2>&1
done
```

### Monitor Build Log Growth

```bash
# Check events.jsonl size
du -h /home/ubuntu/projects/grimlock/build-logs/events.jsonl

# Check event count
wc -l /home/ubuntu/projects/grimlock/build-logs/events.jsonl

# Archive old logs (>90 days)
find /home/ubuntu/projects/grimlock/build-logs -type d -mtime +90 -name "20*"
```

### Dashboard Availability

```bash
# Test dashboard static hosting
curl -I https://grimlock-dashboard.netlify.app

# Expected: 200 OK
```

---

**Document Status:** COMPLETE
**Last Updated:** 2025-12-30
