/**
 * GRIMLOCK Dashboard - Authentication Module
 * Handles Google OAuth authentication flow
 */

const Auth = {
    // Auth configuration
    config: {
        loginUrl: 'https://im4tlai.app.n8n.cloud/webhook/grimlock/auth/login',
        verifyUrl: 'https://im4tlai.app.n8n.cloud/webhook/grimlock/auth/verify',
        tokenKey: 'grimlock_auth_token',
        userKey: 'grimlock_auth_user'
    },

    /**
     * Initialize auth - check for token in URL or localStorage
     */
    init() {
        // Check for token in URL (callback from OAuth)
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (token) {
            // Store token and clean URL
            this.setToken(token);
            window.history.replaceState({}, document.title, window.location.pathname);
            this.decodeAndStoreUser(token);
        }

        return this.isAuthenticated();
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const token = this.getToken();
        if (!token) return false;

        try {
            const user = this.getUser();
            if (!user || !user.exp) return false;

            // Check if token is expired
            if (user.exp < Date.now()) {
                this.logout();
                return false;
            }

            return true;
        } catch (e) {
            return false;
        }
    },

    /**
     * Get stored token
     */
    getToken() {
        return localStorage.getItem(this.config.tokenKey);
    },

    /**
     * Set token in localStorage
     */
    setToken(token) {
        localStorage.setItem(this.config.tokenKey, token);
    },

    /**
     * Decode token and store user info
     */
    decodeAndStoreUser(token) {
        try {
            const decoded = JSON.parse(atob(token));
            localStorage.setItem(this.config.userKey, JSON.stringify(decoded));
            return decoded;
        } catch (e) {
            console.error('Failed to decode token:', e);
            return null;
        }
    },

    /**
     * Get stored user info
     */
    getUser() {
        try {
            const userStr = localStorage.getItem(this.config.userKey);
            return userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            return null;
        }
    },

    /**
     * Redirect to Google OAuth login
     */
    login() {
        window.location.href = this.config.loginUrl;
    },

    /**
     * Logout - clear stored auth data
     */
    logout() {
        localStorage.removeItem(this.config.tokenKey);
        localStorage.removeItem(this.config.userKey);
        window.location.reload();
    },

    /**
     * Verify token with backend (optional - for extra security)
     */
    async verifyToken() {
        const token = this.getToken();
        if (!token) return false;

        try {
            const response = await fetch(this.config.verifyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ token })
            });

            const data = await response.json();
            return data.valid === true;
        } catch (e) {
            console.error('Token verification failed:', e);
            return false;
        }
    }
};

// Export for use in other modules
window.Auth = Auth;

console.log('[Auth] Auth module loaded');
