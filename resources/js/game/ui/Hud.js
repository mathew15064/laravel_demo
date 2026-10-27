/**
 * Paradise Gods - World HUD
 * Top-left minimal status, population counter, and stats trigger.
 */
export class Hud {
    constructor(container, onOpenStats, onResetWorld) {
        this.container = container;
        this.onOpenStats = onOpenStats;
        this.onResetWorld = onResetWorld;
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="pointer-events-auto flex items-center gap-3">
                <!-- God Badge (Click opens stats) -->
                <button type="button" id="hud-god-btn"
                        class="px-4 py-2.5 rounded-2xl bg-slate-900/85 border border-cyan-500/40 hover:border-cyan-400 text-white shadow-xl backdrop-blur-md flex items-center gap-2.5 transition-all group">
                    <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                    <span id="hud-god-name" class="font-bold text-sm text-cyan-200 group-hover:text-white">⚡ Thần...</span>
                </button>

                <!-- World Population Badge -->
                <div class="px-4 py-2.5 rounded-2xl bg-slate-900/85 border border-slate-700/80 text-white shadow-xl backdrop-blur-md flex items-center gap-2">
                    <span class="text-xs font-mono text-slate-400">Dân số:</span>
                    <span id="hud-world-population" class="font-mono font-bold text-sm text-emerald-400">0</span>
                </div>

                <!-- World Reset Button -->
                <button type="button" id="hud-reset-world-btn" title="Khôi phục trạng thái ban đầu"
                        class="p-2.5 rounded-2xl bg-slate-900/85 border border-slate-750 hover:border-slate-500 text-slate-400 hover:text-white shadow-xl backdrop-blur-md transition-all">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                </button>
            </div>
        `;

        document.getElementById('hud-god-btn')?.addEventListener('click', () => {
            if (this.onOpenStats) this.onOpenStats();
        });

        document.getElementById('hud-reset-world-btn')?.addEventListener('click', () => {
            if (confirm('Khôi phục thế giới Thiên Đường về trạng thái ban đầu?')) {
                if (this.onResetWorld) this.onResetWorld();
            }
        });
    }

    setGod(god) {
        const nameEl = document.getElementById('hud-god-name');
        if (nameEl) {
            const rawName = god?.name || 'Vô Danh';
            const cleanName = rawName.startsWith('Thần ') ? rawName.slice(5) : rawName;
            nameEl.textContent = `⚡ Thần ${cleanName}`;
        }
    }

    setWorldPopulation(pop) {
        const popEl = document.getElementById('hud-world-population');
        if (popEl) popEl.textContent = pop;
    }
}
