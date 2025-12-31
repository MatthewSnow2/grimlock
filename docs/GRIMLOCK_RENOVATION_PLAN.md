# GRIMLOCK Renovation Plan

**Document Version:** 1.0
**Created:** December 31, 2024
**Target Completion:** January 3, 2025 (Hackathon Deadline)
**Author:** Matthew Snow + Claude

---

## Executive Summary

GRIMLOCK has accumulated architectural complexity through multiple pivots: three competing UIs (Slack, n8n Form, Netlify Dashboard), two backends (n8n workflows, FastAPI), and three state management systems. This renovation strips the system to its core value proposition: **an AI-powered MCP factory that generates PRDs and builds MCP servers**.

### Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| UI Entry Points | 3 (Slack, n8n Form, Dashboard) | 1 (Single-page Dashboard) |
| Backend Systems | 2 (n8n + FastAPI) | 1 (n8n only) |
| State Management | 3 (PostgreSQL, GRIMLOCK_STATE.md, JSONL logs) | 1 (GRIMLOCK_STATE.md) |
| Artifact Delivery | GitHub (requires git knowledge) | Google Drive (click to download) |
| Authentication | Google OAuth | None (public demo) |
| Hosting Complexity | Netlify + EC2 + Caddy proxy | Netlify static only |

---

## Architecture Overview

### Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MCP FACTORY (Single Page)                           │
│                         Hosted: Netlify (Static)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────┐    ┌───────────────────────────────┐    │
│  │       BUILD A PRD             │    │       I HAVE A PRD            │    │
│  │                               │    │                               │    │
│  │  • MCP Name                   │    │  • File Upload (.yaml/.yml)   │    │
│  │  • Purpose/Description        │    │  • [Start Build →]            │    │
│  │  • Target Tools/APIs          │    │                               │    │
│  │  • Language (Python/TS)       │    │  ┌─────────────────────────┐  │    │
│  │  • [Generate PRD →]           │    │  │ Build Status            │  │    │
│  │                               │    │  │ Phase: Implementation   │  │    │
│  │  ┌─────────────────────────┐  │    │  │ Progress: ████░░ 67%   │  │    │
│  │  │ PRD Preview             │  │    │  └─────────────────────────┘  │    │
│  │  │ (Rendered YAML)         │  │    │                               │    │
│  │  └─────────────────────────┘  │    │  [Download MCP ↓]             │    │
│  │                               │    │  (Google Drive link)          │    │
│  │  [Download PRD ↓]             │    │                               │    │
│  │  (Google Drive link)          │    │                               │    │
│  └───────────────────────────────┘    └───────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              n8n CLOUD                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Workflow 1: PRD Generator                                                  │
│  POST /webhook/grimlock/generate-prd                                        │
│  ┌────────┐   ┌────────────┐   ┌──────────────┐   ┌────────────────┐       │
│  │Webhook │──►│Claude API  │──►│Upload to     │──►│Return PRD +    │       │
│  │Trigger │   │Generate PRD│   │Google Drive  │   │Download URL    │       │
│  └────────┘   └────────────┘   └──────────────┘   └────────────────┘       │
│                                                                             │
│  Workflow 2: Sprint Initiator (Modified)                                    │
│  POST /webhook/grimlock/start                                               │
│  ┌────────┐   ┌────────────┐   ┌──────────────┐   ┌────────────────┐       │
│  │Webhook │──►│Set Build   │──►│Respond       │──►│Launch Claude   │       │
│  │Trigger │   │Info        │   │Immediately   │   │Code (SSH)      │       │
│  └────────┘   └────────────┘   └──────────────┘   └────────────────┘       │
│                                                                             │
│  Workflow 3: Status Checker (New)                                           │
│  GET /webhook/grimlock/status/{buildId}                                     │
│  ┌────────┐   ┌────────────┐   ┌──────────────┐                            │
│  │Webhook │──►│SSH: Read   │──►│Parse & Return│                            │
│  │Trigger │   │STATE.md    │   │JSON Status   │                            │
│  └────────┘   └────────────┘   └──────────────┘                            │
│                                                                             │
│  Workflow 4: MCP Upload (New)                                               │
│  POST /webhook/grimlock/upload-mcp                                          │
│  ┌────────┐   ┌────────────┐   ┌──────────────┐   ┌────────────────┐       │
│  │Webhook │──►│Receive ZIP │──►│Upload to     │──►│Return Download │       │
│  │Trigger │   │from Claude │   │Google Drive  │   │URL             │       │
│  └────────┘   └────────────┘   └──────────────┘   └────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              EC2 INSTANCE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  /home/ubuntu/projects/grimlock/                                            │
│  ├── GRIMLOCK_STATE.md          ← Single source of truth                   │
│  ├── prds/                      ← PRD files (input)                        │
│  ├── mcps/                      ← Built MCPs (output)                      │
│  └── CLAUDE.md                  ← Claude Code instructions                 │
│                                                                             │
│  Claude Code runs autonomously, reads PRDs, builds MCPs                     │
│  Updates GRIMLOCK_STATE.md with progress                                    │
│  Calls n8n webhook to upload completed MCP to Google Drive                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            GOOGLE DRIVE                                     │
│              Folder: GRIMLOCK_ARTIFACTS                                     │
│              ID: 1CC9A4ODJZT9rK9pxEK4JSWGxldSxsNkZ                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  /GRIMLOCK_ARTIFACTS/                                                       │
│  ├── prds/                                                                  │
│  │   ├── mcp-weather-api-PRD-1704067200000.yaml                            │
│  │   └── mcp-slack-bot-PRD-1704153600000.yaml                              │
│  └── mcps/                                                                  │
│      ├── mcp-weather-api-1704067200000.zip                                 │
│      └── mcp-slack-bot-1704153600000.zip                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Deletion (Clean Slate)

### Files/Directories to DELETE

```bash
# Backend - No longer needed (n8n is the backend)
rm -rf grimlock-api/

# Dashboard complexity - Replacing with single page
rm -rf dashboard/js/api.js
rm -rf dashboard/js/auth.js
rm -rf dashboard/js/toast.js
rm -rf dashboard/js/router.js
rm -rf dashboard/pages/

# Proxy/SSL workarounds - No longer needed
rm -f verify-proxy-setup.sh
rm -f NETLIFY_PROXY_DEPLOYMENT.md
rm -rf dashboard/netlify/functions/  # If exists

# Design mockups - Not needed for MVP
rm -rf stitch_mcp_factory_dashboard/

# Old documentation that references removed architecture
rm -f docs/API_ENDPOINTS.md  # If exists, references FastAPI
rm -f docs/DATABASE_SCHEMA.md  # If exists
```

### Files to KEEP (but modify)

```
grimlock/
├── CLAUDE.md                    # Modify: Add MCP upload instructions
├── GRIMLOCK_STATE.md            # Keep: Single source of truth
├── README.md                    # Modify: Update architecture description
├── docs/
│   ├── ARCHITECTURE.md          # Modify: Reflect new simplified architecture
│   └── ROADMAP.md               # Modify: Update milestones
├── prds/                        # Keep: PRD storage
├── mcps/                        # Keep: MCP output directory
├── dashboard/                   # Modify: Single page only
│   ├── index.html               # REPLACE: New single-page design
│   ├── styles.css               # REPLACE: Simplified styles
│   └── app.js                   # REPLACE: New simplified logic
└── n8n-workflows/               # Keep: Export workflow JSONs here
```

---

## Phase 2: n8n Workflow Modifications

### Workflow 1: PRD Generator

**Endpoint:** `POST /webhook/grimlock/generate-prd`

**Trigger:** n8n Form or Webhook

**Input Schema:**
```json
{
  "mcpName": "weather-api",
  "purpose": "Fetch weather data from OpenWeatherMap API",
  "targetApis": ["OpenWeatherMap API"],
  "language": "python",
  "additionalNotes": "Support both current weather and 5-day forecast"
}
```

**Workflow Steps:**

1. **Webhook/Form Trigger** - Receive request
2. **Claude API Node** - Generate PRD YAML
   ```
   Model: claude-sonnet-4-20250514
   Prompt: "Generate a GRIMLOCK PRD YAML for an MCP server with these specs:
   Name: {{ $json.mcpName }}
   Purpose: {{ $json.purpose }}
   APIs: {{ $json.targetApis }}
   Language: {{ $json.language }}
   Notes: {{ $json.additionalNotes }}
   
   Follow the GRIMLOCK PRD format exactly."
   ```
3. **Google Drive Upload Node**
   - Folder ID: `1CC9A4ODJZT9rK9pxEK4JSWGxldSxsNkZ`
   - Subfolder: `prds/`
   - Filename: `{{ $json.mcpName }}-PRD-{{ Date.now() }}.yaml`
   - Content: PRD YAML from Claude
4. **Respond to Webhook**
   ```json
   {
     "status": "complete",
     "prdContent": "<full PRD YAML>",
     "downloadUrl": "https://drive.google.com/file/d/xxx/view",
     "filename": "mcp-weather-api-PRD-1704067200000.yaml"
   }
   ```

### Workflow 2: Sprint Initiator (MODIFY EXISTING)

**Endpoint:** `POST /webhook/grimlock/start`

**Current State:** Has FastAPI calls that need removal

**Required Changes:**

1. **DELETE these nodes:**
   - `Create Build in DB` (HTTP Request to FastAPI)
   - `Log Build Start` (HTTP Request to FastAPI)

2. **MODIFY `Set Build Info` node:**
   ```javascript
   {
     "buildId": "{{ $json.body.prd_file.replace('.yaml', '').replace('.yml', '') }}-{{ Date.now() }}",
     "prdFile": "{{ $json.body.prd_file }}",
     "prdContent": "{{ $json.body.prd_content }}", // NEW: Accept PRD content directly
     "timestamp": "{{ new Date().toISOString() }}",
     "status": "initiated"
   }
   ```

3. **ADD new node: Save PRD to EC2** (before Launch Claude)
   - SSH Node
   - Command: `echo '{{ $json.prdContent }}' > /home/ubuntu/projects/grimlock/prds/{{ $json.prdFile }}`

4. **MODIFY `Launch Claude Code` command:**
   ```bash
   cd /home/ubuntu/projects/grimlock && \
   nohup /home/ubuntu/.local/bin/claude \
     --dangerously-skip-permissions \
     -p "Build the MCP from PRD file: prds/{{ $json.prdFile }}. Follow the GRIMLOCK process. When complete, call the upload webhook." \
     > /tmp/grimlock-build-{{ $json.buildId }}.log 2>&1 & \
   echo "CLAUDE_PID=$!"
   ```

5. **Final workflow shape:**
   ```
   Webhook → Set Build Info → Respond Immediately → Save PRD to EC2 → Launch Claude Code
   ```

### Workflow 3: Status Checker (NEW)

**Endpoint:** `GET /webhook/grimlock/status`

**Purpose:** Dashboard polls this to get build progress

**Workflow Steps:**

1. **Webhook Trigger**
   - Method: GET
   - Path: `grimlock/status`
   - Response Mode: `responseNode`

2. **SSH Node - Read State**
   ```bash
   cat /home/ubuntu/projects/grimlock/GRIMLOCK_STATE.md
   ```

3. **Code Node - Parse State**
   ```javascript
   const stateContent = $input.first().json.stdout;
   
   // Parse GRIMLOCK_STATE.md format
   const currentSprintMatch = stateContent.match(/## Current Sprint\n([\s\S]*?)(?=\n## |$)/);
   const statusMatch = stateContent.match(/status:\s*(\w+)/);
   const phaseMatch = stateContent.match(/phase:\s*(\w+)/);
   const progressMatch = stateContent.match(/progress:\s*(\d+)/);
   const mcpUrlMatch = stateContent.match(/mcp_download_url:\s*(https:\/\/[^\s]+)/);
   
   return {
     status: statusMatch ? statusMatch[1] : 'unknown',
     phase: phaseMatch ? phaseMatch[1] : 'unknown',
     progress: progressMatch ? parseInt(progressMatch[1]) : 0,
     mcpDownloadUrl: mcpUrlMatch ? mcpUrlMatch[1] : null,
     lastUpdated: new Date().toISOString()
   };
   ```

4. **Respond to Webhook**
   ```json
   {
     "status": "{{ $json.status }}",
     "phase": "{{ $json.phase }}",
     "progress": "{{ $json.progress }}",
     "mcpDownloadUrl": "{{ $json.mcpDownloadUrl }}",
     "lastUpdated": "{{ $json.lastUpdated }}"
   }
   ```

### Workflow 4: MCP Upload (NEW)

**Endpoint:** `POST /webhook/grimlock/upload-mcp`

**Purpose:** Claude Code calls this when build is complete

**Input:**
```json
{
  "buildId": "mcp-weather-api-1704067200000",
  "mcpName": "mcp-weather-api",
  "zipPath": "/home/ubuntu/projects/grimlock/mcps/mcp-weather-api.zip"
}
```

**Workflow Steps:**

1. **Webhook Trigger**
   - Method: POST
   - Path: `grimlock/upload-mcp`

2. **SSH Node - Read ZIP file**
   ```bash
   base64 /home/ubuntu/projects/grimlock/mcps/{{ $json.body.mcpName }}.zip
   ```

3. **Code Node - Prepare for Upload**
   ```javascript
   const base64Content = $input.first().json.stdout;
   return {
     binaryData: Buffer.from(base64Content, 'base64'),
     filename: `${$json.body.mcpName}-${Date.now()}.zip`
   };
   ```

4. **Google Drive Upload Node**
   - Folder ID: `1CC9A4ODJZT9rK9pxEK4JSWGxldSxsNkZ`
   - Subfolder: `mcps/`
   - Binary Property: `binaryData`
   - Filename: From previous node

5. **SSH Node - Update State**
   ```bash
   sed -i 's|mcp_download_url:.*|mcp_download_url: {{ $json.webViewLink }}|' /home/ubuntu/projects/grimlock/GRIMLOCK_STATE.md
   sed -i 's|status:.*|status: complete|' /home/ubuntu/projects/grimlock/GRIMLOCK_STATE.md
   ```

6. **Respond to Webhook**
   ```json
   {
     "status": "uploaded",
     "downloadUrl": "{{ $json.webViewLink }}",
     "filename": "{{ $json.filename }}"
   }
   ```

---

## Phase 3: Dashboard Rewrite

### New File Structure

```
dashboard/
├── index.html          # Single page, both cards
├── styles.css          # Tailwind-based styling
└── app.js              # Vanilla JS, no framework
```

### index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP Factory | GRIMLOCK</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="styles.css">
</head>
<body class="bg-gray-900 text-white min-h-screen">
    <div class="container mx-auto px-4 py-8 max-w-6xl">
        
        <!-- Header -->
        <header class="text-center mb-12">
            <h1 class="text-4xl font-bold mb-4">
                Welcome to <span class="text-cyan-400">MCP Factory</span>
            </h1>
            <p class="text-gray-400 text-lg">
                Generate PRDs with AI or upload existing specifications to build MCP servers automatically.
            </p>
        </header>

        <!-- Main Grid -->
        <div class="grid md:grid-cols-2 gap-8">
            
            <!-- Card 1: Build a PRD -->
            <div class="bg-gradient-to-br from-purple-900/50 to-gray-800 rounded-xl p-6 border border-purple-500/30">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
                        </svg>
                    </div>
                    <h2 class="text-xl font-semibold text-purple-300">Build a PRD</h2>
                </div>
                
                <p class="text-gray-400 mb-6">
                    Use our AI-powered wizard to generate a comprehensive requirement specification from scratch.
                </p>

                <form id="prd-form" class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-300 mb-1">MCP Name</label>
                        <input type="text" name="mcpName" required
                            class="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
                            placeholder="e.g., weather-api">
                    </div>
                    
                    <div>
                        <label class="block text-sm text-gray-300 mb-1">Purpose</label>
                        <textarea name="purpose" required rows="2"
                            class="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
                            placeholder="What should this MCP do?"></textarea>
                    </div>
                    
                    <div>
                        <label class="block text-sm text-gray-300 mb-1">Target APIs/Tools</label>
                        <input type="text" name="targetApis"
                            class="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
                            placeholder="e.g., OpenWeatherMap, Stripe API">
                    </div>
                    
                    <div>
                        <label class="block text-sm text-gray-300 mb-1">Language</label>
                        <select name="language" 
                            class="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none">
                            <option value="python">Python (FastMCP)</option>
                            <option value="typescript">TypeScript</option>
                        </select>
                    </div>

                    <button type="submit" id="generate-btn"
                        class="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors">
                        Generate PRD →
                    </button>
                </form>

                <!-- PRD Result (hidden initially) -->
                <div id="prd-result" class="hidden mt-6">
                    <div class="bg-gray-800 rounded-lg p-4 mb-4">
                        <h3 class="text-sm font-semibold text-gray-300 mb-2">Generated PRD</h3>
                        <pre id="prd-preview" class="text-xs text-gray-400 overflow-auto max-h-48"></pre>
                    </div>
                    <a id="prd-download" href="#" target="_blank"
                        class="block w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg text-center transition-colors">
                        Download PRD ↓
                    </a>
                </div>
            </div>

            <!-- Card 2: I Have a PRD -->
            <div class="bg-gradient-to-br from-cyan-900/50 to-gray-800 rounded-xl p-6 border border-cyan-500/30">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                        <svg class="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                        </svg>
                    </div>
                    <h2 class="text-xl font-semibold text-cyan-300">I have a PRD</h2>
                </div>
                
                <p class="text-gray-400 mb-6">
                    Already have specs? Upload your YAML file to start the factory automation immediately.
                </p>

                <form id="upload-form" class="space-y-4">
                    <div id="drop-zone" 
                        class="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-cyan-500 transition-colors cursor-pointer">
                        <svg class="w-12 h-12 mx-auto text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                        </svg>
                        <p class="text-gray-400">Drop your .yaml file here or click to browse</p>
                        <input type="file" id="prd-file" accept=".yaml,.yml" class="hidden">
                        <p id="file-name" class="text-cyan-400 mt-2 hidden"></p>
                    </div>

                    <button type="submit" id="build-btn" disabled
                        class="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors">
                        Start Build →
                    </button>
                </form>

                <!-- Build Status (hidden initially) -->
                <div id="build-status" class="hidden mt-6">
                    <div class="bg-gray-800 rounded-lg p-4 mb-4">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-sm text-gray-300">Status</span>
                            <span id="status-badge" class="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">Building</span>
                        </div>
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-sm text-gray-300">Phase</span>
                            <span id="status-phase" class="text-sm text-gray-400">Initializing...</span>
                        </div>
                        <div class="mt-3">
                            <div class="bg-gray-700 rounded-full h-2">
                                <div id="progress-bar" class="bg-cyan-500 h-2 rounded-full transition-all duration-500" style="width: 0%"></div>
                            </div>
                            <p id="progress-text" class="text-xs text-gray-500 mt-1 text-right">0%</p>
                        </div>
                    </div>
                </div>

                <!-- MCP Download (hidden initially) -->
                <div id="mcp-result" class="hidden mt-4">
                    <a id="mcp-download" href="#" target="_blank"
                        class="block w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg text-center transition-colors">
                        Download MCP ↓
                    </a>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <footer class="text-center mt-12 text-gray-500 text-sm">
            <p>GRIMLOCK MCP Factory • Powered by Claude Code</p>
        </footer>
    </div>

    <script src="app.js"></script>
</body>
</html>
```

### app.js

```javascript
// =============================================================================
// MCP Factory Dashboard - Simplified Single Page Application
// =============================================================================

const CONFIG = {
    // n8n webhook URLs - UPDATE THESE WITH YOUR ACTUAL ENDPOINTS
    N8N_BASE_URL: 'https://im4tlai.app.n8n.cloud/webhook',
    ENDPOINTS: {
        GENERATE_PRD: '/grimlock/generate-prd',
        START_BUILD: '/grimlock/start',
        CHECK_STATUS: '/grimlock/status'
    },
    POLL_INTERVAL: 30000  // 30 seconds
};

// =============================================================================
// PRD Generation (Card 1)
// =============================================================================

const prdForm = document.getElementById('prd-form');
const generateBtn = document.getElementById('generate-btn');
const prdResult = document.getElementById('prd-result');
const prdPreview = document.getElementById('prd-preview');
const prdDownload = document.getElementById('prd-download');

prdForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(prdForm);
    const data = {
        mcpName: formData.get('mcpName'),
        purpose: formData.get('purpose'),
        targetApis: formData.get('targetApis'),
        language: formData.get('language')
    };

    // UI feedback
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';

    try {
        const response = await fetch(CONFIG.N8N_BASE_URL + CONFIG.ENDPOINTS.GENERATE_PRD, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Generation failed');

        const result = await response.json();
        
        // Show result
        prdPreview.textContent = result.prdContent;
        prdDownload.href = result.downloadUrl;
        prdResult.classList.remove('hidden');
        
    } catch (error) {
        console.error('PRD generation error:', error);
        alert('Failed to generate PRD. Please try again.');
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate PRD →';
    }
});

// =============================================================================
// MCP Build (Card 2)
// =============================================================================

const uploadForm = document.getElementById('upload-form');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('prd-file');
const fileName = document.getElementById('file-name');
const buildBtn = document.getElementById('build-btn');
const buildStatus = document.getElementById('build-status');
const statusBadge = document.getElementById('status-badge');
const statusPhase = document.getElementById('status-phase');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const mcpResult = document.getElementById('mcp-result');
const mcpDownload = document.getElementById('mcp-download');

let selectedFile = null;
let pollInterval = null;

// File selection handlers
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-cyan-500');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-cyan-500');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-cyan-500');
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.yaml') || file.name.endsWith('.yml'))) {
        handleFileSelect(file);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
    }
});

function handleFileSelect(file) {
    selectedFile = file;
    fileName.textContent = file.name;
    fileName.classList.remove('hidden');
    buildBtn.disabled = false;
}

// Build submission
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    buildBtn.disabled = true;
    buildBtn.textContent = 'Starting Build...';

    try {
        // Read file content
        const prdContent = await selectedFile.text();
        
        const response = await fetch(CONFIG.N8N_BASE_URL + CONFIG.ENDPOINTS.START_BUILD, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prd_file: selectedFile.name,
                prd_content: prdContent
            })
        });

        if (!response.ok) throw new Error('Build start failed');

        const result = await response.json();
        
        // Show status panel
        buildStatus.classList.remove('hidden');
        updateStatus('initiated', 'Starting...', 5);
        
        // Start polling for status
        startStatusPolling(result.buildId);
        
    } catch (error) {
        console.error('Build start error:', error);
        alert('Failed to start build. Please try again.');
        buildBtn.disabled = false;
        buildBtn.textContent = 'Start Build →';
    }
});

function startStatusPolling(buildId) {
    pollInterval = setInterval(async () => {
        try {
            const response = await fetch(CONFIG.N8N_BASE_URL + CONFIG.ENDPOINTS.CHECK_STATUS);
            
            if (!response.ok) throw new Error('Status check failed');
            
            const status = await response.json();
            
            updateStatus(status.status, status.phase, status.progress);
            
            if (status.status === 'complete') {
                stopStatusPolling();
                mcpDownload.href = status.mcpDownloadUrl;
                mcpResult.classList.remove('hidden');
                buildBtn.textContent = 'Build Complete!';
            } else if (status.status === 'failed') {
                stopStatusPolling();
                statusBadge.className = 'px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded';
                statusBadge.textContent = 'Failed';
                buildBtn.disabled = false;
                buildBtn.textContent = 'Retry Build →';
            }
            
        } catch (error) {
            console.error('Status poll error:', error);
        }
    }, CONFIG.POLL_INTERVAL);
}

function stopStatusPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
}

function updateStatus(status, phase, progress) {
    // Update badge
    if (status === 'complete') {
        statusBadge.className = 'px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded';
        statusBadge.textContent = 'Complete';
    } else if (status === 'running') {
        statusBadge.className = 'px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded';
        statusBadge.textContent = 'Building';
    } else {
        statusBadge.className = 'px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded';
        statusBadge.textContent = 'Queued';
    }
    
    // Update phase
    const phaseLabels = {
        'prd_uploaded': 'PRD Uploaded',
        'implementation': 'Building Implementation',
        'testing': 'Running Tests',
        'documentation': 'Generating Docs',
        'packaging': 'Packaging MCP',
        'complete': 'Complete'
    };
    statusPhase.textContent = phaseLabels[phase] || phase;
    
    // Update progress bar
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `${progress}%`;
}
```

### styles.css

```css
/* Additional styles beyond Tailwind */

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Smooth transitions */
* {
    transition-property: background-color, border-color, color, fill, stroke, opacity, box-shadow, transform;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
}

/* Code preview styling */
#prd-preview {
    font-family: 'Fira Code', 'Monaco', monospace;
    white-space: pre-wrap;
    word-break: break-word;
}

/* Drop zone active state */
#drop-zone.dragover {
    border-color: rgb(34, 211, 238);
    background-color: rgba(34, 211, 238, 0.05);
}

/* Loading spinner for buttons */
.loading::after {
    content: '';
    display: inline-block;
    width: 16px;
    height: 16px;
    margin-left: 8px;
    border: 2px solid #ffffff40;
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}
```

---

## Phase 4: CLAUDE.md Updates

Add the following section to CLAUDE.md to instruct Claude Code on MCP upload:

```markdown
## Build Completion Protocol

When an MCP build is successfully completed (all tests pass, documentation generated):

1. **Package the MCP:**
   ```bash
   cd /home/ubuntu/projects/grimlock/mcps
   zip -r {mcp-name}.zip {mcp-name}/
   ```

2. **Upload to Google Drive via n8n webhook:**
   ```bash
   curl -X POST https://im4tlai.app.n8n.cloud/webhook/grimlock/upload-mcp \
     -H "Content-Type: application/json" \
     -d '{
       "buildId": "{current-build-id}",
       "mcpName": "{mcp-name}",
       "zipPath": "/home/ubuntu/projects/grimlock/mcps/{mcp-name}.zip"
     }'
   ```

3. **Update GRIMLOCK_STATE.md:**
   - Set `status: complete`
   - Set `phase: complete`
   - Set `progress: 100`
   - The `mcp_download_url` will be updated automatically by the webhook response

## GRIMLOCK_STATE.md Format

Ensure state file maintains this structure for dashboard polling:

```yaml
## Current Sprint

build_id: mcp-example-1704067200000
prd_file: mcp-example-PRD.yaml
status: running          # initiated | running | complete | failed
phase: implementation    # prd_uploaded | implementation | testing | documentation | packaging | complete
progress: 45             # 0-100
mcp_download_url: null   # Populated when complete
started_at: 2024-12-31T10:00:00Z
updated_at: 2024-12-31T10:15:00Z
```
```

---

## Phase 5: GRIMLOCK_STATE.md Format Update

Ensure the state file follows this exact format for the status polling to work:

```yaml
# GRIMLOCK State Management
# This file is the single source of truth for build status

## Current Sprint

build_id: null
prd_file: null
status: idle
phase: null
progress: 0
mcp_download_url: null
started_at: null
updated_at: 2024-12-31T00:00:00Z

## Completed Builds

- mcp-api-ninjas (2024-12-30): 31/31 tests passing
- mcp-philips-hue (2024-12-22): Production ready
- mcp-dyson-appliances (2024-12-20): Production ready
- mcp-mirage (2024-12-18): Production ready

## Build History

| Build ID | PRD | Status | Duration | Tests |
|----------|-----|--------|----------|-------|
| api-ninjas-1704000000 | api-ninjas-PRD.yaml | complete | 45min | 31/31 |
```

---

## Implementation Checklist

### Day 1: Cleanup & n8n Workflows

- [ ] Delete `grimlock-api/` directory
- [ ] Delete unnecessary dashboard files (api.js, auth.js, toast.js, router.js, pages/)
- [ ] Delete proxy-related files
- [ ] Export existing n8n workflows as backup
- [ ] Modify Sprint Initiator workflow (remove FastAPI nodes)
- [ ] Create Status Checker workflow
- [ ] Create MCP Upload workflow
- [ ] Test all webhook endpoints manually with curl

### Day 2: Dashboard & Integration

- [ ] Replace dashboard with new single-page design
- [ ] Update n8n webhook URLs in app.js
- [ ] Test PRD generation flow end-to-end
- [ ] Test build initiation flow
- [ ] Test status polling
- [ ] Update CLAUDE.md with upload instructions
- [ ] Update GRIMLOCK_STATE.md format

### Day 3: Testing & Polish

- [ ] Full end-to-end test: Generate PRD → Download → Upload → Build → Download MCP
- [ ] Test error handling
- [ ] Update README.md with new architecture
- [ ] Record demo video for hackathon
- [ ] Deploy to Netlify
- [ ] Final verification

---

## Google Drive Configuration

**Folder:** GRIMLOCK_ARTIFACTS
**Folder ID:** `1CC9A4ODJZT9rK9pxEK4JSWGxldSxsNkZ`
**URL:** https://drive.google.com/drive/folders/1CC9A4ODJZT9rK9pxEK4JSWGxldSxsNkZ

**Structure to create:**
```
GRIMLOCK_ARTIFACTS/
├── prds/           ← Generated PRD files
└── mcps/           ← Completed MCP zip files
```

**n8n Google Drive Node Settings:**
- Operation: Upload
- Folder ID: `1CC9A4ODJZT9rK9pxEK4JSWGxldSxsNkZ/prds` (for PRDs)
- Folder ID: `1CC9A4ODJZT9rK9pxEK4JSWGxldSxsNkZ/mcps` (for MCPs)
- File Name: Dynamic from workflow

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| n8n webhook timeout during long builds | Respond immediately, poll for status |
| Claude Code fails to call upload webhook | Add fallback: n8n scheduled job checks for completed builds |
| Google Drive upload fails | Retry logic in workflow, keep local copy |
| Status polling overwhelms n8n | 30-second interval is conservative |
| CORS issues with Netlify → n8n | n8n webhooks should handle CORS; add headers if needed |

---

## Success Criteria

For hackathon submission, demonstrate:

1. **PRD Generation:** User fills form → AI generates PRD → Download link appears
2. **MCP Building:** User uploads PRD → Build starts → Status updates → MCP download link appears
3. **Artifact Delivery:** Both PRD and MCP downloadable from Google Drive

**Minimum Viable Demo:**
- PRD generation works end-to-end
- Build initiation works (status shows "Building")
- Pre-built MCP available in Google Drive to show completion

---

## Post-Hackathon Improvements

1. Add build queue for multiple simultaneous builds
2. Add email notification when build completes
3. Add build history view
4. Add MCP preview/documentation viewer
5. Consider auth for multi-user support
