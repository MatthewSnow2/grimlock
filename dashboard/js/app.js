/**
 * MCP Factory Dashboard - Simplified Single Page Application
 * GRIMLOCK Hackathon - January 2025
 */

const CONFIG = {
    N8N_BASE_URL: 'https://im4tlai.app.n8n.cloud/webhook',
    ENDPOINTS: {
        START_BUILD: '/grimlock/start',
        CHECK_STATUS: '/grimlock/build-status',
        CHAT: '/7d72a34d-bb56-4d34-876a-b003cbc129ed/chat'
    },
    POLL_INTERVAL: 10000  // 10 seconds
};

// =============================================================================
// Chat Session Management
// =============================================================================

function getChatSessionId() {
    let sessionId = localStorage.getItem('grimlock_chat_session_id');
    if (!sessionId) {
        sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);
        localStorage.setItem('grimlock_chat_session_id', sessionId);
    }
    return sessionId;
}

const chatSessionId = getChatSessionId();

// =============================================================================
// Hero Chat Elements
// =============================================================================

const heroChatMessages = document.getElementById('hero-chat-messages');
const heroChatInput = document.getElementById('hero-chat-input');
const heroChatSend = document.getElementById('hero-chat-send');
const heroQuickActions = document.querySelectorAll('.hero-quick-action');

// =============================================================================
// Chat Utility Functions
// =============================================================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function generateMessageId() {
    return 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

function addMessageToChat(role, content, messageId = null) {
    if (!heroChatMessages) return null;

    const id = messageId || generateMessageId();
    const messageDiv = document.createElement('div');
    messageDiv.id = id;
    messageDiv.className = 'flex gap-3';

    if (role === 'user') {
        messageDiv.innerHTML = `
            <div class="ml-auto max-w-[85%]">
                <div class="bg-orange-600 rounded-lg rounded-tr-none p-3">
                    <p class="text-white">${escapeHtml(content)}</p>
                </div>
            </div>
        `;
    } else if (role === 'assistant') {
        messageDiv.innerHTML = `
            <div class="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img src="assets/grimlock-avatar.png" alt="Grimlock" class="w-6 h-6 object-contain"/>
            </div>
            <div class="bg-gray-800 rounded-lg rounded-tl-none p-3 max-w-[85%]">
                <p class="text-gray-200">${escapeHtml(content)}</p>
            </div>
        `;
    } else if (role === 'typing') {
        messageDiv.innerHTML = `
            <div class="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img src="assets/grimlock-avatar.png" alt="Grimlock" class="w-6 h-6 object-contain"/>
            </div>
            <div class="bg-gray-800 rounded-lg rounded-tl-none p-3">
                <div class="flex gap-1">
                    <span class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0ms;"></span>
                    <span class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 150ms;"></span>
                    <span class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 300ms;"></span>
                </div>
            </div>
        `;
    }

    heroChatMessages.appendChild(messageDiv);
    heroChatMessages.scrollTop = heroChatMessages.scrollHeight;

    return id;
}

function removeMessage(messageId) {
    const element = document.getElementById(messageId);
    if (element) {
        element.remove();
    }
}

// =============================================================================
// Grimlock Chat API
// =============================================================================

async function sendToGrimlock(message) {
    if (!message.trim()) return;

    // Disable input while sending
    if (heroChatInput) heroChatInput.disabled = true;
    if (heroChatSend) heroChatSend.disabled = true;

    // Add user message
    addMessageToChat('user', message);

    // Add typing indicator
    const typingId = addMessageToChat('typing', '');

    try {
        const response = await fetch(CONFIG.N8N_BASE_URL + CONFIG.ENDPOINTS.CHAT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chatInput: message,
                sessionId: chatSessionId
            })
        });

        if (!response.ok) {
            throw new Error('Chat request failed');
        }

        const data = await response.json();

        // Remove typing indicator
        removeMessage(typingId);

        // Add assistant response
        const responseText = data.output || data.message || 'I received your message but got an unexpected response format.';
        addMessageToChat('assistant', responseText);

    } catch (error) {
        console.error('Chat error:', error);

        // Remove typing indicator
        removeMessage(typingId);

        // Add error message
        addMessageToChat('assistant', 'Sorry, I encountered an error. Please try again.');
    } finally {
        // Re-enable input
        if (heroChatInput) {
            heroChatInput.disabled = false;
            heroChatInput.value = '';
            heroChatInput.focus();
        }
        if (heroChatSend) heroChatSend.disabled = false;
    }
}

// =============================================================================
// Chat Event Listeners
// =============================================================================

if (heroChatSend) {
    heroChatSend.addEventListener('click', () => {
        const message = heroChatInput?.value?.trim();
        if (message) {
            sendToGrimlock(message);
        }
    });
}

if (heroChatInput) {
    heroChatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const message = heroChatInput.value.trim();
            if (message) {
                sendToGrimlock(message);
            }
        }
    });
}

if (heroQuickActions) {
    heroQuickActions.forEach(button => {
        button.addEventListener('click', () => {
            const message = button.getAttribute('data-message');
            if (message) {
                sendToGrimlock(message);
            }
        });
    });
}

// =============================================================================
// DOM Elements
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

// Active build section
const activeBuildSection = document.getElementById('active-build-section');
const activeBuildName = document.getElementById('active-build-name');
const activeBuildId = document.getElementById('active-build-id');
const activeStatusBadge = document.getElementById('active-status-badge');
const activePhase = document.getElementById('active-phase');
const activeProgressBar = document.getElementById('active-progress-bar');
const activeProgressText = document.getElementById('active-progress-text');
const activeDownload = document.getElementById('active-download');
const activeDownloadLink = document.getElementById('active-download-link');

// Refresh button
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const refreshText = document.getElementById('refresh-text');

let selectedFile = null;
let pollInterval = null;

// =============================================================================
// File Selection Handlers
// =============================================================================

if (dropZone) {
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
}

if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    });
}

function handleFileSelect(file) {
    selectedFile = file;
    fileName.textContent = file.name;
    fileName.classList.remove('hidden');
    buildBtn.disabled = false;
}

// =============================================================================
// Build Submission
// =============================================================================

if (uploadForm) {
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

            buildBtn.textContent = 'Build Started!';

        } catch (error) {
            console.error('Build start error:', error);
            alert('Failed to start build. Please try again.');
            buildBtn.disabled = false;
            buildBtn.textContent = 'Start Build';
        }
    });
}

// =============================================================================
// Status Polling
// =============================================================================

function startStatusPolling(buildId) {
    // Also show the active build section
    if (activeBuildSection) {
        activeBuildSection.classList.remove('hidden');
    }

    pollInterval = setInterval(async () => {
        try {
            const response = await fetch(CONFIG.N8N_BASE_URL + CONFIG.ENDPOINTS.CHECK_STATUS);

            if (!response.ok) throw new Error('Status check failed');

            const result = await response.json();
            const status = result.data || result;

            // Update inline status
            updateStatus(status.status, status.phase, status.progress);

            // Update active build section
            updateActiveBuild(status);

            if (status.status === 'complete') {
                stopStatusPolling();
                if (status.mcp_download_url || status.mcpDownloadUrl) {
                    mcpDownload.href = status.mcp_download_url || status.mcpDownloadUrl;
                    mcpResult.classList.remove('hidden');
                }
                buildBtn.textContent = 'Build Complete!';
            } else if (status.status === 'failed') {
                stopStatusPolling();
                statusBadge.className = 'px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded';
                statusBadge.textContent = 'Failed';
                buildBtn.disabled = false;
                buildBtn.textContent = 'Retry Build';
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
    } else if (status === 'failed') {
        statusBadge.className = 'px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded';
        statusBadge.textContent = 'Failed';
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
    statusPhase.textContent = phaseLabels[phase] || phase || 'Initializing...';

    // Update progress bar
    const progressValue = progress || 0;
    progressBar.style.width = `${progressValue}%`;
    progressText.textContent = `${progressValue}%`;
}

function updateActiveBuild(status) {
    if (!activeBuildSection) return;

    // Extract project name from prd_file or build_id
    const projectName = status.project ||
        (status.prd_file ? status.prd_file.replace('-PRD.yaml', '').replace('.yaml', '') : null) ||
        (status.build_id ? status.build_id.split('-').slice(0, -1).join('-') : 'Unknown');

    activeBuildName.textContent = projectName;
    activeBuildId.textContent = status.build_id || status.buildId || '-';

    // Update badge
    if (status.status === 'complete') {
        activeStatusBadge.className = 'px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full';
        activeStatusBadge.textContent = 'Complete';
    } else if (status.status === 'running') {
        activeStatusBadge.className = 'px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded-full';
        activeStatusBadge.textContent = 'Building';
    } else if (status.status === 'idle') {
        activeStatusBadge.className = 'px-3 py-1 bg-gray-500/20 text-gray-400 text-sm rounded-full';
        activeStatusBadge.textContent = 'Idle';
    } else {
        activeStatusBadge.className = 'px-3 py-1 bg-blue-500/20 text-blue-400 text-sm rounded-full';
        activeStatusBadge.textContent = status.status || 'Unknown';
    }

    // Update phase and progress
    const phaseLabels = {
        'prd_uploaded': 'PRD Uploaded',
        'implementation': 'Building',
        'testing': 'Testing',
        'documentation': 'Documenting',
        'packaging': 'Packaging',
        'complete': 'Complete'
    };
    activePhase.textContent = phaseLabels[status.phase] || status.phase || '-';

    const progressValue = status.progress || 0;
    activeProgressBar.style.width = `${progressValue}%`;
    activeProgressText.textContent = `${progressValue}%`;

    // Show download if complete
    if (status.status === 'complete' && (status.mcp_download_url || status.mcpDownloadUrl)) {
        activeDownloadLink.href = status.mcp_download_url || status.mcpDownloadUrl;
        activeDownload.classList.remove('hidden');
    }
}

// =============================================================================
// Initial Status Check
// =============================================================================

async function checkInitialStatus() {
    try {
        const response = await fetch(CONFIG.N8N_BASE_URL + CONFIG.ENDPOINTS.CHECK_STATUS);
        if (!response.ok) return;

        const result = await response.json();
        const status = result.data || result;

        // Only show active build section if there's an active or recent build
        if (status.status && status.status !== 'idle') {
            activeBuildSection.classList.remove('hidden');
            updateActiveBuild(status);

            // If build is running, start polling
            if (status.status === 'running') {
                startStatusPolling(status.build_id);
            }
        }
    } catch (error) {
        console.error('Initial status check failed:', error);
    }
}

// Check status on page load
document.addEventListener('DOMContentLoaded', checkInitialStatus);

// =============================================================================
// Manual Refresh
// =============================================================================

async function refreshBuildStatus() {
    if (!refreshBtn) return;

    // Show refreshing state
    refreshBtn.disabled = true;
    refreshIcon.classList.add('animate-spin');
    refreshText.textContent = 'Refreshing...';

    try {
        const response = await fetch(CONFIG.N8N_BASE_URL + CONFIG.ENDPOINTS.CHECK_STATUS);
        if (!response.ok) throw new Error('Status check failed');

        const result = await response.json();
        const status = result.data || result;

        // Show build section if there's any status
        if (status.status && activeBuildSection) {
            activeBuildSection.classList.remove('hidden');
            updateActiveBuild(status);
        }

        // Update inline status if visible
        if (buildStatus && !buildStatus.classList.contains('hidden')) {
            updateStatus(status.status, status.phase, status.progress);
        }

    } catch (error) {
        console.error('Refresh failed:', error);
    } finally {
        // Reset button state
        refreshBtn.disabled = false;
        refreshIcon.classList.remove('animate-spin');
        refreshText.textContent = 'Refresh';
    }
}

// Attach refresh click handler
if (refreshBtn) {
    refreshBtn.addEventListener('click', refreshBuildStatus);
}
