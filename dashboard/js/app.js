/**
 * MCP Factory Dashboard - Application Logic
 * Handles view switching, event binding, and UI interactions
 */

// Configuration
const CONFIG = {
    // External PRD Design Wizard URL (n8n form)
    wizardUrl: 'https://im4tlai.app.n8n.cloud/form/grimlock-wizard',
    // API base URL for dashboard integration
    apiUrl: 'https://im4tlai.app.n8n.cloud'
};

// Track active confirm callback
let confirmCallback = null;

/**
 * Show a specific view and hide others
 * @param {string} viewName - The data-view attribute value to show
 */
function showView(viewName) {
    document.querySelectorAll('[data-view]').forEach(el => {
        el.classList.add('hidden');
    });

    const targetView = document.querySelector(`[data-view="${viewName}"]`);
    if (targetView) {
        targetView.classList.remove('hidden');
    }

    updateNavigation(viewName);
}

/**
 * Update sidebar navigation active state
 * @param {string} activeView - The currently active view
 */
function updateNavigation(activeView) {
    document.querySelectorAll('.nav-link').forEach(link => {
        const navTarget = link.dataset.nav;
        link.classList.remove('text-primary', 'dark:bg-[#282e39]', 'dark:text-white');
        link.classList.add('text-slate-600', 'dark:text-text-secondary');

        if (navTarget === activeView) {
            link.classList.add('text-primary', 'dark:bg-[#282e39]', 'dark:text-white');
            link.classList.remove('text-slate-600', 'dark:text-text-secondary');
        }
    });
}

// ==========================================
// MODAL HELPERS
// ==========================================

/**
 * Open the upload modal
 */
function openUploadModal() {
    const modal = document.getElementById('upload-modal');
    if (modal) modal.classList.remove('hidden');
}

/**
 * Close the upload modal
 */
function closeUploadModal() {
    const modal = document.getElementById('upload-modal');
    if (modal) modal.classList.add('hidden');
}

/**
 * Show the wizard unavailable modal
 */
function showWizardUnavailableModal() {
    const modal = document.getElementById('wizard-unavailable-modal');
    if (modal) modal.classList.remove('hidden');
}

/**
 * Close the wizard unavailable modal
 */
function closeWizardUnavailableModal() {
    const modal = document.getElementById('wizard-unavailable-modal');
    if (modal) modal.classList.add('hidden');
}

/**
 * Show the coming soon modal with custom feature name
 * @param {string} featureName - Name of the feature
 */
function showComingSoonModal(featureName) {
    const modal = document.getElementById('coming-soon-modal');
    const title = document.getElementById('coming-soon-title');
    const message = document.getElementById('coming-soon-message');

    if (modal) {
        const formattedName = featureName.charAt(0).toUpperCase() + featureName.slice(1);
        title.textContent = `${formattedName} Coming Soon`;
        message.textContent = `The ${formattedName} feature is under development and will be available in a future update.`;
        modal.classList.remove('hidden');
    }
}

/**
 * Close the coming soon modal
 */
function closeComingSoonModal() {
    const modal = document.getElementById('coming-soon-modal');
    if (modal) modal.classList.add('hidden');
}

/**
 * Show confirmation modal
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @param {function} onConfirm - Callback when confirmed
 * @param {string} confirmText - Text for confirm button (default: "Confirm")
 * @param {boolean} isDanger - Use danger styling (default: false)
 */
function showConfirmModal(title, message, onConfirm, confirmText = 'Confirm', isDanger = false) {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-title');
    const messageEl = document.getElementById('confirm-message');
    const confirmBtn = document.getElementById('confirm-ok');
    const iconContainer = document.getElementById('confirm-icon-container');
    const icon = document.getElementById('confirm-icon');

    if (modal) {
        titleEl.textContent = title;
        messageEl.textContent = message;
        confirmBtn.textContent = confirmText;

        // Update styling based on danger
        if (isDanger) {
            iconContainer.className = 'size-10 rounded-full bg-rose-500/20 flex items-center justify-center';
            icon.className = 'material-symbols-outlined text-rose-500';
            icon.textContent = 'warning';
            confirmBtn.className = 'px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium transition-all';
        } else {
            iconContainer.className = 'size-10 rounded-full bg-amber-500/20 flex items-center justify-center';
            icon.className = 'material-symbols-outlined text-amber-500';
            icon.textContent = 'warning';
            confirmBtn.className = 'px-5 py-2.5 rounded-lg bg-primary hover:bg-blue-600 text-white font-medium shadow-lg shadow-primary/25 transition-all';
        }

        confirmCallback = onConfirm;
        modal.classList.remove('hidden');
    }
}

/**
 * Close confirmation modal
 */
function closeConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    if (modal) modal.classList.add('hidden');
    confirmCallback = null;
}

/**
 * Show info modal
 * @param {string} title - Modal title
 * @param {string} content - HTML content for the modal body
 */
function showInfoModal(title, content) {
    const modal = document.getElementById('info-modal');
    const titleEl = document.getElementById('info-title');
    const contentEl = document.getElementById('info-content');

    if (modal) {
        titleEl.textContent = title;
        contentEl.innerHTML = content;
        modal.classList.remove('hidden');
    }
}

/**
 * Close info modal
 */
function closeInfoModal() {
    const modal = document.getElementById('info-modal');
    if (modal) modal.classList.add('hidden');
}

/**
 * Close any open modal on Escape key
 */
function closeAllModals() {
    closeUploadModal();
    closeWizardUnavailableModal();
    closeComingSoonModal();
    closeConfirmModal();
    closeInfoModal();
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        Toast.success('Copied to clipboard');
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        Toast.success('Copied to clipboard');
    }
}

/**
 * Simulate downloading logs
 */
function downloadDemoLogs() {
    Toast.info('Preparing logs for download...');

    // Simulate download delay
    setTimeout(() => {
        const logContent = `[Build Log - Generated ${new Date().toISOString()}]
================================================================================
[10:42:01] INFO  Initializing build environment...
[10:42:02] INFO  Loading MCP configuration v2.1.0
[10:42:05] INFO  PRD analysis complete. Confidence: 94%
[10:42:06] SUCCESS Schema validation passed for 12 models.
[10:42:08] INFO  Starting Code Generation Module...
[10:42:15] INFO  Generating payment_gateway.ts...
[10:42:18] INFO  Generating transaction_logger.ts...
[10:42:22] WARN  Deprecated method usage detected in auth_utils.ts:45
[10:42:22] INFO  Auto-correcting deprecation... DONE
[10:42:25] INFO  Running unit tests (Batch 1/4)...
[10:42:28] PASS  PaymentControllerTest.createOrder
[10:42:29] PASS  PaymentControllerTest.validateCard
[10:42:31] INFO  Generating invoice_generator.ts...
[10:42:35] INFO  Compressing assets...
[10:42:40] SUCCESS Build completed successfully!
================================================================================`;

        const blob = new Blob([logContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'build-logs.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Toast.success('Logs downloaded');
    }, 500);
}

/**
 * Simulate downloading the package
 */
function downloadDemoPackage() {
    Toast.info('Preparing package for download...');

    // Simulate download delay
    setTimeout(() => {
        const manifest = `# MCP Package Manifest
# Generated: ${new Date().toISOString()}
# Build ID: 8823-AF

Package: data-pipeline-connector-v1.0.4.zip
Size: 4.2 MB
Files: 12

Contents:
- src/main.py
- src/utils.py
- src/db_connector.py
- tests/test_main.py
- tests/test_utils.py
- config.json
- package.json
- README.md
- LICENSE
- .gitignore
- requirements.txt
- setup.py

Checksums:
SHA256: 8f14e45fceea167a5a36dedd4bea2543
MD5: a3dcb4d229de6fde0db5686dee47145d

---
This is a demo manifest. In production, the actual package would be downloaded.`;

        const blob = new Blob([manifest], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'package-manifest.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Toast.success('Package manifest downloaded');
    }, 800);
}

// ==========================================
// CONFIGURATION MANAGEMENT
// ==========================================

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
    wizardUrl: 'https://im4tlai.app.n8n.cloud/form/grimlock-wizard',
    apiUrl: 'https://im4tlai.app.n8n.cloud',
    defaultSdk: 'typescript',
    githubTarget: 'm2ai-mcp-servers',
    customGithubUrl: '',
    outputDir: '/home/ubuntu/projects/mcp/'
};

/**
 * Get current configuration from localStorage
 * @returns {object} Configuration object
 */
function getConfig() {
    const stored = localStorage.getItem('grimlock-config');
    if (stored) {
        try {
            return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
        } catch (e) {
            console.error('Failed to parse config:', e);
        }
    }
    return { ...DEFAULT_CONFIG };
}

/**
 * Save configuration to localStorage
 * @param {object} config - Configuration to save
 */
function saveConfig(config) {
    localStorage.setItem('grimlock-config', JSON.stringify(config));
    // Update the runtime CONFIG object
    CONFIG.wizardUrl = config.wizardUrl;
    CONFIG.apiUrl = config.apiUrl;
}

/**
 * Load configuration values into the form
 */
function loadConfigToForm() {
    const config = getConfig();

    const wizardUrlInput = document.getElementById('config-wizard-url');
    const apiUrlInput = document.getElementById('config-api-url');
    const defaultSdkSelect = document.getElementById('config-default-sdk');
    const githubTargetSelect = document.getElementById('config-github-target');
    const customGithubUrlInput = document.getElementById('config-custom-github-url');
    const outputDirInput = document.getElementById('config-output-dir');
    const customGithubContainer = document.getElementById('custom-github-url-container');

    if (wizardUrlInput) wizardUrlInput.value = config.wizardUrl;
    if (apiUrlInput) apiUrlInput.value = config.apiUrl;
    if (defaultSdkSelect) defaultSdkSelect.value = config.defaultSdk;
    if (githubTargetSelect) githubTargetSelect.value = config.githubTarget;
    if (customGithubUrlInput) customGithubUrlInput.value = config.customGithubUrl;
    if (outputDirInput) outputDirInput.value = config.outputDir;

    // Show/hide custom URL field
    if (customGithubContainer) {
        if (config.githubTarget === 'custom') {
            customGithubContainer.classList.remove('hidden');
        } else {
            customGithubContainer.classList.add('hidden');
        }
    }
}

/**
 * Get configuration values from the form
 * @returns {object} Configuration from form inputs
 */
function getConfigFromForm() {
    return {
        wizardUrl: document.getElementById('config-wizard-url')?.value || DEFAULT_CONFIG.wizardUrl,
        apiUrl: document.getElementById('config-api-url')?.value || DEFAULT_CONFIG.apiUrl,
        defaultSdk: document.getElementById('config-default-sdk')?.value || DEFAULT_CONFIG.defaultSdk,
        githubTarget: document.getElementById('config-github-target')?.value || DEFAULT_CONFIG.githubTarget,
        customGithubUrl: document.getElementById('config-custom-github-url')?.value || '',
        outputDir: document.getElementById('config-output-dir')?.value || DEFAULT_CONFIG.outputDir
    };
}

/**
 * Initialize configuration event listeners
 */
function initConfigEventListeners() {
    // GitHub target dropdown - show/hide custom URL field
    const githubTargetSelect = document.getElementById('config-github-target');
    if (githubTargetSelect) {
        githubTargetSelect.addEventListener('change', (e) => {
            const customContainer = document.getElementById('custom-github-url-container');
            if (customContainer) {
                if (e.target.value === 'custom') {
                    customContainer.classList.remove('hidden');
                } else {
                    customContainer.classList.add('hidden');
                }
            }
        });
    }

    // Save button
    const saveBtn = document.getElementById('config-save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const config = getConfigFromForm();
            saveConfig(config);
            Toast.success('Configuration saved');
        });
    }

    // Reset button
    const resetBtn = document.getElementById('config-reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            showConfirmModal(
                'Reset Configuration',
                'Are you sure you want to reset all settings to their default values?',
                () => {
                    saveConfig(DEFAULT_CONFIG);
                    loadConfigToForm();
                    Toast.info('Configuration reset to defaults');
                },
                'Reset'
            );
        });
    }

    // Test Connection button
    const testBtn = document.getElementById('test-n8n-connection');
    if (testBtn) {
        testBtn.addEventListener('click', async () => {
            const apiUrl = document.getElementById('config-api-url')?.value;
            if (!apiUrl) {
                Toast.error('Please enter an API URL first');
                return;
            }

            Toast.info('Testing connection...');

            try {
                // Try to fetch the n8n health endpoint
                const response = await fetch(`${apiUrl}/healthz`, {
                    method: 'GET',
                    mode: 'no-cors' // n8n may not have CORS headers
                });
                // With no-cors, we can't read the response but if it doesn't throw, connection exists
                Toast.success('Connection successful (n8n reachable)');
            } catch (error) {
                Toast.warning('Could not verify connection (CORS may be blocking)');
            }
        });
    }
}

/**
 * Apply saved configuration on startup
 */
function applyStoredConfig() {
    const config = getConfig();
    CONFIG.wizardUrl = config.wizardUrl;
    CONFIG.apiUrl = config.apiUrl;
}

// ==========================================
// SETTINGS MANAGEMENT
// ==========================================

/**
 * Default settings values
 */
const DEFAULT_SETTINGS = {
    theme: 'dark',
    compact: false,
    notifyComplete: true,
    notifyErrors: true,
    sound: false
};

/**
 * Get current settings from localStorage
 * @returns {object} Settings object
 */
function getSettings() {
    const stored = localStorage.getItem('grimlock-settings');
    if (stored) {
        try {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        } catch (e) {
            console.error('Failed to parse settings:', e);
        }
    }
    return { ...DEFAULT_SETTINGS };
}

/**
 * Save settings to localStorage
 * @param {object} settings - Settings to save
 */
function saveSettings(settings) {
    localStorage.setItem('grimlock-settings', JSON.stringify(settings));
}

/**
 * Load settings values into the form
 */
function loadSettingsToForm() {
    const settings = getSettings();

    const themeSelect = document.getElementById('settings-theme');
    const compactCheckbox = document.getElementById('settings-compact');
    const notifyCompleteCheckbox = document.getElementById('settings-notify-complete');
    const notifyErrorsCheckbox = document.getElementById('settings-notify-errors');
    const soundCheckbox = document.getElementById('settings-sound');

    if (themeSelect) themeSelect.value = settings.theme;
    if (compactCheckbox) compactCheckbox.checked = settings.compact;
    if (notifyCompleteCheckbox) notifyCompleteCheckbox.checked = settings.notifyComplete;
    if (notifyErrorsCheckbox) notifyErrorsCheckbox.checked = settings.notifyErrors;
    if (soundCheckbox) soundCheckbox.checked = settings.sound;
}

/**
 * Get settings values from the form
 * @returns {object} Settings from form inputs
 */
function getSettingsFromForm() {
    return {
        theme: document.getElementById('settings-theme')?.value || DEFAULT_SETTINGS.theme,
        compact: document.getElementById('settings-compact')?.checked || false,
        notifyComplete: document.getElementById('settings-notify-complete')?.checked || false,
        notifyErrors: document.getElementById('settings-notify-errors')?.checked || false,
        sound: document.getElementById('settings-sound')?.checked || false
    };
}

/**
 * Initialize settings event listeners
 */
function initSettingsEventListeners() {
    // Save button
    const saveBtn = document.getElementById('settings-save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const settings = getSettingsFromForm();
            saveSettings(settings);
            Toast.success('Settings saved');
        });
    }
}

// ==========================================
// PROGRESS PAGE - API INTEGRATION
// ==========================================

/**
 * Initialize the Progress page with real API data
 */
function initProgressPage() {
    if (typeof GrimlockAPI === 'undefined') {
        console.warn('[Progress] GrimlockAPI not available, showing demo data');
        return;
    }

    console.log('[Progress] Starting real-time data polling...');

    // Start polling for build status
    GrimlockAPI.startPolling('/grimlock/build-status', (response, error) => {
        if (error) {
            console.error('[Progress] API error:', error);
            Toast.error('Failed to fetch build status');
            return;
        }

        if (response && response.success) {
            updateProgressUI(response.data);
        } else if (response && response._stale) {
            updateProgressUI(response.data);
            Toast.warning('Showing cached data - connection issues');
        }
    }, 30000); // Poll every 30 seconds
}

/**
 * Stop Progress page polling when navigating away
 */
function cleanupProgressPage() {
    if (typeof GrimlockAPI !== 'undefined') {
        GrimlockAPI.stopPolling('/grimlock/build-status');
        console.log('[Progress] Stopped polling');
    }
}

/**
 * Update Progress page UI with API data
 * @param {object} data - Build status data from API
 */
function updateProgressUI(data) {
    if (!data) return;

    const { sprint, currentPosition, progress, successCriteria, escalations, recentActions } = data;

    // Update build title
    const buildTitle = document.getElementById('build-title');
    if (buildTitle && sprint) {
        buildTitle.textContent = sprint.projectName || 'No Active Build';
    }

    // Update status badge
    const statusText = document.getElementById('build-status-text');
    const statusBadge = document.getElementById('build-status-badge');
    if (statusText && statusBadge && sprint) {
        const status = sprint.status || 'unknown';
        statusText.textContent = status.charAt(0).toUpperCase() + status.slice(1);

        // Update badge styling based on status
        statusBadge.className = statusBadge.className.replace(
            /bg-\w+-500\/10|text-\w+-600|text-\w+-400|border-\w+-500\/20/g, ''
        );

        const statusStyles = {
            running: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
            completed: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
            paused: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
            aborted: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
            not_started: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
        };

        statusBadge.className += ' ' + (statusStyles[status] || statusStyles.not_started);
    }

    // Update started time
    const startedTime = document.getElementById('build-started-time');
    if (startedTime && sprint && sprint.startedAt) {
        startedTime.textContent = formatRelativeTime(sprint.startedAt);
    } else if (startedTime) {
        startedTime.textContent = 'Not started';
    }

    // Update progress bar and percentage
    const progressPercent = document.getElementById('progress-percent');
    const progressBar = document.getElementById('progress-bar');
    if (progressPercent && progressBar && progress) {
        const percent = progress.percent || 0;
        progressPercent.textContent = `${percent}%`;
        progressBar.style.width = `${percent}%`;
    }

    // Update metrics
    const tasksCompleted = document.getElementById('metric-tasks-completed');
    if (tasksCompleted && progress) {
        const completedCount = (progress.milestonesCompleted || []).length;
        tasksCompleted.textContent = completedCount.toString();
    }

    const criteriaPassed = document.getElementById('metric-criteria-passed');
    if (criteriaPassed && successCriteria) {
        criteriaPassed.textContent = `${successCriteria.passed}/${successCriteria.total}`;
    }

    const escalationsEl = document.getElementById('metric-escalations');
    if (escalationsEl && escalations) {
        escalationsEl.textContent = (escalations.totalCount || 0).toString();
    }

    const criteriaFailed = document.getElementById('metric-criteria-failed');
    if (criteriaFailed && successCriteria) {
        criteriaFailed.textContent = (successCriteria.failed || 0).toString();
    }

    // Update PRD confidence
    const prdConfidence = document.getElementById('prd-confidence-value');
    const prdGauge = document.getElementById('prd-confidence-gauge');
    if (prdConfidence && successCriteria) {
        const confidence = successCriteria.total > 0
            ? Math.round((successCriteria.passed / successCriteria.total) * 100)
            : 0;
        prdConfidence.textContent = `${confidence}%`;

        // Update conic gradient
        if (prdGauge) {
            prdGauge.style.background = `conic-gradient(#135bec 0% ${confidence}%, #334155 ${confidence}% 100%)`;
        }
    }

    // Update current milestone in console
    if (currentPosition) {
        console.log(`[Progress] Current: ${currentPosition.milestoneName} - ${currentPosition.taskDescription}`);
    }
}

/**
 * Format a date string as relative time (e.g., "Started 2m ago")
 * @param {string} dateString - ISO date string
 * @returns {string} Relative time string
 */
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Started just now';
    if (diffMins < 60) return `Started ${diffMins}m ago`;
    if (diffHours < 24) return `Started ${diffHours}h ago`;
    return `Started ${diffDays}d ago`;
}

// ==========================================
// LOGS PAGE - API INTEGRATION
// ==========================================

// Store current logs data for filtering/pagination
let currentLogsData = [];
let currentLogsFilter = 'all';

/**
 * Initialize the Logs page with real API data
 */
async function initLogsPage() {
    if (typeof GrimlockAPI === 'undefined') {
        console.warn('[Logs] GrimlockAPI not available, showing demo data');
        showDemoLogs();
        return;
    }

    console.log('[Logs] Fetching build history...');

    try {
        const response = await GrimlockAPI.getBuildHistory();

        if (response && response.success) {
            currentLogsData = response.data.builds || [];
            updateLogsUI(currentLogsData);
        } else {
            console.error('[Logs] API returned error:', response?.error);
            Toast.error('Failed to load build history');
            showDemoLogs();
        }
    } catch (error) {
        console.error('[Logs] API error:', error);
        Toast.error('Failed to connect to API');
        showDemoLogs();
    }
}

/**
 * Show demo/fallback logs data
 */
function showDemoLogs() {
    const demoData = [
        { id: '4092', name: 'Payment Module', status: 'success', duration: 14, startedAt: new Date().toISOString() },
        { id: '4091', name: 'Auth Service', status: 'success', duration: 22, startedAt: new Date(Date.now() - 86400000).toISOString() },
        { id: '4090', name: 'Data Sync', status: 'warning', duration: 18, startedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
        { id: '4089', name: 'Email Service', status: 'error', duration: 8, startedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
        { id: '4088', name: 'Analytics MCP', status: 'success', duration: 31, startedAt: new Date(Date.now() - 86400000 * 4).toISOString() }
    ];
    currentLogsData = demoData;
    updateLogsUI(demoData);
}

/**
 * Update Logs page UI with API data
 * @param {Array} builds - Array of build objects from API
 */
function updateLogsUI(builds) {
    const logsList = document.getElementById('logs-list');
    const loadingEl = document.getElementById('logs-loading');
    const emptyEl = document.getElementById('logs-empty');
    const countBadge = document.getElementById('logs-count-badge');
    const paginationInfo = document.getElementById('logs-pagination-info');

    // Hide loading state
    if (loadingEl) loadingEl.classList.add('hidden');

    // Apply filter
    let filteredBuilds = builds;
    if (currentLogsFilter !== 'all') {
        filteredBuilds = builds.filter(b => b.status === currentLogsFilter);
    }

    // Update count badge
    if (countBadge) {
        countBadge.textContent = `${filteredBuilds.length} entries`;
    }

    // Update pagination info
    if (paginationInfo) {
        paginationInfo.textContent = `Showing ${filteredBuilds.length} of ${builds.length} entries`;
    }

    // Show empty state if no builds
    if (filteredBuilds.length === 0) {
        if (emptyEl) emptyEl.classList.remove('hidden');
        // Remove any existing log entries (but keep loading/empty states)
        logsList.querySelectorAll('.log-entry').forEach(el => el.remove());
        return;
    }

    // Hide empty state
    if (emptyEl) emptyEl.classList.add('hidden');

    // Remove existing log entries (but keep loading/empty states)
    logsList.querySelectorAll('.log-entry').forEach(el => el.remove());

    // Generate and insert new log entries
    filteredBuilds.forEach(build => {
        const entryHtml = createLogEntryHtml(build);
        logsList.insertAdjacentHTML('beforeend', entryHtml);
    });

    // Re-attach click listeners to new entries
    attachLogEntryListeners();
}

/**
 * Create HTML for a single log entry
 * @param {object} build - Build object
 * @returns {string} HTML string
 */
function createLogEntryHtml(build) {
    const statusConfig = {
        success: {
            bgColor: 'bg-emerald-500/20',
            textColor: 'text-emerald-500',
            icon: 'check_circle',
            badgeBg: 'bg-emerald-500/10',
            badgeText: 'text-emerald-600 dark:text-emerald-400',
            label: 'Success'
        },
        error: {
            bgColor: 'bg-rose-500/20',
            textColor: 'text-rose-500',
            icon: 'error',
            badgeBg: 'bg-rose-500/10',
            badgeText: 'text-rose-600 dark:text-rose-400',
            label: 'Failed'
        },
        warning: {
            bgColor: 'bg-amber-500/20',
            textColor: 'text-amber-500',
            icon: 'warning',
            badgeBg: 'bg-amber-500/10',
            badgeText: 'text-amber-600 dark:text-amber-400',
            label: 'Warning'
        },
        running: {
            bgColor: 'bg-blue-500/20',
            textColor: 'text-blue-500',
            icon: 'sync',
            badgeBg: 'bg-blue-500/10',
            badgeText: 'text-blue-600 dark:text-blue-400',
            label: 'Running'
        }
    };

    const config = statusConfig[build.status] || statusConfig.success;
    const dateInfo = formatLogDate(build.startedAt || build.stoppedAt);
    const duration = build.duration ? `${Math.round(build.duration)}s` : '--';
    const buildName = build.name || build.workflowName || 'Unknown Build';
    const shortId = (build.id || '').substring(0, 8);

    return `
        <div class="log-entry flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-surface-darker cursor-pointer transition-colors" data-log-id="${build.id}">
            <div class="size-10 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0">
                <span class="material-symbols-outlined ${config.textColor}">${config.icon}</span>
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-slate-900 dark:text-white">${buildName}</span>
                    <span class="px-2 py-0.5 rounded-full ${config.badgeBg} ${config.badgeText} text-xs font-medium">${config.label}</span>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Duration: ${duration} • ID: ${shortId}</p>
            </div>
            <div class="text-right flex-shrink-0">
                <p class="text-sm text-slate-700 dark:text-slate-300 font-medium">${dateInfo.date}</p>
                <p class="text-xs text-slate-400">${dateInfo.time}</p>
            </div>
            <span class="material-symbols-outlined text-slate-400">chevron_right</span>
        </div>
    `;
}

/**
 * Format date for log entries
 * @param {string} dateString - ISO date string
 * @returns {object} { date, time }
 */
function formatLogDate(dateString) {
    if (!dateString) return { date: '--', time: '--' };

    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / 86400000);

    let dateLabel;
    if (diffDays === 0) {
        dateLabel = 'Today';
    } else if (diffDays === 1) {
        dateLabel = 'Yesterday';
    } else {
        dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    const timeLabel = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    return { date: dateLabel, time: timeLabel };
}

/**
 * Attach click listeners to log entries
 */
function attachLogEntryListeners() {
    document.querySelectorAll('.log-entry').forEach(entry => {
        entry.addEventListener('click', () => {
            const logId = entry.dataset.logId;
            // Navigate to Complete page with build ID
            Router.navigate(`/complete?id=${logId}`);
        });
    });
}

/**
 * Initialize logs page event listeners
 */
function initLogsEventListeners() {
    // Filter dropdown
    const filterSelect = document.getElementById('logs-filter-status');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            currentLogsFilter = e.target.value;
            if (currentLogsData.length > 0) {
                updateLogsUI(currentLogsData);
            }
        });
    }

    // Refresh button
    const refreshBtn = document.getElementById('logs-refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            Toast.info('Refreshing logs...');
            await initLogsPage();
            Toast.success('Logs refreshed');
        });
    }

    // Export button
    const exportBtn = document.getElementById('logs-export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            downloadDemoLogs();
        });
    }
}

// ==========================================
// COMPLETE PAGE - API INTEGRATION
// ==========================================

// Store current build ID
let currentBuildId = null;

/**
 * Initialize the Complete page with real API data
 * @param {string} buildId - The build/execution ID to fetch details for
 */
async function initCompletePage(buildId) {
    currentBuildId = buildId;

    if (!buildId) {
        console.warn('[Complete] No build ID provided, showing placeholder');
        showDemoComplete();
        return;
    }

    if (typeof GrimlockAPI === 'undefined') {
        console.warn('[Complete] GrimlockAPI not available, showing demo data');
        showDemoComplete();
        return;
    }

    console.log(`[Complete] Fetching build details for ID: ${buildId}`);

    try {
        const response = await GrimlockAPI.getBuildDetails(buildId);

        if (response && response.success) {
            updateCompleteUI(response.data);
        } else {
            console.error('[Complete] API returned error:', response?.error);
            Toast.error('Failed to load build details');
            showDemoComplete();
        }
    } catch (error) {
        console.error('[Complete] API error:', error);
        Toast.error('Failed to connect to API');
        showDemoComplete();
    }
}

/**
 * Show demo/fallback complete data
 */
function showDemoComplete() {
    const demoData = {
        execution: {
            id: 'demo-8823-AF',
            status: 'success',
            startedAt: new Date(Date.now() - 14000).toISOString(),
            stoppedAt: new Date().toISOString(),
            mode: 'manual',
            workflowName: 'Demo Build - Data Pipeline',
            finished: true
        },
        project: {
            name: 'Demo Project',
            status: 'completed',
            projectName: 'Data-Pipeline-Connector'
        },
        artifacts: {
            mcpProjects: ['data-pipeline-connector'],
            projectPath: '/home/ubuntu/projects/mcp/'
        }
    };
    updateCompleteUI(demoData);
}

/**
 * Update Complete page UI with API data
 * @param {object} data - Build details data from API
 */
function updateCompleteUI(data) {
    if (!data) return;

    const { execution, project, artifacts } = data;

    // Update MCP Name
    const mcpName = document.getElementById('complete-mcp-name');
    if (mcpName) {
        mcpName.textContent = project?.projectName || execution?.workflowName || 'Unknown';
    }

    // Update Build ID
    const buildIdValue = document.getElementById('build-id-value');
    if (buildIdValue && execution) {
        const shortId = (execution.id || '').substring(0, 12);
        buildIdValue.textContent = shortId || '--';
    }

    // Update Status
    const statusEl = document.getElementById('complete-status');
    if (statusEl && execution) {
        const status = execution.status || 'unknown';
        statusEl.textContent = status.charAt(0).toUpperCase() + status.slice(1);

        // Update status color
        const statusColors = {
            success: 'text-emerald-400',
            error: 'text-rose-400',
            running: 'text-blue-400',
            waiting: 'text-amber-400'
        };
        statusEl.className = `font-medium text-sm ${statusColors[status] || 'text-white'}`;
    }

    // Update Duration
    const durationEl = document.getElementById('complete-duration');
    if (durationEl && execution) {
        if (execution.startedAt && execution.stoppedAt) {
            const start = new Date(execution.startedAt);
            const end = new Date(execution.stoppedAt);
            const diffMs = end - start;
            const diffSecs = Math.round(diffMs / 1000);
            durationEl.textContent = `${diffSecs}s`;
        } else {
            durationEl.textContent = '--';
        }
    }

    // Update Completed At
    const timestampEl = document.getElementById('complete-timestamp');
    if (timestampEl && execution && execution.stoppedAt) {
        const date = new Date(execution.stoppedAt);
        timestampEl.textContent = date.toLocaleString();
    }

    // Update Workflow Name
    const workflowName = document.getElementById('complete-workflow-name');
    if (workflowName && execution) {
        workflowName.textContent = execution.workflowName || 'GRIMLOCK Build Workflow';
    }

    // Update execution info badges
    const startedAt = document.getElementById('complete-started-at');
    if (startedAt && execution && execution.startedAt) {
        const date = new Date(execution.startedAt);
        startedAt.textContent = date.toLocaleTimeString();
    }

    const finishedAt = document.getElementById('complete-finished-at');
    if (finishedAt && execution && execution.stoppedAt) {
        const date = new Date(execution.stoppedAt);
        finishedAt.textContent = date.toLocaleTimeString();
    }

    const modeEl = document.getElementById('complete-mode');
    if (modeEl && execution) {
        modeEl.textContent = execution.mode || 'Manual';
    }

    // Update Project Info section
    const projectList = document.getElementById('complete-project-list');
    const projectCount = document.getElementById('complete-project-count');
    const projectPath = document.getElementById('complete-project-path');

    if (artifacts && artifacts.mcpProjects && artifacts.mcpProjects.length > 0) {
        const projects = artifacts.mcpProjects;

        if (projectCount) {
            projectCount.textContent = `${projects.length} project${projects.length !== 1 ? 's' : ''}`;
        }

        if (projectPath && artifacts.projectPath) {
            projectPath.textContent = artifacts.projectPath;
        }

        if (projectList) {
            projectList.innerHTML = `
                <ul class="space-y-2 text-text-secondary">
                    ${projects.map(proj => `
                        <li class="flex items-center gap-2 hover:text-white transition-colors">
                            <span class="material-symbols-outlined text-lg text-primary">folder</span>
                            <span>${proj}/</span>
                        </li>
                    `).join('')}
                </ul>
            `;
        }
    } else {
        if (projectCount) projectCount.textContent = 'No projects';
        if (projectPath) projectPath.textContent = project?.projectName ? `/home/ubuntu/projects/mcp/${project.projectName}` : '--';
        if (projectList) {
            projectList.innerHTML = `
                <div class="text-center py-8 text-text-secondary">
                    <span class="material-symbols-outlined text-3xl mb-2">folder_off</span>
                    <p>No MCP projects found</p>
                </div>
            `;
        }
    }
}

/**
 * Get build ID from URL query string
 * @returns {string|null} Build ID or null
 */
function getBuildIdFromUrl() {
    const hash = window.location.hash;
    const queryIndex = hash.indexOf('?');
    if (queryIndex === -1) return null;

    const queryString = hash.substring(queryIndex + 1);
    const params = new URLSearchParams(queryString);
    return params.get('id');
}

/**
 * Initialize analytics page event listeners
 */
function initAnalyticsEventListeners() {
    // Time range dropdown
    const timeRangeSelect = document.getElementById('analytics-time-range');
    if (timeRangeSelect) {
        timeRangeSelect.addEventListener('change', (e) => {
            Toast.info(`Time range: ${e.target.options[e.target.selectedIndex].text} (demo mode)`);
        });
    }
}

/**
 * Initialize documentation page event listeners
 */
function initDocsEventListeners() {
    // Quick start button
    const quickStartBtn = document.getElementById('docs-quick-start-btn');
    if (quickStartBtn) {
        quickStartBtn.addEventListener('click', () => {
            showInfoModal('Quick Start Tutorial', `
                <div class="space-y-4 text-sm">
                    <div class="flex items-start gap-3">
                        <div class="size-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span class="text-primary text-xs font-bold">1</span>
                        </div>
                        <div>
                            <p class="text-white font-medium">Create a PRD</p>
                            <p class="text-slate-400">Use the Design Wizard or upload an existing specification file.</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-3">
                        <div class="size-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span class="text-primary text-xs font-bold">2</span>
                        </div>
                        <div>
                            <p class="text-white font-medium">Configure Your Build</p>
                            <p class="text-slate-400">Set your SDK preference, GitHub target, and output directory.</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-3">
                        <div class="size-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span class="text-primary text-xs font-bold">3</span>
                        </div>
                        <div>
                            <p class="text-white font-medium">Start the Build</p>
                            <p class="text-slate-400">GRIMLOCK will autonomously generate your MCP server.</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-3">
                        <div class="size-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span class="text-primary text-xs font-bold">4</span>
                        </div>
                        <div>
                            <p class="text-white font-medium">Review & Deploy</p>
                            <p class="text-slate-400">Download your package and integrate it into your project.</p>
                        </div>
                    </div>
                </div>
            `);
        });
    }
}

/**
 * Initialize support page event listeners
 */
function initSupportEventListeners() {
    // Status button
    const statusBtn = document.getElementById('support-status-btn');
    if (statusBtn) {
        statusBtn.addEventListener('click', () => {
            Toast.info('Status page coming soon');
        });
    }

    // Email button
    const emailBtn = document.getElementById('support-email-btn');
    if (emailBtn) {
        emailBtn.addEventListener('click', () => {
            copyToClipboard('support@mcpfactory.io');
            Toast.success('Email address copied to clipboard');
        });
    }

    // Discord button
    const discordBtn = document.getElementById('support-discord-btn');
    if (discordBtn) {
        discordBtn.addEventListener('click', () => {
            Toast.info('Discord invite coming soon');
        });
    }

    // Feedback button
    const feedbackBtn = document.getElementById('support-feedback-btn');
    if (feedbackBtn) {
        feedbackBtn.addEventListener('click', () => {
            const feedbackText = document.getElementById('support-feedback-text');
            if (feedbackText && feedbackText.value.trim()) {
                Toast.success('Thank you for your feedback!');
                feedbackText.value = '';
            } else {
                Toast.warning('Please enter your feedback before submitting');
            }
        });
    }
}

// ==========================================
// EVENT LISTENERS
// ==========================================

/**
 * Initialize event listeners
 */
function initEventListeners() {
    // ========================================
    // LANDING PAGE
    // ========================================

    // Begin Wizard button - opens external n8n form in new tab
    const beginWizardBtn = document.getElementById('begin-wizard-btn');
    if (beginWizardBtn) {
        beginWizardBtn.addEventListener('click', () => {
            window.open(CONFIG.wizardUrl, '_blank');
        });
    }

    // Upload File button - opens upload modal
    const uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', openUploadModal);
    }

    // ========================================
    // HEADER
    // ========================================

    // New Build button - navigates to landing
    const newBuildBtn = document.getElementById('new-build-btn');
    if (newBuildBtn) {
        newBuildBtn.addEventListener('click', () => {
            Router.navigate('/');
        });
    }

    // Search input - Enter key shows toast
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = searchInput.value.trim();
                if (query) {
                    Toast.info(`Search for "${query}" coming soon`);
                } else {
                    Toast.info('Search functionality coming soon');
                }
            }
        });
    }

    // ========================================
    // UPLOAD MODAL
    // ========================================

    const modalCloseBtn = document.getElementById('modal-close-btn');
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeUploadModal);
    }

    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', closeUploadModal);
    }

    const processFileBtn = document.getElementById('process-file-btn');
    if (processFileBtn) {
        processFileBtn.addEventListener('click', () => {
            closeUploadModal();
            Toast.success('File uploaded successfully');
            Router.navigate('/progress');
        });
    }

    // Close upload modal on backdrop click
    const uploadModal = document.getElementById('upload-modal');
    if (uploadModal) {
        uploadModal.addEventListener('click', (e) => {
            if (e.target === uploadModal) closeUploadModal();
        });
    }

    // ========================================
    // WIZARD UNAVAILABLE MODAL
    // ========================================

    const wizardModalClose = document.getElementById('wizard-modal-close');
    if (wizardModalClose) {
        wizardModalClose.addEventListener('click', closeWizardUnavailableModal);
    }

    const wizardModalDismiss = document.getElementById('wizard-modal-dismiss');
    if (wizardModalDismiss) {
        wizardModalDismiss.addEventListener('click', closeWizardUnavailableModal);
    }

    const wizardUploadInstead = document.getElementById('wizard-upload-instead');
    if (wizardUploadInstead) {
        wizardUploadInstead.addEventListener('click', () => {
            closeWizardUnavailableModal();
            openUploadModal();
        });
    }

    // Backdrop click
    const wizardModal = document.getElementById('wizard-unavailable-modal');
    if (wizardModal) {
        wizardModal.addEventListener('click', (e) => {
            if (e.target === wizardModal) closeWizardUnavailableModal();
        });
    }

    // ========================================
    // COMING SOON MODAL
    // ========================================

    const comingSoonClose = document.getElementById('coming-soon-close');
    if (comingSoonClose) {
        comingSoonClose.addEventListener('click', closeComingSoonModal);
    }

    const comingSoonDismiss = document.getElementById('coming-soon-dismiss');
    if (comingSoonDismiss) {
        comingSoonDismiss.addEventListener('click', closeComingSoonModal);
    }

    const comingSoonModal = document.getElementById('coming-soon-modal');
    if (comingSoonModal) {
        comingSoonModal.addEventListener('click', (e) => {
            if (e.target === comingSoonModal) closeComingSoonModal();
        });
    }

    // ========================================
    // CONFIRM MODAL
    // ========================================

    const confirmClose = document.getElementById('confirm-close');
    if (confirmClose) {
        confirmClose.addEventListener('click', closeConfirmModal);
    }

    const confirmCancel = document.getElementById('confirm-cancel');
    if (confirmCancel) {
        confirmCancel.addEventListener('click', closeConfirmModal);
    }

    const confirmOk = document.getElementById('confirm-ok');
    if (confirmOk) {
        confirmOk.addEventListener('click', () => {
            if (confirmCallback) {
                confirmCallback();
            }
            closeConfirmModal();
        });
    }

    const confirmModal = document.getElementById('confirm-modal');
    if (confirmModal) {
        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) closeConfirmModal();
        });
    }

    // ========================================
    // INFO MODAL
    // ========================================

    const infoClose = document.getElementById('info-close');
    if (infoClose) {
        infoClose.addEventListener('click', closeInfoModal);
    }

    const infoDismiss = document.getElementById('info-dismiss');
    if (infoDismiss) {
        infoDismiss.addEventListener('click', closeInfoModal);
    }

    const infoModal = document.getElementById('info-modal');
    if (infoModal) {
        infoModal.addEventListener('click', (e) => {
            if (e.target === infoModal) closeInfoModal();
        });
    }

    // ========================================
    // PROGRESS PAGE
    // ========================================

    // Pause button
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            showConfirmModal(
                'Pause Build',
                'Are you sure you want to pause the current build? You can resume it later.',
                () => {
                    Toast.warning('Build paused');
                },
                'Pause Build'
            );
        });
    }

    // Cancel button
    const cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            showConfirmModal(
                'Cancel Build',
                'Are you sure you want to cancel this build? This action cannot be undone and all progress will be lost.',
                () => {
                    Toast.error('Build cancelled');
                    Router.navigate('/');
                },
                'Cancel Build',
                true
            );
        });
    }

    // Logs button (progress page)
    const logsBtn = document.getElementById('logs-btn');
    if (logsBtn) {
        logsBtn.addEventListener('click', downloadDemoLogs);
    }

    // Time range dropdown
    const timeRangeSelect = document.getElementById('time-range-select');
    if (timeRangeSelect) {
        timeRangeSelect.addEventListener('change', (e) => {
            Toast.info(`Time range: ${e.target.value} (demo mode)`);
        });
    }

    // PRD Confidence info button
    const prdConfidenceInfoBtn = document.getElementById('prd-confidence-info-btn');
    if (prdConfidenceInfoBtn) {
        prdConfidenceInfoBtn.addEventListener('click', () => {
            showInfoModal('PRD Confidence Score', `
                <div class="space-y-4">
                    <p>The <strong>PRD Confidence Score</strong> measures how well the generated code matches your original specification document.</p>

                    <div class="bg-slate-100 dark:bg-surface-darker rounded-lg p-4 space-y-2">
                        <div class="flex justify-between text-sm">
                            <span class="text-slate-600 dark:text-slate-400">Requirements covered</span>
                            <span class="text-slate-900 dark:text-white font-medium">142/151</span>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span class="text-slate-600 dark:text-slate-400">Semantic accuracy</span>
                            <span class="text-slate-900 dark:text-white font-medium">96.2%</span>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span class="text-slate-600 dark:text-slate-400">Type coverage</span>
                            <span class="text-slate-900 dark:text-white font-medium">100%</span>
                        </div>
                    </div>

                    <p class="text-sm text-slate-500 dark:text-slate-400">
                        A score above 90% indicates excellent alignment with specifications. Items below threshold are flagged for manual review.
                    </p>
                </div>
            `);
        });
    }

    // ========================================
    // COMPLETE PAGE
    // ========================================

    // View Logs button
    const viewLogsBtn = document.getElementById('view-logs-btn');
    if (viewLogsBtn) {
        viewLogsBtn.addEventListener('click', () => {
            showInfoModal('Build Logs', `
                <div class="font-mono text-xs bg-slate-900 rounded-lg p-4 max-h-80 overflow-y-auto text-slate-300 space-y-1">
                    <div><span class="text-blue-400">[10:42:01] INFO</span> Initializing build environment...</div>
                    <div><span class="text-blue-400">[10:42:02] INFO</span> Loading MCP configuration v2.1.0</div>
                    <div><span class="text-blue-400">[10:42:05] INFO</span> PRD analysis complete. Confidence: 94%</div>
                    <div><span class="text-emerald-400">[10:42:06] SUCCESS</span> Schema validation passed for 12 models.</div>
                    <div><span class="text-blue-400">[10:42:08] INFO</span> Starting Code Generation Module...</div>
                    <div><span class="text-blue-400">[10:42:15] INFO</span> Generating payment_gateway.ts...</div>
                    <div><span class="text-blue-400">[10:42:18] INFO</span> Generating transaction_logger.ts...</div>
                    <div><span class="text-amber-400">[10:42:22] WARN</span> Deprecated method usage in auth_utils.ts:45</div>
                    <div><span class="text-blue-400">[10:42:22] INFO</span> Auto-correcting deprecation... <span class="text-emerald-400">DONE</span></div>
                    <div><span class="text-blue-400">[10:42:25] INFO</span> Running unit tests (Batch 1/4)...</div>
                    <div><span class="text-emerald-400">[10:42:28] PASS</span> PaymentControllerTest.createOrder</div>
                    <div><span class="text-emerald-400">[10:42:29] PASS</span> PaymentControllerTest.validateCard</div>
                    <div><span class="text-emerald-400">[10:42:40] SUCCESS</span> Build completed successfully!</div>
                </div>
            `);
        });
    }

    // Download Package button
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadDemoPackage);
    }

    // Copy ID button
    const copyIdBtn = document.getElementById('copy-id-btn');
    if (copyIdBtn) {
        copyIdBtn.addEventListener('click', () => {
            const buildIdValue = document.getElementById('build-id-value');
            if (buildIdValue) {
                copyToClipboard(buildIdValue.textContent);
            }
        });
    }

    // Create Another button
    const createAnotherBtn = document.getElementById('create-another-btn');
    if (createAnotherBtn) {
        createAnotherBtn.addEventListener('click', () => {
            Router.navigate('/');
        });
    }

    // ========================================
    // NAVIGATION - Coming Soon Features
    // ========================================

    // All nav items now have their own pages
    const validNavItems = ['landing', 'progress', 'config', 'logs', 'analytics', 'settings', 'documentation', 'support'];

    document.querySelectorAll('[data-nav]').forEach(link => {
        const navTarget = link.dataset.nav;

        if (validNavItems.includes(navTarget)) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                Router.navigate(navTarget === 'landing' ? '/' : `/${navTarget}`);
            });
        }
    });

    // ========================================
    // GLOBAL KEYBOARD SHORTCUTS
    // ========================================

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

/**
 * Cleanup current view before navigating away
 */
function cleanupCurrentView() {
    if (currentView === 'progress') {
        cleanupProgressPage();
    }
    // Add other view cleanups as needed
}

/**
 * Register routes with the router
 */
// Track current view for cleanup
let currentView = null;

function initRoutes() {
    Router.register('/', () => {
        cleanupCurrentView();
        showView('landing');
        currentView = 'landing';
    });
    Router.register('/progress', () => {
        cleanupCurrentView();
        showView('progress');
        currentView = 'progress';
        initProgressPage();
    });
    Router.register('/complete', () => {
        cleanupCurrentView();
        showView('complete');
        currentView = 'complete';
        const buildId = getBuildIdFromUrl();
        initCompletePage(buildId);
    });
    Router.register('/config', () => {
        showView('config');
        loadConfigToForm();
    });
    Router.register('/logs', () => {
        cleanupCurrentView();
        showView('logs');
        currentView = 'logs';
        initLogsPage();
    });
    Router.register('/analytics', () => {
        showView('analytics');
        initBuildActivityChart();
    });
    Router.register('/settings', () => {
        showView('settings');
        loadSettingsToForm();
    });
    Router.register('/documentation', () => showView('documentation'));
    Router.register('/support', () => showView('support'));
}

/**
 * Initialize global search handler
 */
function initSearchHandler() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();

        // Filter based on current view
        if (currentView === 'logs' && currentLogsData) {
            if (query === '') {
                updateLogsUI(currentLogsData);
            } else {
                const filtered = currentLogsData.filter(log =>
                    (log.name && log.name.toLowerCase().includes(query)) ||
                    (log.id && log.id.toLowerCase().includes(query)) ||
                    (log.status && log.status.toLowerCase().includes(query))
                );
                updateLogsUI(filtered);
            }
        }
    });

    // Clear search on escape
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            if (currentView === 'logs' && currentLogsData) {
                updateLogsUI(currentLogsData);
            }
        }
    });

    console.log('[Search] Search handler initialized');
}

/**
 * Initialize New Build button handler
 */
function initNewBuildButton() {
    const newBuildBtn = document.getElementById('new-build-btn');
    if (!newBuildBtn) return;

    newBuildBtn.addEventListener('click', () => {
        // Open the PRD Wizard in a new tab
        window.open(CONFIG.wizardUrl, '_blank');
        console.log('[NewBuild] Opening PRD Wizard:', CONFIG.wizardUrl);
    });

    console.log('[NewBuild] New Build button initialized');
}

/**
 * Initialize Build Activity Chart on Analytics page
 */
let buildActivityChart = null;

async function initBuildActivityChart() {
    const ctx = document.getElementById('build-activity-chart');
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (buildActivityChart) {
        buildActivityChart.destroy();
        buildActivityChart = null;
    }

    // Default data
    let chartData = [0, 0, 0, 0, 0, 0, 0];

    // Try to fetch real data from analytics API
    if (typeof GrimlockAPI !== 'undefined') {
        try {
            const response = await GrimlockAPI.getAnalytics();
            if (response?.success && response.data?.weeklyBuilds) {
                chartData = response.data.weeklyBuilds;
                console.log('[Chart] Loaded real analytics data:', chartData);
            }
        } catch (e) {
            console.warn('[Chart] Using fallback data:', e.message);
            chartData = [8, 12, 6, 15, 9, 3, 5]; // Fallback demo data
        }
    } else {
        chartData = [8, 12, 6, 15, 9, 3, 5]; // Demo data when API not available
    }

    // Create the chart
    buildActivityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Builds',
                data: chartData,
                backgroundColor: '#135bec',
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(100, 116, 139, 0.1)'
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                }
            }
        }
    });

    console.log('[Chart] Build Activity Chart initialized');
}

/**
 * Initialize authentication and show/hide login overlay
 */
function initAuth() {
    console.log('[Auth] Initializing authentication...');

    const loginOverlay = document.getElementById('login-overlay');
    const googleLoginBtn = document.getElementById('google-login-btn');

    console.log('[Auth] Login overlay found:', !!loginOverlay);
    console.log('[Auth] Google login button found:', !!googleLoginBtn);

    // Check if Auth module is loaded
    if (typeof Auth === 'undefined') {
        console.error('[Auth] Auth module not loaded!');
        return;
    }

    try {
        // Initialize auth module
        const isAuthenticated = Auth.init();

        if (isAuthenticated) {
            // Hide login overlay
            if (loginOverlay) loginOverlay.classList.add('hidden');

            // Update user profile in sidebar
            updateUserProfile();

            console.log('[Auth] User authenticated:', Auth.getUser()?.email);
        } else {
            // Show login overlay
            if (loginOverlay) loginOverlay.classList.remove('hidden');

            console.log('[Auth] User not authenticated, showing login');
        }
    } catch (error) {
        console.error('[Auth] Error during init:', error);
    }

    // Google login button handler
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', () => {
            console.log('[Auth] Login button clicked!');
            Auth.login();
        });
        console.log('[Auth] Login button click handler attached');
    } else {
        console.error('[Auth] Could not find google-login-btn element');
    }
}

/**
 * Update user profile in sidebar with real user data
 */
function updateUserProfile() {
    const user = Auth.getUser();
    if (!user) return;

    // Find the user profile container in sidebar
    const profileContainer = document.querySelector('.mt-2.flex.items-center.gap-3.rounded-xl.bg-slate-100');
    if (!profileContainer) return;

    // Update with real user info
    profileContainer.innerHTML = `
        <div class="h-9 w-9 overflow-hidden rounded-full flex-shrink-0">
            ${user.picture
                ? `<img src="${user.picture}" alt="${user.name}" class="h-full w-full object-cover" referrerpolicy="no-referrer" />`
                : `<div class="h-full w-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
                     <span class="text-white text-sm font-bold">${user.name?.charAt(0) || 'U'}</span>
                   </div>`
            }
        </div>
        <div class="flex flex-col overflow-hidden flex-1">
            <span class="truncate text-sm font-semibold dark:text-white">${user.name || 'User'}</span>
            <span class="truncate text-xs text-slate-500 dark:text-text-secondary">${user.email || ''}</span>
        </div>
        <button id="logout-btn" class="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-surface-dark transition-colors" title="Sign out">
            <span class="material-symbols-outlined text-slate-500 dark:text-text-secondary text-lg">logout</span>
        </button>
    `;

    // Add logout handler
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showConfirmModal(
                'Sign Out',
                'Are you sure you want to sign out?',
                () => {
                    Auth.logout();
                }
            );
        });
    }
}

/**
 * Initialize the application
 */
function init() {
    // Initialize authentication first
    initAuth();

    // Apply stored configuration first
    applyStoredConfig();

    initRoutes();
    initEventListeners();
    initConfigEventListeners();
    initSettingsEventListeners();
    initLogsEventListeners();
    initAnalyticsEventListeners();
    initDocsEventListeners();
    initSupportEventListeners();
    initSearchHandler();
    initNewBuildButton();
    Router.init();

    console.log('MCP Factory Dashboard initialized');
    console.log('Routes: /, /progress, /complete, /config, /logs, /analytics, /settings, /documentation, /support');
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
