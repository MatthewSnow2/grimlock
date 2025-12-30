#!/bin/bash
# GRIMLOCK Build Event Emitter
# Usage: ./emit_event.sh <build_id> <event> <phase> <message> [level]
#
# Examples:
#   ./emit_event.sh "n8n-mcp-20251230" "build_start" "prd_uploaded" "PRD validated and build starting"
#   ./emit_event.sh "n8n-mcp-20251230" "phase_change" "codeGen" "Generating MCP server code"
#   ./emit_event.sh "n8n-mcp-20251230" "error" "validation" "Test failures detected" "error"
#   ./emit_event.sh "n8n-mcp-20251230" "build_complete" "complete" "Build successful!"

BUILD_ID="${1:-unknown}"
EVENT="${2:-status_update}"
PHASE="${3:-unknown}"
MESSAGE="${4:-No message}"
LEVEL="${5:-info}"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# n8n webhook URL for event logging
WEBHOOK_URL="https://im4tlai.app.n8n.cloud/webhook/grimlock/log-event"

# Send the event
curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"buildId\": \"$BUILD_ID\",
    \"event\": \"$EVENT\",
    \"phase\": \"$PHASE\",
    \"message\": \"$MESSAGE\",
    \"level\": \"$LEVEL\",
    \"timestamp\": \"$TIMESTAMP\"
  }" > /dev/null 2>&1

echo "[GRIMLOCK] Event emitted: $EVENT ($PHASE) - $MESSAGE"
