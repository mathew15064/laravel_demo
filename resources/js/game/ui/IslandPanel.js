/**
 * Paradise Gods - Selected Island Context Panel
 */
export class IslandPanel {
    constructor(container, apiClient, onCreateCitizen, onFocusIsland, onIslandRenamed) {
        this.container = container;
        this.apiClient = apiClient;
        this.onCreateCitizen = onCreateCitizen;
        this.onFocusIsland = onFocusIsland;
        this.onIslandRenamed = onIslandRenamed;
        this.currentIsland = null;
    }

    show(island) {
        this.currentIsland = island;
        this.container.innerHTML = `
            <div class="pointer-events-auto p-5 rounded-3xl bg-slate-900/90 border border-slate-700/80 shadow-2xl backdrop-blur-xl text-white space-y-4 w-72 animate-fade-in relative">
                <!-- Close Button -->
                <button type="button" id="island-panel-close-btn" class="absolute top-4 right-4 text-slate-400 hover:text-white p-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>

                <div>
                    <span class="text-[10px] font-mono tracking-widest text-emerald-400 uppercase">HÒN ĐẢO</span>
                    <h3 id="island-panel-name" class="text-lg font-bold text-white mt-0.5">${island.name}</h3>
                </div>

                <div class="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                    <span class="text-xs font-mono text-slate-400">Dân số hiện tại:</span>
                    <span id="island-panel-population" class="text-xl font-bold font-mono text-emerald-400">${island.data.population ?? 0}</span>
                </div>

                <!-- Action Buttons -->
                <div class="space-y-2 pt-1">
                    <button type="button" id="island-create-citizen-btn"
                            class="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5">
                        <span>✨</span>
                        <span>TẠO NGƯỜI DÂN</span>
                    </button>

                    <button type="button" id="island-focus-btn"
                            class="w-full py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all">
                        FOCUS ĐẢO
                    </button>

                    <button type="button" id="island-rename-btn"
                            class="w-full py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-cyan-300 transition-all">
                        Đổi tên đảo
                    </button>
                </div>

                <!-- Inline Rename Form (hidden by default) -->
                <form id="island-rename-form" class="hidden pt-2 border-t border-slate-800 space-y-2">
                    <input type="text" id="island-rename-input" required minlength="2" maxlength="80" value="${island.name}"
                           class="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400">
                    <div class="flex gap-2">
                        <button type="submit" class="flex-1 py-1 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold">LƯU</button>
                        <button type="button" id="island-rename-cancel-btn" class="flex-1 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs">HỦY</button>
                    </div>
                </form>

                <!-- Inline Create Citizen Form (hidden by default) -->
                <form id="island-create-citizen-form" class="hidden pt-2 border-t border-slate-800 space-y-2">
                    <span class="text-[11px] font-mono text-cyan-300 block">Ban sự sống cho sinh linh mới</span>
                    <input type="text" id="citizen-name-input" required minlength="1" maxlength="40" placeholder="Tên cư dân (e.g. Minh, An)"
                           class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400">
                    <div class="flex gap-2">
                        <button type="submit" id="citizen-confirm-create-btn" class="flex-1 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold">BAN SỰ SỐNG</button>
                        <button type="button" id="citizen-cancel-create-btn" class="flex-1 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs">HỦY</button>
                    </div>
                </form>
            </div>
        `;

        this.container.classList.remove('hidden');

        document.getElementById('island-panel-close-btn')?.addEventListener('click', () => this.hide());

        document.getElementById('island-focus-btn')?.addEventListener('click', () => {
            if (this.onFocusIsland) this.onFocusIsland(island.worldX, island.worldZ);
        });

        // Rename toggle
        const renameBtn = document.getElementById('island-rename-btn');
        const renameForm = document.getElementById('island-rename-form');
        const renameCancel = document.getElementById('island-rename-cancel-btn');
        renameBtn?.addEventListener('click', () => renameForm?.classList.remove('hidden'));
        renameCancel?.addEventListener('click', () => renameForm?.classList.add('hidden'));

        renameForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newName = document.getElementById('island-rename-input').value.trim();
            if (newName.length < 2) return;

            const res = await this.apiClient.renameIsland(island.id, newName);
            if (res.ok) {
                island.name = newName;
                island.updateLabel(newName);
                document.getElementById('island-panel-name').textContent = newName;
                renameForm.classList.add('hidden');
                if (this.onIslandRenamed) this.onIslandRenamed(island, newName);
            }
        });

        // Create citizen toggle
        const createBtn = document.getElementById('island-create-citizen-btn');
        const createForm = document.getElementById('island-create-citizen-form');
        const createCancel = document.getElementById('citizen-cancel-create-btn');
        createBtn?.addEventListener('click', () => {
            createForm?.classList.remove('hidden');
            document.getElementById('citizen-name-input')?.focus();
        });
        createCancel?.addEventListener('click', () => createForm?.classList.add('hidden'));

        createForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('citizen-name-input').value.trim();
            if (!name) return;

            const submitBtn = document.getElementById('citizen-confirm-create-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Đang tạo...';

            if (this.onCreateCitizen) {
                await this.onCreateCitizen(island, name);
            }

            submitBtn.disabled = false;
            submitBtn.textContent = 'BAN SỰ SỐNG';
            createForm.classList.add('hidden');
            document.getElementById('citizen-name-input').value = '';
            // Update panel population
            document.getElementById('island-panel-population').textContent = island.data.population;
        });
    }

    updatePopulation(pop) {
        const el = document.getElementById('island-panel-population');
        if (el) el.textContent = pop;
    }

    hide() {
        this.container.classList.add('hidden');
    }
}
