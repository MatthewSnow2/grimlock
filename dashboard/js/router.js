/**
 * Simple hash-based router for MCP Factory Dashboard
 * No dependencies - vanilla JavaScript
 */
const Router = {
    routes: {},
    currentView: null,

    /**
     * Initialize the router
     */
    init() {
        window.addEventListener('hashchange', () => this.handleRoute());
        window.addEventListener('load', () => this.handleRoute());
    },

    /**
     * Register a route handler
     * @param {string} path - The hash path (e.g., '/', '/progress')
     * @param {Function} handler - Function to call when route matches
     */
    register(path, handler) {
        this.routes[path] = handler;
    },

    /**
     * Handle route change
     */
    handleRoute() {
        const hash = window.location.hash.slice(1) || '/';
        const handler = this.routes[hash] || this.routes['/'];

        if (handler) {
            handler();
        }
    },

    /**
     * Navigate to a new route
     * @param {string} path - The path to navigate to
     */
    navigate(path) {
        window.location.hash = path;
    },

    /**
     * Get current route
     * @returns {string} Current hash path
     */
    getCurrentRoute() {
        return window.location.hash.slice(1) || '/';
    }
};

// Export for use in app.js
window.Router = Router;
