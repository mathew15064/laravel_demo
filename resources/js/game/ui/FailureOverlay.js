/**
 * Paradise Gods - Database Failure Overlay
 * Displays dramatic seminar diagnostic message when data layer is offline.
 */
export class FailureOverlay {
    constructor(container, onRetryConnection) {
        this.container = container;
        this.onRetry = onRetryConnection;
    }

    show() {
        this.container.innerHTML = `
            <div class="pointer-events-auto max-w-lg w-full mx-4 p-8 rounded-3xl bg-black/85 border border-rose-600/70 shadow-2xl backdrop-blur-xl text-center space-y-6 animate-fade-in">
                <!-- Volcano / Fire Icon -->
                <div class="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-600 flex items-center justify-center shadow-xl shadow-rose-600/40 animate-pulse">
                    <span class="text-3xl">🌋</span>
                </div>

                <div>
                    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono tracking-widest bg-rose-950 text-rose-400 border border-rose-700/60 mb-3">
                        <span class="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                        DATA LAYER OFFLINE
                    </div>
                    <h1 class="text-2xl font-black text-white tracking-tight uppercase">
                        KHÔNG THỂ KẾT NỐI TỚI THIÊN ĐƯỜNG
                    </h1>
                    <p class="mt-3 text-sm text-rose-200/90 leading-relaxed font-sans">
                        Cánh cổng dữ liệu đã đóng.<br>
                        Thiên Đường không thể tải trạng thái thế giới.
                    </p>
                </div>

                <div class="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-900/60 text-xs font-mono text-slate-300">
                    <p class="text-rose-400 font-semibold mb-1">Seminar Diagnostic Notice:</p>
                    <p class="text-[11px] text-slate-400">MySQL / SQLite database connection unreachable. The 3D simulation has fallen into catastrophic volcanic state.</p>
                </div>

                <div class="pt-2">
                    <button type="button" id="failure-retry-btn"
                            class="w-full py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-rose-500 via-amber-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 text-slate-950 shadow-xl shadow-rose-600/30 hover:shadow-rose-600/50 transition-all flex items-center justify-center gap-2">
                        <svg class="w-4 h-4 animate-spin hidden" id="retry-spinner" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                        <span id="retry-btn-text">THỬ KẾT NỐI LẠI</span>
                    </button>
                    <p id="retry-status-text" class="mt-2 text-xs font-mono text-slate-400 hidden"></p>
                </div>
            </div>
        `;

        this.container.classList.remove('hidden');

        document.getElementById('failure-retry-btn')?.addEventListener('click', async () => {
            const btn = document.getElementById('failure-retry-btn');
            const spinner = document.getElementById('retry-spinner');
            const text = document.getElementById('retry-btn-text');
            const statusText = document.getElementById('retry-status-text');

            btn.disabled = true;
            spinner.classList.remove('hidden');
            text.textContent = 'Đang kiểm tra kết nối...';
            statusText.classList.add('hidden');

            if (this.onRetry) {
                const recovered = await this.onRetry();
                if (recovered) {
                    text.textContent = 'Kết nối thành công!';
                    statusText.textContent = 'Kết nối Thiên Đường đã được khôi phục. Đang chuyển về Quần Đảo...';
                    statusText.className = 'mt-2 text-xs font-mono text-emerald-400 block';
                    setTimeout(() => {
                        this.hide();
                    }, 1200);
                } else {
                    spinner.classList.add('hidden');
                    btn.disabled = false;
                    text.textContent = 'THỬ KẾT NỐI LẠI';
                    statusText.textContent = 'Cơ sở dữ liệu vẫn chưa phản hồi. Vui lòng kiểm tra lại dịch vụ MySQL.';
                    statusText.className = 'mt-2 text-xs font-mono text-rose-400 block';
                }
            }
        });
    }

    hide() {
        this.container.classList.add('hidden');
    }
}
