/**
 * Paradise Gods - Remote God Profile Modal
 * Inspects a fellow deity's statistics and triggers divine interactions (blessing, greeting, focus).
 */
export class GodProfileModal {
    constructor(container, apiClient, realtimeClient, onFocusGod = null) {
        this.container = container;
        this.apiClient = apiClient;
        this.realtimeClient = realtimeClient;
        this.onFocusGod = onFocusGod;
        this.currentGodData = null;
    }

    show(godData) {
        this.currentGodData = godData;
        const color = godData.god_color || '#8b5cf6';
        const stats = godData.stats || {};

        this.container.innerHTML = `
            <div class="w-full max-w-md mx-4 p-6 rounded-3xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl text-white animate-in fade-in zoom-in-95 duration-200">
                <!-- Header with Deity Aura Icon -->
                <div class="flex items-center gap-4 mb-6 pb-4 border-b border-slate-800">
                    <div class="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg relative"
                         style="background: radial-gradient(circle, ${color} 0%, rgba(15, 23, 42, 0.9) 70%); border: 2px solid ${color};">
                        <span class="text-2xl">⚡</span>
                        <span class="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse"></span>
                    </div>
                    <div>
                        <h2 class="text-xl font-black tracking-wide" style="color: ${color}">Thần ${godData.name}</h2>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                            <span class="text-xs font-medium text-emerald-400">Đang hiện diện trên Quần Đảo</span>
                        </div>
                    </div>
                </div>

                <!-- Statistics Grid -->
                <div class="grid grid-cols-2 gap-3 mb-6">
                    <div class="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-750">
                        <div class="text-xs text-slate-400">Cư dân đã tạo</div>
                        <div class="text-lg font-bold font-mono text-cyan-300 mt-0.5">${stats.created ?? 0}</div>
                    </div>
                    <div class="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-750">
                        <div class="text-xs text-slate-400">Cư dân đang sống</div>
                        <div class="text-lg font-bold font-mono text-emerald-400 mt-0.5">${stats.alive ?? 0}</div>
                    </div>
                    <div class="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-750">
                        <div class="text-xs text-slate-400">Cứu vớt cư dân</div>
                        <div class="text-lg font-bold font-mono text-amber-400 mt-0.5">⚡ ${stats.rescued ?? 0}</div>
                    </div>
                    <div class="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-750">
                        <div class="text-xs text-slate-400">Cứu giúp thần khác</div>
                        <div class="text-lg font-bold font-mono text-purple-300 mt-0.5">${stats.other_gods_rescued ?? 0}</div>
                    </div>
                    <div class="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-750 col-span-2 flex items-center justify-between">
                        <span class="text-xs text-slate-400">Được chư thần giải cứu:</span>
                        <span class="font-mono font-bold text-sm text-pink-400">${stats.rescued_by_others ?? 0} lần</span>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex flex-col gap-2.5">
                    <div class="grid grid-cols-2 gap-2.5">
                        <button type="button" id="god-profile-bless-btn"
                                class="py-2.5 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 hover:border-amber-400 text-amber-200 font-bold text-sm flex items-center justify-center gap-2 transition-all">
                            <span>✨</span> Ban phước lành
                        </button>
                        <button type="button" id="god-profile-greet-btn"
                                class="py-2.5 px-4 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 hover:border-cyan-400 text-cyan-200 font-bold text-sm flex items-center justify-center gap-2 transition-all">
                            <span>👋</span> Cúi chào
                        </button>
                    </div>

                    ${this.onFocusGod && godData.position ? `
                        <button type="button" id="god-profile-focus-btn"
                                class="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition-all">
                            <span>🔭</span> Dõi theo thần
                        </button>
                    ` : ''}

                    <button type="button" id="god-profile-close-btn"
                            class="py-2.5 px-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-white font-medium text-sm transition-all mt-1">
                        Đóng
                    </button>
                </div>
            </div>
        `;

        this.container.classList.remove('hidden');

        // Wire event listeners
        document.getElementById('god-profile-bless-btn')?.addEventListener('click', async () => {
            if (godData.uuid) {
                await this.apiClient.request(`/api/gods/${godData.uuid}/bless`, { method: 'POST' });
            }
            if (this.realtimeClient) {
                this.realtimeClient.sendBless(godData);
            }
            this.hide();
        });

        document.getElementById('god-profile-greet-btn')?.addEventListener('click', async () => {
            if (godData.uuid) {
                await this.apiClient.request(`/api/gods/${godData.uuid}/greet`, { method: 'POST' });
            }
            if (this.realtimeClient) {
                this.realtimeClient.sendEmote(godData, 'greet');
            }
            this.hide();
        });

        document.getElementById('god-profile-focus-btn')?.addEventListener('click', () => {
            if (this.onFocusGod && godData.position) {
                this.onFocusGod(godData.position.x, godData.position.z);
            }
            this.hide();
        });

        document.getElementById('god-profile-close-btn')?.addEventListener('click', () => {
            this.hide();
        });
    }

    hide() {
        this.container.classList.add('hidden');
        this.currentGodData = null;
    }
}
