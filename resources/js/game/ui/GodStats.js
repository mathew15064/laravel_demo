/**
 * Paradise Gods - God Statistics Panel & Renaming Modal
 */
export class GodStats {
    constructor(modalElement, apiClient, onGodUpdated) {
        this.modal = modalElement;
        this.apiClient = apiClient;
        this.onGodUpdated = onGodUpdated;
        this.currentGod = null;
    }

    show(god) {
        this.currentGod = god;
        const rawName = god.name || 'Vô Danh';
        const cleanName = rawName.startsWith('Thần ') ? rawName.slice(5) : rawName;
        const stats = god.stats || { created: 0, alive: 0, rescued: 0, drowned: 0, islands_governed: 0 };

        this.modal.innerHTML = `
            <div class="max-w-md w-full mx-4 p-6 sm:p-8 rounded-3xl bg-slate-900/95 border border-cyan-500/40 shadow-2xl backdrop-blur-2xl text-white space-y-6 animate-fade-in relative">
                <!-- Close Button -->
                <button type="button" id="god-stats-close-btn" class="absolute top-5 right-5 text-slate-400 hover:text-white p-1">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>

                <div class="flex items-center gap-3.5 pb-4 border-b border-slate-800">
                    <div class="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-2xl text-cyan-400">
                        ⚡
                    </div>
                    <div>
                        <span class="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">HỒ SƠ VỊ THẦN</span>
                        <h2 class="text-xl font-bold text-white flex items-center gap-2">
                            <span id="god-stats-display-name">Thần ${cleanName}</span>
                        </h2>
                    </div>
                </div>

                <!-- 4 Statistics Metric Cards -->
                <div class="grid grid-cols-2 gap-3">
                    <div class="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                        <span class="text-[11px] font-mono text-slate-400 block mb-1">Dân đã tạo</span>
                        <span class="text-2xl font-bold font-mono text-cyan-300">${stats.created ?? 0}</span>
                    </div>
                    <div class="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                        <span class="text-[11px] font-mono text-slate-400 block mb-1">Đang sống</span>
                        <span class="text-2xl font-bold font-mono text-emerald-400">${stats.alive ?? 0}</span>
                    </div>
                    <div class="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                        <span class="text-[11px] font-mono text-slate-400 block mb-1">Đã cứu</span>
                        <span class="text-2xl font-bold font-mono text-amber-300">${stats.rescued ?? 0}</span>
                    </div>
                    <div class="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                        <span class="text-[11px] font-mono text-slate-400 block mb-1">Đã chết đuối</span>
                        <span class="text-2xl font-bold font-mono text-rose-400">${stats.drowned ?? 0}</span>
                    </div>
                </div>

                <!-- Rename God Form -->
                <form id="god-rename-form" class="pt-2 border-t border-slate-800 space-y-3">
                    <label class="block text-xs font-mono uppercase tracking-wider text-slate-300">Đổi tên vị thần</label>
                    <div class="flex gap-2">
                        <input type="text" id="god-rename-input" required minlength="2" maxlength="30" value="${god.name}"
                               class="flex-grow px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400">
                        <button type="submit" class="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all">
                            LƯU
                        </button>
                    </div>
                </form>
            </div>
        `;

        this.modal.classList.remove('hidden');

        document.getElementById('god-stats-close-btn')?.addEventListener('click', () => this.hide());

        document.getElementById('god-rename-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newName = document.getElementById('god-rename-input').value.trim();
            if (newName.length < 2) return;

            const res = await this.apiClient.renameGod(newName);
            if (res.ok && res.data?.god) {
                this.currentGod = res.data.god;
                document.getElementById('god-stats-display-name').textContent = `Thần ${res.data.god.name}`;
                if (this.onGodUpdated) this.onGodUpdated(res.data.god);
            }
        });
    }

    hide() {
        this.modal.classList.add('hidden');
    }
}
