/**
 * Paradise Gods - God Welcome Overlay
 * First-time cinematic god registration & returning god greeting.
 * Supports quick selection of canonical deities (Zeus, Athena, Ares, Apollo) and color aura customization.
 */
export class GodWelcome {
    constructor(overlayElement, apiClient, onGodReadyCallback) {
        this.overlay = overlayElement;
        this.apiClient = apiClient;
        this.onGodReady = onGodReadyCallback;
        this.selectedColor = '#8b5cf6';
    }

    showRegistration() {
        this.overlay.innerHTML = `
            <div class="max-w-md w-full mx-4 p-8 rounded-3xl bg-slate-900/95 border border-cyan-500/40 shadow-2xl backdrop-blur-xl text-center space-y-6 animate-fade-in">
                <div class="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                    <span class="text-3xl">⚡</span>
                </div>
                <div>
                    <h1 class="text-2xl font-extrabold text-white tracking-tight">Thiên Đường Quần Đảo</h1>
                    <p class="mt-2 text-sm text-cyan-200/90 leading-relaxed font-sans">
                        Chào mừng vị thần đã đến với Quần Đảo Thiên Đường.<br>
                        Hãy chọn danh vị và hào quang thần thánh của ngài.
                    </p>
                </div>

                <!-- Canonical Deity Presets -->
                <div class="space-y-2">
                    <span class="text-xs font-mono uppercase tracking-wider text-slate-400 block text-left">CHỌN NHANH VỊ THẦN</span>
                    <div class="grid grid-cols-2 gap-2">
                        <button type="button" class="preset-btn py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-purple-500/50 text-left flex items-center gap-2 transition-all"
                                data-name="Zeus" data-color="#8b5cf6">
                            <span class="w-3 h-3 rounded-full bg-purple-500 shadow-sm"></span>
                            <span class="text-xs font-bold text-white">Zeus</span>
                        </button>
                        <button type="button" class="preset-btn py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-cyan-500/50 text-left flex items-center gap-2 transition-all"
                                data-name="Athena" data-color="#06b6d4">
                            <span class="w-3 h-3 rounded-full bg-cyan-400 shadow-sm"></span>
                            <span class="text-xs font-bold text-white">Athena</span>
                        </button>
                        <button type="button" class="preset-btn py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-red-500/50 text-left flex items-center gap-2 transition-all"
                                data-name="Ares" data-color="#ef4444">
                            <span class="w-3 h-3 rounded-full bg-red-500 shadow-sm"></span>
                            <span class="text-xs font-bold text-white">Ares</span>
                        </button>
                        <button type="button" class="preset-btn py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-amber-500/50 text-left flex items-center gap-2 transition-all"
                                data-name="Apollo" data-color="#f59e0b">
                            <span class="w-3 h-3 rounded-full bg-amber-400 shadow-sm"></span>
                            <span class="text-xs font-bold text-white">Apollo</span>
                        </button>
                    </div>
                </div>

                <form id="god-welcome-form" class="space-y-4 pt-1">
                    <div>
                        <label for="god-name-input" class="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-2 text-left">Hoặc nhập tên tùy ý</label>
                        <input type="text" id="god-name-input" required minlength="2" maxlength="30" value="Zeus"
                               class="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono text-center">
                    </div>

                    <button type="submit" id="god-welcome-submit-btn"
                            class="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 shadow-lg shadow-cyan-500/30 transition-all">
                        BƯỚC VÀO THIÊN ĐƯỜNG
                    </button>
                </form>
            </div>
        `;

        this.overlay.classList.remove('hidden');

        const form = document.getElementById('god-welcome-form');
        const input = document.getElementById('god-name-input');
        const btn = document.getElementById('god-welcome-submit-btn');

        // Preset buttons
        this.overlay.querySelectorAll('.preset-btn').forEach((pBtn) => {
            pBtn.addEventListener('click', () => {
                input.value = pBtn.getAttribute('data-name');
                this.selectedColor = pBtn.getAttribute('data-color');
            });
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = input.value.trim();
            if (name.length < 2) return;

            btn.disabled = true;
            btn.textContent = 'Đang khai mở Thiên Đường...';

            const res = await this.apiClient.request('/api/gods', {
                method: 'POST',
                body: JSON.stringify({ name, god_color: this.selectedColor }),
            });

            if (res.ok && res.data?.god) {
                this.apiClient.setGodUuid(res.data.god.uuid);
                this.hide();
                if (this.onGodReady) {
                    this.onGodReady(res.data.god);
                }
            } else {
                btn.disabled = false;
                btn.textContent = 'BƯỚC VÀO THIÊN ĐƯỜNG';
                alert(res.data?.message || 'Có lỗi xảy ra khi tạo vị thần.');
            }
        });
    }

    showReturningGod(god) {
        this.overlay.innerHTML = `
            <div class="max-w-md w-full mx-4 p-8 rounded-3xl bg-slate-900/95 border border-cyan-500/40 shadow-2xl backdrop-blur-xl text-center space-y-6 animate-fade-in">
                <div class="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                    <span class="text-3xl">⚡</span>
                </div>
                <div>
                    <span class="text-xs font-mono uppercase tracking-widest text-cyan-400">VỊ THẦN TRỞ LẠI</span>
                    <h2 class="text-2xl font-extrabold text-white tracking-tight mt-1">
                        Chào mừng trở lại,<br><span style="color: ${god.god_color || '#38bdf8'}">Thần ${god.name}</span>.
                    </h2>
                    <p class="mt-2 text-xs text-slate-300">Quần Đảo Thiên Đường đang đợi ngài cai quản.</p>
                </div>
                <button type="button" id="god-resume-btn"
                        class="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 shadow-lg shadow-cyan-500/30 transition-all">
                    TIẾP TỤC TRỊ VÌ
                </button>
            </div>
        `;

        this.overlay.classList.remove('hidden');

        document.getElementById('god-resume-btn').addEventListener('click', () => {
            this.hide();
            if (this.onGodReady) {
                this.onGodReady(god);
            }
        });
    }

    hide() {
        this.overlay.classList.add('opacity-0', 'transition-opacity', 'duration-500');
        setTimeout(() => {
            this.overlay.classList.add('hidden');
            this.overlay.classList.remove('opacity-0');
        }, 500);
    }
}
