/**
 * Paradise Gods - World HUD & Presence List
 * Displays minimal status, world population, reset button, and live online Gods presence list.
 */
export class Hud {
    constructor(container, onOpenStats, onResetWorld, onSelectOnlineGod = null) {
        this.container = container;
        this.onOpenStats = onOpenStats;
        this.onResetWorld = onResetWorld;
        this.onSelectOnlineGod = onSelectOnlineGod;

        this.currentGod = null;
        this.onlineGods = [];
        this.recentLeaves = new Map(); // godId -> { name, timer }

        this.render();
    }

    render() {
        this.container.innerHTML = `
            <!-- Top Controls Row -->
            <div class="pointer-events-auto flex items-center gap-3">
                <!-- God Badge (Click opens stats) -->
                <button type="button" id="hud-god-btn"
                        class="px-4 py-2.5 rounded-2xl bg-slate-900/85 border border-cyan-500/40 hover:border-cyan-400 text-white shadow-xl backdrop-blur-md flex items-center gap-2.5 transition-all group">
                    <span id="hud-god-dot" class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
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

            <!-- Online Gods Presence Card -->
            <div id="hud-presence-card" class="pointer-events-auto w-64 p-3.5 rounded-2xl bg-slate-900/85 border border-slate-800 text-white shadow-xl backdrop-blur-md">
                <div class="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800/80">
                    <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">CÁC VỊ THẦN HIỆN DIỆN</span>
                    <span id="hud-presence-count" class="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300">1</span>
                </div>
                <div id="hud-presence-list" class="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                    <!-- Dynamic god entries -->
                </div>
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
        this.currentGod = god;
        const nameEl = document.getElementById('hud-god-name');
        const dotEl = document.getElementById('hud-god-dot');
        if (nameEl && god) {
            const rawName = god?.name || 'Vô Danh';
            const cleanName = rawName.startsWith('Thần ') ? rawName.slice(5) : rawName;
            nameEl.textContent = `⚡ Thần ${cleanName}`;
            if (god.god_color) {
                nameEl.style.color = god.god_color;
                if (dotEl) dotEl.style.backgroundColor = god.god_color;
            }
        }
        this.renderPresenceList();
    }

    setWorldPopulation(pop) {
        const popEl = document.getElementById('hud-world-population');
        if (popEl) popEl.textContent = pop;
    }

    updateOnlineGods(godsList) {
        this.onlineGods = godsList || [];
        this.renderPresenceList();
    }

    addRecentLeave(godId, name) {
        if (this.recentLeaves.has(godId)) {
            clearTimeout(this.recentLeaves.get(godId).timer);
        }

        const timer = setTimeout(() => {
            this.recentLeaves.delete(godId);
            this.renderPresenceList();
        }, 5000);

        this.recentLeaves.set(godId, { name, timer });
        this.renderPresenceList();
    }

    renderPresenceList() {
        const listEl = document.getElementById('hud-presence-list');
        const countEl = document.getElementById('hud-presence-count');
        if (!listEl) return;

        // Combine current local God + remote online Gods
        const allGods = [];
        if (this.currentGod) {
            allGods.push({
                ...this.currentGod,
                isLocal: true,
            });
        }

        (this.onlineGods || []).forEach((og) => {
            const id = og.id || og.god_id;
            if (this.currentGod && (this.currentGod.id === id || this.currentGod.uuid === og.uuid)) {
                return;
            }
            allGods.push({
                ...og,
                isLocal: false,
            });
        });

        if (countEl) countEl.textContent = allGods.length;

        let html = '';
        allGods.forEach((g) => {
            const color = g.god_color || '#8b5cf6';
            const isLocal = g.isLocal;
            const id = g.id || g.god_id;
            html += `
                <div class="flex items-center justify-between py-1 px-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition-colors group"
                     data-god-id="${id}">
                    <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full shadow-sm" style="background-color: ${color}"></span>
                        <span class="text-xs font-medium text-slate-200 group-hover:text-white" style="color: ${color}">
                            ${g.name} ${isLocal ? '<span class="text-[10px] text-slate-400 font-normal">(bạn)</span>' : ''}
                        </span>
                    </div>
                    <span class="text-[10px] text-emerald-400 font-mono">online</span>
                </div>
            `;
        });

        // Add recent leaves (fading out)
        for (const [id, leave] of this.recentLeaves.entries()) {
            html += `
                <div class="flex items-center justify-between py-1 px-2 rounded-xl bg-slate-800/30 opacity-60 text-slate-400 transition-opacity">
                    <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full border border-slate-500"></span>
                        <span class="text-xs italic">${leave.name}</span>
                    </div>
                    <span class="text-[10px] text-slate-500">vừa rời đi</span>
                </div>
            `;
        }

        listEl.innerHTML = html;

        // Attach click listeners to view profile
        listEl.querySelectorAll('[data-god-id]').forEach((el) => {
            el.addEventListener('click', () => {
                const godId = parseInt(el.getAttribute('data-god-id'), 10);
                const god = allGods.find((g) => (g.id || g.god_id) === godId);
                if (god && this.onSelectOnlineGod) {
                    this.onSelectOnlineGod(god);
                }
            });
        });
    }
}
