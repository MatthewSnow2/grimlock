# Phase 2: n8n Workflow Modifications

Quick reference for modifying the 3 workflows + creating 1 new one.

---

## 1. Sprint Initiator (`cxvGUu8xVbui1WR2`)

**URL:** https://im4tlai.app.n8n.cloud/workflow/cxvGUu8xVbui1WR2

### DELETE these nodes:
- `Create Build in DB` (HTTP Request to FastAPI)
- `Log Build Start` (HTTP Request to FastAPI)

### RECONNECT:
```
Respond to Webhook → Launch Claude Code
```
(Remove the FastAPI calls from the chain)

### MODIFY `Launch Claude Code` SSH command:
```bash
cd /home/ubuntu/projects/grimlock && \
nohup /home/ubuntu/.local/bin/claude \
  --dangerously-skip-permissions \
  -p "Build the MCP from PRD file: prds/{{ $('Set Build Info').item.json.prdFile }}. Follow the GRIMLOCK process. When complete, zip the MCP and call POST https://im4tlai.app.n8n.cloud/webhook/grimlock/upload-mcp with the result." \
  > /tmp/grimlock-build-{{ $('Set Build Info').item.json.buildId }}.log 2>&1 & \
echo "CLAUDE_PID=$!"
```

---

## 2. Form Wizard (`XwmTcWU9DNzMD2ep`)

**URL:** https://im4tlai.app.n8n.cloud/workflow/XwmTcWU9DNzMD2ep

### Current Issue:
- Form returns error because `Respond to Webhook` node not compatible with Form Trigger

### FIX: Replace final node
Delete `Respond to Form` or `Show PRD Result` and use **n8n Form** node instead:

```json
{
  "parameters": {
    "operation": "completion",
    "completionTitle": "PRD Generated & Build Started!",
    "completionMessage": "=**MCP:** {{ $('Generate PRD YAML1').item.json.projectName }}\n**Build ID:** {{ $json.buildId }}\n**Status:** Building...\n\nCheck the dashboard for progress."
  },
  "name": "Form Completion",
  "type": "n8n-nodes-base.form",
  "typeVersion": 1
}
```

### OPTIONAL: Add Google Drive Upload
After `Generate PRD YAML1`, add Google Drive node to upload PRD for download.

---

## 3. Build Status (`PeQ6mkzN6YCXCicI`)

**URL:** https://im4tlai.app.n8n.cloud/workflow/PeQ6mkzN6YCXCicI

**NO CHANGES NEEDED** - Already reads GRIMLOCK_STATE.md and returns JSON.

---

## 4. MCP Upload Handler (CREATE NEW)

**Endpoint:** `POST /webhook/grimlock/upload-mcp`

### Purpose:
Claude Code calls this when build completes to upload MCP to Google Drive.

### Workflow Nodes:

1. **Webhook Trigger**
   - Method: POST
   - Path: `grimlock/upload-mcp`
   - Response Mode: `responseNode`

2. **SSH - Read ZIP** (base64 encode)
   ```bash
   base64 /home/ubuntu/projects/grimlock/mcps/{{ $json.body.mcpName }}.zip
   ```

3. **Code - Convert to Binary**
   ```javascript
   const base64Content = $input.first().json.stdout.trim();
   return [{
     json: {
       mcpName: $('Webhook').first().json.body.mcpName,
       buildId: $('Webhook').first().json.body.buildId,
       filename: `${$('Webhook').first().json.body.mcpName}-${Date.now()}.zip`
     },
     binary: {
       data: {
         data: base64Content,
         mimeType: 'application/zip',
         fileName: `${$('Webhook').first().json.body.mcpName}-${Date.now()}.zip`
       }
     }
   }];
   ```

4. **Google Drive - Upload**
   - Resource: File
   - Operation: Upload
   - File Name: `={{ $json.filename }}`
   - Parent Folder: `1CC9A4ODJZT9rK9pxEK4JSWGxldSxsNkZ`
   - Binary Property: `data`

5. **SSH - Update State**
   ```bash
   cd /home/ubuntu/projects/grimlock && \
   sed -i 's|status:.*|status: complete|' GRIMLOCK_STATE.md && \
   sed -i 's|phase:.*|phase: complete|' GRIMLOCK_STATE.md && \
   sed -i 's|progress:.*|progress: 100|' GRIMLOCK_STATE.md
   ```

6. **Respond to Webhook**
   ```json
   {
     "success": true,
     "status": "uploaded",
     "downloadUrl": "={{ $('Google Drive').item.json.webViewLink }}",
     "filename": "={{ $json.filename }}"
   }
   ```

### Input (what Claude Code sends):
```json
{
  "buildId": "mcp-weather-api-1704067200000",
  "mcpName": "mcp-weather-api"
}
```

---

## Testing Checklist

After modifications:

```bash
# Test Sprint Initiator
curl -X POST https://im4tlai.app.n8n.cloud/webhook/grimlock/start \
  -H "Content-Type: application/json" \
  -d '{"prd_file": "test-mcp-PRD.yaml"}'

# Test Build Status
curl https://im4tlai.app.n8n.cloud/webhook/grimlock/build-status

# Test MCP Upload (after creating workflow)
curl -X POST https://im4tlai.app.n8n.cloud/webhook/grimlock/upload-mcp \
  -H "Content-Type: application/json" \
  -d '{"mcpName": "test-mcp", "buildId": "test-123"}'
```

---

## Workflow Summary

| Workflow | ID | Endpoint | Action |
|----------|----|-----------| ------|
| Sprint Initiator | `cxvGUu8xVbui1WR2` | POST /grimlock/start | MODIFY |
| Form Wizard | `XwmTcWU9DNzMD2ep` | Form /grimlock-wizard | MODIFY |
| Build Status | `PeQ6mkzN6YCXCicI` | GET /grimlock/build-status | KEEP |
| MCP Upload | NEW | POST /grimlock/upload-mcp | CREATE |
