/**
 * GRIMLOCK Dashboard API Client
 * Handles communication with n8n webhook endpoints for real-time data
 */

// API Configuration
const API_CONFIG = {
    baseUrl: 'https://im4tlai.app.n8n.cloud/webhook',
    defaultTimeout: 10000,      // 10 seconds
    defaultCacheTTL: 30000,     // 30 seconds
    maxRetries: 3,
    retryDelay: 1000,           // 1 second base delay
    retryBackoffMultiplier: 2   // Exponential backoff
};

// Endpoint definitions
const ENDPOINTS = {
    BUILD_STATUS: '/grimlock/build-status',
    BUILD_HISTORY: '/grimlock/build-history',
    BUILD_DETAILS: '/grimlock/build-details',
    ANALYTICS: '/grimlock/analytics',
    SYSTEM_HEALTH: '/grimlock/system-health',
    MCP_PROJECTS: '/grimlock/mcp-projects',
    LATEST_PRD: '/grimlock/latest-prd',
    BUILD_OUTPUT: '/grimlock/build-output'
};

// Polling intervals by endpoint type
const POLLING_INTERVALS = {
    [ENDPOINTS.BUILD_STATUS]: 30000,     // 30 seconds
    [ENDPOINTS.SYSTEM_HEALTH]: 60000,    // 60 seconds
    [ENDPOINTS.ANALYTICS]: 120000,       // 2 minutes
    [ENDPOINTS.BUILD_HISTORY]: 60000,    // 60 seconds
    default: 30000
};

/**
 * Simple in-memory cache with TTL support
 */
class ResponseCache {
    constructor(defaultTTL = API_CONFIG.defaultCacheTTL) {
        this.cache = new Map();
        this.defaultTTL = defaultTTL;
    }

    /**
     * Get cached response if not expired
     * @param {string} key - Cache key
     * @returns {object|null} Cached data or null
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    /**
     * Store response in cache
     * @param {string} key - Cache key
     * @param {object} data - Data to cache
     * @param {number} ttl - Time to live in milliseconds
     */
    set(key, data, ttl = this.defaultTTL) {
        this.cache.set(key, {
            data,
            expiresAt: Date.now() + ttl,
            cachedAt: Date.now()
        });
    }

    /**
     * Check if key exists and is not expired
     * @param {string} key - Cache key
     * @returns {boolean}
     */
    has(key) {
        return this.get(key) !== null;
    }

    /**
     * Clear specific key or entire cache
     * @param {string} key - Optional key to clear
     */
    clear(key = null) {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    }

    /**
     * Get cache entry metadata
     * @param {string} key - Cache key
     * @returns {object|null} Cache metadata
     */
    getMetadata(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;

        return {
            cachedAt: entry.cachedAt,
            expiresAt: entry.expiresAt,
            age: Date.now() - entry.cachedAt,
            isExpired: Date.now() > entry.expiresAt
        };
    }
}

/**
 * Connection status tracker
 */
class ConnectionStatus {
    constructor() {
        this.isOnline = true;
        this.lastSuccessfulRequest = null;
        this.lastError = null;
        this.consecutiveFailures = 0;
        this.listeners = [];
    }

    /**
     * Record successful request
     */
    success() {
        this.isOnline = true;
        this.lastSuccessfulRequest = Date.now();
        this.consecutiveFailures = 0;
        this.lastError = null;
        this._notifyListeners();
    }

    /**
     * Record failed request
     * @param {Error} error - The error that occurred
     */
    failure(error) {
        this.consecutiveFailures++;
        this.lastError = error;

        // Mark offline after 3 consecutive failures
        if (this.consecutiveFailures >= 3) {
            this.isOnline = false;
        }
        this._notifyListeners();
    }

    /**
     * Subscribe to status changes
     * @param {function} callback - Callback function
     * @returns {function} Unsubscribe function
     */
    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    /**
     * Get current status
     * @returns {object} Status object
     */
    getStatus() {
        return {
            isOnline: this.isOnline,
            lastSuccessfulRequest: this.lastSuccessfulRequest,
            lastError: this.lastError,
            consecutiveFailures: this.consecutiveFailures,
            staleness: this.lastSuccessfulRequest
                ? Date.now() - this.lastSuccessfulRequest
                : null
        };
    }

    _notifyListeners() {
        const status = this.getStatus();
        this.listeners.forEach(cb => cb(status));
    }
}

/**
 * Request statistics tracker
 */
class RequestStats {
    constructor() {
        this.totalRequests = 0;
        this.successfulRequests = 0;
        this.failedRequests = 0;
        this.totalResponseTime = 0;
        this.requestsByEndpoint = {};
    }

    /**
     * Record a completed request
     * @param {string} endpoint - The endpoint called
     * @param {boolean} success - Whether request succeeded
     * @param {number} duration - Request duration in ms
     */
    record(endpoint, success, duration) {
        this.totalRequests++;
        this.totalResponseTime += duration;

        if (success) {
            this.successfulRequests++;
        } else {
            this.failedRequests++;
        }

        if (!this.requestsByEndpoint[endpoint]) {
            this.requestsByEndpoint[endpoint] = {
                total: 0,
                successful: 0,
                failed: 0,
                avgResponseTime: 0,
                totalResponseTime: 0
            };
        }

        const epStats = this.requestsByEndpoint[endpoint];
        epStats.total++;
        epStats.totalResponseTime += duration;
        epStats.avgResponseTime = epStats.totalResponseTime / epStats.total;

        if (success) {
            epStats.successful++;
        } else {
            epStats.failed++;
        }
    }

    /**
     * Get statistics summary
     * @returns {object} Statistics summary
     */
    getSummary() {
        return {
            totalRequests: this.totalRequests,
            successfulRequests: this.successfulRequests,
            failedRequests: this.failedRequests,
            successRate: this.totalRequests > 0
                ? (this.successfulRequests / this.totalRequests * 100).toFixed(1) + '%'
                : 'N/A',
            avgResponseTime: this.totalRequests > 0
                ? Math.round(this.totalResponseTime / this.totalRequests) + 'ms'
                : 'N/A',
            byEndpoint: this.requestsByEndpoint
        };
    }

    /**
     * Reset all statistics
     */
    reset() {
        this.totalRequests = 0;
        this.successfulRequests = 0;
        this.failedRequests = 0;
        this.totalResponseTime = 0;
        this.requestsByEndpoint = {};
    }
}

/**
 * Main API Client class
 */
class APIClient {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || API_CONFIG.baseUrl;
        this.timeout = options.timeout || API_CONFIG.defaultTimeout;
        this.maxRetries = options.maxRetries || API_CONFIG.maxRetries;

        this.cache = new ResponseCache(options.cacheTTL || API_CONFIG.defaultCacheTTL);
        this.connectionStatus = new ConnectionStatus();
        this.stats = new RequestStats();

        this.pollingIntervals = new Map(); // endpoint -> intervalId
        this.pollingCallbacks = new Map(); // endpoint -> callback
    }

    /**
     * Make an HTTP request with retry logic
     * @param {string} endpoint - API endpoint
     * @param {object} options - Request options
     * @returns {Promise<object>} Response data
     */
    async request(endpoint, options = {}) {
        const {
            method = 'GET',
            params = {},
            body = null,
            useCache = true,
            cacheTTL = null,
            timeout = this.timeout,
            retries = this.maxRetries
        } = options;

        // Build URL with query parameters
        let url = `${this.baseUrl}${endpoint}`;
        if (Object.keys(params).length > 0) {
            const searchParams = new URLSearchParams(params);
            url += `?${searchParams.toString()}`;
        }

        // Check cache for GET requests
        const cacheKey = `${method}:${url}`;
        if (method === 'GET' && useCache) {
            const cached = this.cache.get(cacheKey);
            if (cached) {
                console.log(`[API] Cache hit: ${endpoint}`);
                return cached;
            }
        }

        // Execute request with retries
        let lastError;
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const result = await this._executeRequest(url, {
                    method,
                    body,
                    timeout,
                    endpoint
                });

                // Cache successful GET responses
                if (method === 'GET' && useCache) {
                    this.cache.set(cacheKey, result, cacheTTL);
                }

                return result;
            } catch (error) {
                lastError = error;
                console.warn(`[API] Request failed (attempt ${attempt + 1}/${retries + 1}):`, error.message);

                if (attempt < retries) {
                    const delay = API_CONFIG.retryDelay * Math.pow(API_CONFIG.retryBackoffMultiplier, attempt);
                    await this._sleep(delay);
                }
            }
        }

        throw lastError;
    }

    /**
     * Execute a single HTTP request
     * @private
     */
    async _executeRequest(url, { method, body, timeout, endpoint }) {
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const fetchOptions = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                signal: controller.signal
            };

            if (body) {
                fetchOptions.body = JSON.stringify(body);
            }

            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);

            const duration = Date.now() - startTime;

            if (!response.ok) {
                this.stats.record(endpoint, false, duration);
                this.connectionStatus.failure(new Error(`HTTP ${response.status}`));
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.stats.record(endpoint, true, duration);
            this.connectionStatus.success();

            // Wrap response in standard format if not already
            if (typeof data.success === 'undefined') {
                return {
                    success: true,
                    timestamp: new Date().toISOString(),
                    data: data,
                    error: null
                };
            }

            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            const duration = Date.now() - startTime;
            this.stats.record(endpoint, false, duration);
            this.connectionStatus.failure(error);

            if (error.name === 'AbortError') {
                throw new Error(`Request timeout after ${timeout}ms`);
            }
            throw error;
        }
    }

    /**
     * Start polling an endpoint
     * @param {string} endpoint - Endpoint to poll
     * @param {function} callback - Callback with response data
     * @param {number} interval - Polling interval in ms
     */
    startPolling(endpoint, callback, interval = null) {
        // Stop existing polling for this endpoint
        this.stopPolling(endpoint);

        const pollInterval = interval || POLLING_INTERVALS[endpoint] || POLLING_INTERVALS.default;

        console.log(`[API] Starting polling: ${endpoint} every ${pollInterval}ms`);

        // Store callback
        this.pollingCallbacks.set(endpoint, callback);

        // Execute immediately
        this._poll(endpoint, callback);

        // Set up interval
        const intervalId = setInterval(() => {
            this._poll(endpoint, callback);
        }, pollInterval);

        this.pollingIntervals.set(endpoint, intervalId);
    }

    /**
     * Stop polling an endpoint
     * @param {string} endpoint - Endpoint to stop polling
     */
    stopPolling(endpoint) {
        const intervalId = this.pollingIntervals.get(endpoint);
        if (intervalId) {
            clearInterval(intervalId);
            this.pollingIntervals.delete(endpoint);
            this.pollingCallbacks.delete(endpoint);
            console.log(`[API] Stopped polling: ${endpoint}`);
        }
    }

    /**
     * Stop all polling
     */
    stopAllPolling() {
        for (const endpoint of this.pollingIntervals.keys()) {
            this.stopPolling(endpoint);
        }
    }

    /**
     * Execute a single poll
     * @private
     */
    async _poll(endpoint, callback) {
        try {
            const data = await this.request(endpoint, { useCache: false });
            callback(data, null);
        } catch (error) {
            console.error(`[API] Poll error for ${endpoint}:`, error);

            // Try to get cached data as fallback
            const cacheKey = `GET:${this.baseUrl}${endpoint}`;
            const cached = this.cache.get(cacheKey);

            if (cached) {
                console.log(`[API] Using cached data for ${endpoint}`);
                callback({ ...cached, _stale: true }, error);
            } else {
                callback(null, error);
            }
        }
    }

    /**
     * Sleep helper
     * @private
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ==========================================
    // CONVENIENCE METHODS FOR GRIMLOCK ENDPOINTS
    // ==========================================

    /**
     * Get current build status
     * @returns {Promise<object>}
     */
    async getBuildStatus() {
        return this.request(ENDPOINTS.BUILD_STATUS);
    }

    /**
     * Get build history
     * @param {object} options - Query options
     * @returns {Promise<object>}
     */
    async getBuildHistory(options = {}) {
        const { limit = 10, status = null, days = 30 } = options;
        const params = { limit, days };
        if (status) params.status = status;
        return this.request(ENDPOINTS.BUILD_HISTORY, { params });
    }

    /**
     * Get build details by ID
     * @param {string} buildId - Build ID
     * @returns {Promise<object>}
     */
    async getBuildDetails(buildId) {
        return this.request(`${ENDPOINTS.BUILD_DETAILS}?id=${buildId}`);
    }

    /**
     * Get analytics data
     * @returns {Promise<object>}
     */
    async getAnalytics() {
        return this.request(ENDPOINTS.ANALYTICS);
    }

    /**
     * Get system health status
     * @returns {Promise<object>}
     */
    async getSystemHealth() {
        return this.request(ENDPOINTS.SYSTEM_HEALTH);
    }

    /**
     * Get list of MCP projects
     * @returns {Promise<object>}
     */
    async getMCPProjects() {
        return this.request(ENDPOINTS.MCP_PROJECTS);
    }

    /**
     * Get latest PRD information
     * @returns {Promise<object>}
     */
    async getLatestPRD() {
        return this.request(ENDPOINTS.LATEST_PRD);
    }

    /**
     * Get build output/artifacts
     * @param {string} buildId - Build ID
     * @returns {Promise<object>}
     */
    async getBuildOutput(buildId) {
        return this.request(`${ENDPOINTS.BUILD_OUTPUT}/${buildId}`);
    }

    // ==========================================
    // STATUS & UTILITY METHODS
    // ==========================================

    /**
     * Get connection status
     * @returns {object}
     */
    getConnectionStatus() {
        return this.connectionStatus.getStatus();
    }

    /**
     * Subscribe to connection status changes
     * @param {function} callback
     * @returns {function} Unsubscribe function
     */
    onConnectionStatusChange(callback) {
        return this.connectionStatus.subscribe(callback);
    }

    /**
     * Get request statistics
     * @returns {object}
     */
    getStats() {
        return this.stats.getSummary();
    }

    /**
     * Clear cache
     * @param {string} endpoint - Optional endpoint to clear
     */
    clearCache(endpoint = null) {
        if (endpoint) {
            this.cache.clear(`GET:${this.baseUrl}${endpoint}`);
        } else {
            this.cache.clear();
        }
    }

    /**
     * Get cache status
     * @param {string} endpoint
     * @returns {object|null}
     */
    getCacheStatus(endpoint) {
        const cacheKey = `GET:${this.baseUrl}${endpoint}`;
        return this.cache.getMetadata(cacheKey);
    }
}

// Create singleton instance
const api = new APIClient();

// Export for use in other modules
window.GrimlockAPI = {
    client: api,
    APIClient,
    ENDPOINTS,
    POLLING_INTERVALS,

    // Direct request method for custom endpoints
    request: (endpoint, options) => api.request(endpoint, options),

    // Re-export convenience methods
    getBuildStatus: () => api.getBuildStatus(),
    getBuildHistory: (opts) => api.getBuildHistory(opts),
    getBuildDetails: (id) => api.getBuildDetails(id),
    getAnalytics: () => api.getAnalytics(),
    getSystemHealth: () => api.getSystemHealth(),
    getMCPProjects: () => api.getMCPProjects(),
    getLatestPRD: () => api.getLatestPRD(),
    getBuildOutput: (id) => api.getBuildOutput(id),

    // Polling
    startPolling: (endpoint, callback, interval) => api.startPolling(endpoint, callback, interval),
    stopPolling: (endpoint) => api.stopPolling(endpoint),
    stopAllPolling: () => api.stopAllPolling(),

    // Status
    getConnectionStatus: () => api.getConnectionStatus(),
    onConnectionStatusChange: (cb) => api.onConnectionStatusChange(cb),
    getStats: () => api.getStats(),

    // Cache
    clearCache: (endpoint) => api.clearCache(endpoint),
    getCacheStatus: (endpoint) => api.getCacheStatus(endpoint)
};

console.log('[API] GRIMLOCK API Client loaded');
