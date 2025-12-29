/**
 * MCP Factory Dashboard - Application Logic
 * Handles view switching, event binding, and UI interactions
 */

// Configuration
const CONFIG = {
    // External PRD Design Wizard URL (n8n form)
    wizardUrl: 'https://im4tlai.app.n8n.cloud/form/grimlock-design',
    // API base URL for future integration
    apiUrl: 'https://n8n.srv763896.hstgr.cloud'
};

/**
 * Show a specific view and hide others
 * @param {string} viewName - The data-view attribute value to show
 */
function showView(viewName) {
    // Hide all views
    document.querySelectorAll('[data-view]').forEach(el => {
        el.classList.add('hidden');
    });

    // Show the target view
    const targetView = document.querySelector(`[data-view="${viewName}"]`);
    if (targetView) {
        targetView.classList.remove('hidden');
    }

    // Update sidebar navigation active state
    updateNavigation(viewName);
}

/**
 * Update sidebar navigation active state
 * @param {string} activeView - The currently active view
 */
function updateNavigation(activeView) {
    document.querySelectorAll('.nav-link').forEach(link => {
        const navTarget = link.dataset.nav;

        // Reset all links to inactive state
        link.classList.remove('text-primary', 'dark:bg-[#282e39]', 'dark:text-white');
        link.classList.add('text-slate-600', 'dark:text-text-secondary');

        // Set active link
        if (navTarget === activeView) {
            link.classList.add('text-primary', 'dark:bg-[#282e39]', 'dark:text-white');
            link.classList.remove('text-slate-600', 'dark:text-text-secondary');
        }
    });
}

/**
 * Open the upload modal
 */
function openModal() {
    const modal = document.getElementById('upload-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

/**
 * Close the upload modal
 */
function closeModal() {
    const modal = document.getElementById('upload-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * Open external PRD wizard in new tab
 */
function openWizard() {
    window.open(CONFIG.wizardUrl, '_blank');
}

/**
 * Initialize event listeners
 */
function initEventListeners() {
    // Begin Wizard button - opens external n8n form
    const beginWizardBtn = document.getElementById('begin-wizard-btn');
    if (beginWizardBtn) {
        beginWizardBtn.addEventListener('click', openWizard);
    }

    // Upload File button - opens modal
    const uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', openModal);
    }

    // New Build button in header - navigates to landing
    const newBuildBtn = document.getElementById('new-build-btn');
    if (newBuildBtn) {
        newBuildBtn.addEventListener('click', () => {
            Router.navigate('/');
        });
    }

    // Modal close button
    const modalCloseBtn = document.getElementById('modal-close-btn');
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeModal);
    }

    // Modal cancel button
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', closeModal);
    }

    // Process File button - simulates upload and navigates to progress
    const processFileBtn = document.getElementById('process-file-btn');
    if (processFileBtn) {
        processFileBtn.addEventListener('click', () => {
            closeModal();
            Router.navigate('/progress');
        });
    }

    // Complete Build button (demo) - navigates to complete view
    const completeBuildBtn = document.getElementById('complete-build-btn');
    if (completeBuildBtn) {
        completeBuildBtn.addEventListener('click', () => {
            Router.navigate('/complete');
        });
    }

    // Create Another button - navigates back to landing
    const createAnotherBtn = document.getElementById('create-another-btn');
    if (createAnotherBtn) {
        createAnotherBtn.addEventListener('click', () => {
            Router.navigate('/');
        });
    }

    // Close modal on backdrop click
    const uploadModal = document.getElementById('upload-modal');
    if (uploadModal) {
        uploadModal.addEventListener('click', (e) => {
            if (e.target === uploadModal) {
                closeModal();
            }
        });
    }

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });

    // Sidebar navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const navTarget = link.dataset.nav;

            // Only handle views we have (landing, progress)
            if (navTarget === 'landing' || navTarget === 'progress') {
                e.preventDefault();
                Router.navigate(navTarget === 'landing' ? '/' : `/${navTarget}`);
            }
        });
    });
}

/**
 * Register routes with the router
 */
function initRoutes() {
    Router.register('/', () => showView('landing'));
    Router.register('/progress', () => showView('progress'));
    Router.register('/complete', () => showView('complete'));
}

/**
 * Initialize the application
 */
function init() {
    initRoutes();
    initEventListeners();
    Router.init();

    console.log('MCP Factory Dashboard initialized');
    console.log('Routes: /, /progress, /complete');
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
