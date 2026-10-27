/**
 * Paradise Gods - Urgent Drowning Alert UI
 * Displays active countdown timers for all drowning citizens with direct rescue action buttons.
 */
export class DrowningAlert {
    constructor(container) {
        this.container = container;
        this.cards = new Map(); // citizenId -> element
    }

    addAlert(citizen, initialDurationMs, onRescueClick) {
        if (this.cards.has(citizen.id)) return;

        const card = document.createElement('div');
        card.id = `drowning-alert-${citizen.id}`;
        card.className = 'pointer-events-auto p-4 rounded-2xl bg-rose-950/90 border border-rose-500/60 shadow-2xl backdrop-blur-md text-white flex items-center justify-between gap-4 animate-bounce-subtle w-80';

        const secondsLeft = (initialDurationMs / 1000).toFixed(1);

        card.innerHTML = `
            <div class="flex items-center gap-2.5">
                <span class="w-3 h-3 rounded-full bg-rose-500 animate-ping shrink-0"></span>
                <div>
                    <div class="text-xs font-bold text-rose-200">${citizen.name} đang chìm!</div>
                    <div class="text-xs font-mono text-rose-300 countdown-text">${secondsLeft}s</div>
                </div>
            </div>
            <button type="button" class="rescue-btn px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/30 transition-all shrink-0">
                CỨU ${citizen.name}
            </button>
        `;

        card.querySelector('.rescue-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (onRescueClick) onRescueClick();
        });

        this.container.appendChild(card);
        this.cards.set(citizen.id, card);
    }

    updateAlert(citizenId, remainingMs) {
        const card = this.cards.get(citizenId);
        if (!card) return;

        const sec = Math.max(0, remainingMs / 1000).toFixed(1);
        const textEl = card.querySelector('.countdown-text');
        if (textEl) {
            textEl.textContent = `${sec}s`;
        }
    }

    removeAlert(citizenId) {
        const card = this.cards.get(citizenId);
        if (card) {
            if (card.parentNode === this.container) {
                this.container.removeChild(card);
            }
            this.cards.delete(citizenId);
        }
    }
}
