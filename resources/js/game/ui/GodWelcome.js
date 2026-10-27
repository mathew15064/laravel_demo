/**
 * Paradise Gods - God Welcome Overlay
 * First-time cinematic god registration & returning god greeting.
 */
export class GodWelcome {
    constructor(overlayElement, apiClient, onGodReadyCallback) {
        this.overlay = overlayElement;
        this.apiClient = apiClient;
        this.onGodReady = onGodReadyCallback;
    }

    showRegistration() {
        this.overlay.innerHTML = `
            <div class="max-w-md w-full mx-4 p-8 rounded-3xl bg-slate-900/90 border border-cyan-500/40 shadow-2xl backdrop-blur-xl text-center space-y-6 animate-fade-in">
                <div class="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                    <span class="text-3xl">⚡</span>
                </div>
                <div>
                    <h1 class="text-2xl font-extrabold text-white tracking-tight">Thiên Đường Quần Đảo</h1>
                    <p class="mt-2 text-sm text-cyan-200/90 leading-relaxed font-sans">
                        Chào mừng vị thần đã đến với Quần Đảo Thiên Đường.<br>
                        Hãy cho thần dân biết tên của ngài.
                    </p>
                </div>

                <form id="god-welcome-form" class="space-y-4">
                    <div>
                        <label for="god-name-input" class="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-2">Tên vị thần</label>
                        <input type="text" id="god-name-input" required minlength="2" maxlength="30" placeholder="e.g. Zeus, Huynh, Thần Debug"
                               class="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 font-mono text-center">
                    </div>
                    <button type="submit" id="god-welcome-submit-btn"
                            class="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all">
                        BƯỚC VÀO THIÊN ĐƯỜNG
                    </button>
                </form>
            </div>
        `;

        this.overlay.classList.remove('hidden');

        const form = document.getElementById('god-welcome-form');
        const input = document.getElementById('god-name-input');
        const btn = document.getElementById('god-welcome-submit-btn');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = input.value.trim();
            if (name.length < 2) return;

            btn.disabled = true;
            btn.textContent = 'Đang khai mở Thiên Đường...';

            const res = await this.apiClient.registerGod(name);
            if (res.ok && res.data?.god) {
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
            <div class="max-w-md w-full mx-4 p-8 rounded-3xl bg-slate-900/90 border border-cyan-500/40 shadow-2xl backdrop-blur-xl text-center space-y-6 animate-fade-in">
                <div class="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                    <span class="text-3xl">⚡</span>
                </div>
                <div>
                    <span class="text-xs font-mono uppercase tracking-widest text-cyan-400">VỊ THẦN TRỞ LẠI</span>
                    <h2 class="text-2xl font-extrabold text-white tracking-tight mt-1">
                        Chào mừng trở lại,<br><span class="text-cyan-300">Thần ${god.name}</span>.
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
