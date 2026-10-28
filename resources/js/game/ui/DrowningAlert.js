/**
 * Paradise Gods - Urgent Drowning Alert UI
 * Displays active countdown timers for all drowning citizens based on server deadline.
 */
export class DrowningAlert {
    constructor(container) {
        this.container = container;
        this.cards = new Map(); // citizenId -> { card, timer }
    }

    addAlert(citizen, deadlineAt, onRescueClick) {
        if (this.cards.has(citizen.id)) {
            this.removeAlert(citizen.id);
        }

        const card = document.createElement('div');
        card.id = `drowning-alert-${citizen.id}`;
        card.className = 'pointer-events-auto p-3.5 rounded-2xl bg-rose-950/85 border border-rose-500/50 shadow-2xl backdrop-blur-md text-white flex items-center justify-between gap-3.5 w-80 animate-fade-in transition-all';

        const updateCountdown = () => {
            const now = Date.now();
            const remainingMs = Math.max(0, deadlineAt - now);
            const sec = (remainingMs / 1000).toFixed(1);
            const textEl = card.querySelector('.countdown-text');
            if (textEl) {
                if (remainingMs > 0) {
                    textEl.textContent = `${sec}s`;
                } else {
                    textEl.textContent = `Đang đồng bộ...`;
                }
            }
        };

        card.innerHTML = `
            <div class="flex items-center gap-2.5">
                <span class="w-3 h-3 rounded-full bg-rose-500 animate-ping shrink-0"></span>
                <div>
                    <div class="text-xs font-bold text-rose-200">${citizen.name} đang chìm!</div>
                    <div class="text-xs font-mono text-rose-300 countdown-text">10.0s</div>
                </div>
            </div>
            <button type="button" class="rescue-btn px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/30 transition-all shrink-0">
                ⚡ CỨU ${citizen.name}
            </button>
        `;

        card.querySelector('.rescue-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (onRescueClick) onRescueClick();
        });

        this.container.appendChild(card);
        updateCountdown();

        const timer = setInterval(updateCountdown, 100);
        this.cards.set(citizen.id, { card, timer });
    }

    removeAlert(citizenId) {
        const entry = this.cards.get(citizenId);
        if (entry) {
            clearInterval(entry.timer);
            if (entry.card.parentNode === this.container) {
                this.container.removeChild(entry.card);
            }
            this.cards.delete(citizenId);
        }
    }
}
