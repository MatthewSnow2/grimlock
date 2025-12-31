# Form Wizard Fix - Auto-Trigger Sprint

## Problem
The Form Wizard generates a PRD but doesn't trigger the Sprint Initiator to start building.

## Current Flow
```
Form Submit → Parse Tools → Calculate Efficiency → Generate PRD → Respond to Form
                                                                       ↓
                                                              (dead end - no build)
```

## Required Flow
```
Form Submit → Parse Tools → Calculate Efficiency → Generate PRD → Save to GitHub → Trigger Sprint → Respond
                                                                                          ↓
                                                                                   Sprint Initiator
                                                                                   (builds MCP)
```

## Fix Instructions

### Step 1: Open the Form Wizard in n8n

1. Go to https://im4tlai.app.n8n.cloud
2. Open **GRIMLOCK Form Wizard** workflow (ID: `XwmTcWU9DNzMD2ep`)

### Step 2: Add "Save PRD via SSH" Node

After "Generate PRD YAML" node, add an **SSH** node:

- **Name**: `Save PRD to GitHub`
- **Type**: SSH
- **Credentials**: `ec2-grimlock` (sshPrivateKey)
- **Authentication**: `privateKey`
- **Command**:
```bash
=cat > /home/ubuntu/projects/grimlock/prds/{{ $json.prdFilename }} << 'PRDEOF'
{{ $json.prdContent }}
PRDEOF
cd /home/ubuntu/projects/grimlock && git add prds/{{ $json.prdFilename }} && git commit -m "wizard: add {{ $json.projectName }} PRD" && git push
```

### Step 3: Add "Trigger Sprint Initiator" Node

After "Save PRD to GitHub" node, add an **HTTP Request** node:

- **Name**: `Trigger Sprint Initiator`
- **Type**: HTTP Request
- **Method**: POST
- **URL**: `https://im4tlai.app.n8n.cloud/webhook/grimlock/start`
- **Headers**:
  - Content-Type: application/json
- **Body (JSON)**:
```json
{
  "prd_file": "={{ $('Generate PRD YAML').item.json.prdFilename }}"
}
```

### Step 4: Update "Respond to Form" Node

Update the response text to include build status:

```text
=## PRD Generated & Build Started! 🚀

**MCP:** {{ $('Generate PRD YAML').item.json.projectName }}
**SDK:** {{ $('Generate PRD YAML').item.json.sdk }}
**Tools:** {{ $('Calculate Context Efficiency').item.json.contextEfficiency.toolCount }}
**Tokens:** ~{{ $('Calculate Context Efficiency').item.json.contextEfficiency.estimatedTokens }}

**Build ID:** {{ $json.buildId }}
**Status:** {{ $json.status }}

Your MCP server is now being built. Check the dashboard for progress.
```

### Step 5: Update Connections

Connect the nodes in this order:
```
Generate PRD YAML → Save PRD to GitHub → Trigger Sprint Initiator → Respond to Form
```

### Step 6: Save and Activate

1. Save the workflow
2. Ensure it's active

## Testing

1. Go to https://grimlockfactory.netlify.app
2. Click "Begin Wizard"
3. Fill out the form and submit
4. Verify:
   - PRD appears in `/home/ubuntu/projects/grimlock/prds/`
   - Build appears in dashboard
   - Sprint Initiator runs

## Alternative: Quick Fix via FastAPI

Instead of modifying n8n, you can call FastAPI which handles both:

Replace "Save PRD to GitHub" + "Trigger Sprint Initiator" with single HTTP Request:

- **URL**: `http://54.225.171.108:8000/api/prd/upload`
- **Method**: POST
- **Body**:
```json
{
  "filename": "={{ $json.prdFilename }}",
  "content": "={{ $json.prdContent }}"
}
```

FastAPI's `/api/prd/upload` automatically:
1. Saves PRD to database
2. Saves PRD to filesystem
3. Triggers Sprint Initiator via n8n webhook
