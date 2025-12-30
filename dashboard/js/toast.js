/**
 * Toast Notification System
 * Provides user feedback via slide-in notifications
 */

const Toast = {
    container: null,

    /**
     * Initialize toast container
     */
    init() {
        if (this.container) return;

        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2';
        document.body.appendChild(this.container);
    },

    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - 'success' | 'error' | 'info' | 'warning'
     * @param {number} duration - Auto-dismiss time in ms (default 3000)
     */
    show(message, type = 'info', duration = 3000) {
        this.init();

        const toast = document.createElement('div');
        toast.className = this.getClasses(type);
        toast.innerHTML = this.getContent(message, type);

        // Slide in animation
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
        toast.style.transition = 'all 0.3s ease-out';

        this.container.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        });

        // Auto-dismiss
        if (duration > 0) {
            setTimeout(() => this.dismiss(toast), duration);
        }

        // Click to dismiss
        toast.addEventListener('click', () => this.dismiss(toast));

        return toast;
    },

    /**
     * Dismiss a toast with animation
     */
    dismiss(toast) {
        if (!toast || !toast.parentNode) return;

        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    },

    /**
     * Get Tailwind classes for toast type
     */
    getClasses(type) {
        const base = 'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg cursor-pointer min-w-[280px] max-w-[400px]';

        const styles = {
            success: 'bg-green-900/90 text-green-100 border border-green-700',
            error: 'bg-red-900/90 text-red-100 border border-red-700',
            warning: 'bg-yellow-900/90 text-yellow-100 border border-yellow-700',
            info: 'bg-blue-900/90 text-blue-100 border border-blue-700'
        };

        return `${base} ${styles[type] || styles.info}`;
    },

    /**
     * Get toast content with icon
     */
    getContent(message, type) {
        const icons = {
            success: 'check_circle',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };

        const icon = icons[type] || icons.info;

        return `
            <span class="material-symbols-outlined text-xl">${icon}</span>
            <span class="flex-1 text-sm font-medium">${message}</span>
        `;
    },

    // Convenience methods
    success(message, duration) { return this.show(message, 'success', duration); },
    error(message, duration) { return this.show(message, 'error', duration); },
    warning(message, duration) { return this.show(message, 'warning', duration); },
    info(message, duration) { return this.show(message, 'info', duration); }
};

// Export for use
window.Toast = Toast;
