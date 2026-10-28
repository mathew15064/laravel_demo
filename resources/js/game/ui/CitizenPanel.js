/**
 * Paradise Gods - Selected Citizen Context Panel
 * Cooperative shared world: Any God can lift, throw, rename, and rescue citizens.
 * Displays history/attribution without restricting gameplay rights.
 */
export class CitizenPanel {
    constructor(container, apiClient, onLiftCitizen, onCitizenRenamed, onRescueCitizen = null) {
        this.container = container;
        this.apiClient = apiClient;
        this.onLiftCitizen = onLiftCitizen;
        this.onCitizenRenamed = onCitizenRenamed;
        this.onRescueCitizen = onRescueCitizen;
        this.currentCitizen = null;
        this.currentGod = null;
    }

    setCurrentGod(god) {
        this.currentGod = god;
    }

    show(citizen) {
        this.currentCitizen = citizen;
        const isDrowning = citizen.status === 'drowning';
        const isHeld = citizen.status === 'held' || citizen.isDragged;
        let statusLabel = 'Đang bình an';
        let statusColor = 'text-emerald-400';

        if (isDrowning) {
            statusLabel = '⚠ Đang chết đuối!';
            statusColor = 'text-rose-400 font-bold animate-pulse';
        } else if (isHeld) {
            statusLabel = '✋ Đang được nâng lên';
            statusColor = 'text-amber-300 font-semibold';
        }

        const creatorName = citizen.creatorName || citizen.data?.creator_name || 'Vô danh';
        const creatorColor = citizen.creatorColor || citizen.data?.creator_color || '#8b5cf6';
        const heldByName = citizen.heldByName || citizen.data?.held_by_god_name;
        const saviorName = citizen.saviorName || citizen.data?.last_rescued_by_god_name;

        this.container.innerHTML = `
            <div class="pointer-events-auto p-5 rounded-3xl bg-slate-900/90 border border-slate-700/80 shadow-2xl backdrop-blur-xl text-white space-y-4 w-72 animate-fade-in relative">
                <!-- Close Button -->
                <button type="button" id="citizen-panel-close-btn" class="absolute top-4 right-4 text-slate-400 hover:text-white p-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>

                <div>
                    <span class="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">SINH LINH THẾ GIỚI</span>
                    <h3 id="citizen-panel-name" class="text-lg font-bold text-white mt-0.5">${citizen.name}</h3>
                </div>

                <div class="space-y-2 text-xs">
                    <div class="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex justify-between items-center">
                        <span class="text-slate-400 font-mono">Trạng thái:</span>
                        <span class="${statusColor}">${statusLabel}</span>
                    </div>

                    <div class="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex justify-between items-center">
                        <span class="text-slate-400 font-mono">Vị trí:</span>
                        <span class="font-medium text-slate-200">${citizen.islandName || (isDrowning ? 'Biển sâu' : 'Không trung')}</span>
                    </div>

                    <div class="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex justify-between items-center">
                        <span class="text-slate-400 font-mono">Sáng tạo bởi:</span>
                        <div class="flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full" style="background-color: ${creatorColor}"></span>
                            <span class="font-medium" style="color: ${creatorColor}">Thần ${creatorName}</span>
                        </div>
                    </div>

                    ${heldByName ? `
                        <div class="p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/40 flex justify-between items-center">
                            <span class="text-slate-400 font-mono">Đang giữ bởi:</span>
                            <span class="font-bold text-amber-300">Thần ${heldByName}</span>
                        </div>
                    ` : ''}

                    ${saviorName ? `
                        <div class="p-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/40 flex justify-between items-center">
                            <span class="text-slate-400 font-mono">Từng được cứu bởi:</span>
                            <span class="font-medium text-emerald-300">Thần ${saviorName}</span>
                        </div>
                    ` : ''}

                    <!-- Appearance Preview Swatches -->
                    <div class="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex justify-between items-center">
                        <span class="text-slate-400 font-mono">Ngoại hình:</span>
                        <div class="flex items-center gap-2">
                            <span title="Màu da: ${citizen.skinTone}" class="w-4 h-4 rounded-full border border-slate-600 inline-block shadow-sm" style="background-color: ${citizen.skinTone}"></span>
                            <span title="Màu áo: ${citizen.clothingColor}" class="w-4 h-4 rounded-full border border-slate-600 inline-block shadow-sm" style="background-color: ${citizen.clothingColor}"></span>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons: Accessible to ALL Gods -->
                <div class="space-y-2 pt-1">
                    ${isDrowning ? `
                        <!-- Any god can rescue a drowning citizen! -->
                        <button type="button" id="citizen-rescue-btn"
                                class="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white shadow-lg shadow-rose-500/30 transition-all flex items-center justify-center gap-1.5 animate-pulse">
                            <span>⚡</span>
                            <span>PHÓNG THẦN LỰC CỨU NGAY!</span>
                        </button>
                    ` : ''}

                    <button type="button" id="citizen-lift-btn"
                            class="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-md shadow-cyan-500/20 transition-all flex items-center justify-center gap-1.5">
                        <span>✋</span>
                        <span>NHẤC LÊN / NÉM</span>
                    </button>

                    <button type="button" id="citizen-rename-btn"
                            class="w-full py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-cyan-300 transition-all">
                        Đổi tên cư dân
                    </button>
                </div>

                <!-- Inline Rename Form -->
                <form id="citizen-rename-form" class="hidden pt-2 border-t border-slate-800 space-y-2">
                    <input type="text" id="citizen-rename-input" required minlength="1" maxlength="40" value="${citizen.name}"
                           class="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400">
                    <div class="flex gap-2">
                        <button type="submit" class="flex-1 py-1 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold">LƯU</button>
                        <button type="button" id="citizen-rename-cancel-btn" class="flex-1 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs">HỦY</button>
                    </div>
                </form>
            </div>
        `;

        this.container.classList.remove('hidden');

        document.getElementById('citizen-panel-close-btn')?.addEventListener('click', () => this.hide());

        document.getElementById('citizen-rescue-btn')?.addEventListener('click', () => {
            if (this.onRescueCitizen) {
                this.onRescueCitizen(citizen);
            }
        });

        document.getElementById('citizen-lift-btn')?.addEventListener('click', () => {
            if (this.onLiftCitizen) this.onLiftCitizen(citizen);
        });

        const renameBtn = document.getElementById('citizen-rename-btn');
        const renameForm = document.getElementById('citizen-rename-form');
        const renameCancel = document.getElementById('citizen-rename-cancel-btn');

        renameBtn?.addEventListener('click', () => renameForm?.classList.remove('hidden'));
        renameCancel?.addEventListener('click', () => renameForm?.classList.add('hidden'));

        renameForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newName = document.getElementById('citizen-rename-input').value.trim();
            if (!newName) return;

            const res = await this.apiClient.renameCitizen(citizen.id, newName);
            if (res.ok) {
                citizen.name = newName;
                document.getElementById('citizen-panel-name').textContent = newName;
                citizen.updateLabel(newName);
                renameForm.classList.add('hidden');
                if (this.onCitizenRenamed) this.onCitizenRenamed(citizen, newName);
            }
        });
    }

    hide() {
        this.container.classList.add('hidden');
        this.currentCitizen = null;
    }
}
