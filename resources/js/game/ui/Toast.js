/**
 * Paradise Gods - Event Notification Toast System
 */
export class Toast {
    constructor(container) {
        this.container = container;
        this.toasts = [];
    }

    show(message, type = 'info', duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `p-3.5 rounded-xl shadow-lg border text-xs font-mono transition-all duration-300 transform translate-y-2 opacity-0 flex items-center gap-2.5 backdrop-blur-md ${
            type === 'warning'
                ? 'bg-amber-950/85 border-amber-500/50 text-amber-200'
                : type === 'danger'
                ? 'bg-rose-950/85 border-rose-500/50 text-rose-200'
                : type === 'success'
                ? 'bg-emerald-950/85 border-emerald-500/50 text-emerald-200'
                : 'bg-slate-900/85 border-cyan-500/40 text-cyan-200'
        }`;

        toast.innerHTML = `
            <span class="w-2 h-2 rounded-full ${
                type === 'warning' ? 'bg-amber-400 animate-ping' : type === 'danger' ? 'bg-rose-400' : 'bg-cyan-400'
            }"></span>
            <span class="flex-grow">${message}</span>
        `;

        this.container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-2', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');
        });

        setTimeout(() => {
            toast.classList.remove('opacity-100');
            toast.classList.add('opacity-0', '-translate-y-2');
            setTimeout(() => {
                if (toast.parentNode === this.container) {
                    this.container.removeChild(toast);
                }
            }, 300);
        }, duration);
    }
}
