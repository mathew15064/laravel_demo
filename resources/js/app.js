import { initHeroScene } from './hero-scene.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Three.js Hero Scene
    const heroContainer = document.getElementById('hero-canvas-container');
    if (heroContainer) {
        initHeroScene(heroContainer);
    }

    // 2. Mobile Navigation Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-nav-drawer');
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
            mobileMenuBtn.setAttribute('aria-expanded', String(!isExpanded));
            mobileMenu.classList.toggle('hidden');
        });

        // Close on link click
        mobileMenu.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
            });
        });
    }

    // 3. Request Journey Layer Switcher
    const layerButtons = document.querySelectorAll('.journey-step-btn');
    const layerPanels = document.querySelectorAll('.journey-layer-panel');

    layerButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const targetLayer = btn.getAttribute('data-layer');

            layerButtons.forEach((b) => {
                b.classList.remove('active', 'border-cyan-400', 'bg-cyan-500/10', 'text-cyan-300');
                b.classList.add('border-slate-800', 'bg-slate-900/60', 'text-slate-400');
            });

            btn.classList.add('active', 'border-cyan-400', 'bg-cyan-500/10', 'text-cyan-300');
            btn.classList.remove('border-slate-800', 'bg-slate-900/60', 'text-slate-400');

            layerPanels.forEach((panel) => {
                if (panel.getAttribute('data-layer') === targetLayer) {
                    panel.classList.remove('hidden');
                } else {
                    panel.classList.add('hidden');
                }
            });
        });
    });

    // 4. Live System Diagnostics API Poller
    const diagBtn = document.getElementById('refresh-diag-btn');
    const diagAppStatus = document.getElementById('diag-app-status');
    const diagDbStatus = document.getElementById('diag-db-status');
    const diagCacheStatus = document.getElementById('diag-cache-status');
    const diagDbLatency = document.getElementById('diag-db-latency');
    const diagCacheLatency = document.getElementById('diag-cache-latency');
    const diagTimestamp = document.getElementById('diag-timestamp');
    const diagOverallBadge = document.getElementById('diag-overall-badge');

    async function fetchDiagnostics() {
        if (!diagBtn) return;
        const originalText = diagBtn.innerHTML;
        diagBtn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-cyan-400 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            Checking Telemetry...
        `;
        diagBtn.disabled = true;

        try {
            const start = performance.now();
            const res = await fetch('/api/status', {
                headers: { Accept: 'application/json' },
            });
            const data = await res.json();
            const elapsed = Math.round(performance.now() - start);

            if (diagAppStatus) {
                diagAppStatus.textContent = data.application === 'ok' ? 'HEALTHY' : 'DEGRADED';
                diagAppStatus.className = `font-mono text-xs px-2.5 py-1 rounded-full ${
                    data.application === 'ok' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`;
            }

            if (diagDbStatus) {
                diagDbStatus.textContent = data.database === 'ok' ? 'CONNECTED' : 'DISCONNECTED';
                diagDbStatus.className = `font-mono text-xs px-2.5 py-1 rounded-full ${
                    data.database === 'ok' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`;
            }

            if (diagCacheStatus) {
                diagCacheStatus.textContent = data.cache === 'ok' ? 'OPERATIONAL' : 'DEGRADED';
                diagCacheStatus.className = `font-mono text-xs px-2.5 py-1 rounded-full ${
                    data.cache === 'ok' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`;
            }

            if (diagDbLatency) {
                diagDbLatency.textContent = data.details?.database_latency_ms != null ? `${data.details.database_latency_ms} ms` : 'N/A';
            }

            if (diagCacheLatency) {
                diagCacheLatency.textContent = data.details?.cache_latency_ms != null ? `${data.details.cache_latency_ms} ms` : 'N/A';
            }

            if (diagTimestamp) {
                const now = new Date();
                diagTimestamp.textContent = `Last ping: ${now.toLocaleTimeString()} (${elapsed}ms roundtrip)`;
            }

            if (diagOverallBadge) {
                const allHealthy = data.application === 'ok' && data.database === 'ok' && data.cache === 'ok';
                diagOverallBadge.innerHTML = allHealthy
                    ? `<span class="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-700/50 px-3 py-1 rounded-full"><span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> All Systems Operational</span>`
                    : `<span class="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400 bg-rose-950/60 border border-rose-700/50 px-3 py-1 rounded-full"><span class="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span> Layer Failure Detected</span>`;
            }
        } catch {
            if (diagOverallBadge) {
                diagOverallBadge.innerHTML = `<span class="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-950/60 border border-amber-700/50 px-3 py-1 rounded-full">Endpoint Unreachable</span>`;
            }
        } finally {
            diagBtn.innerHTML = originalText;
            diagBtn.disabled = false;
        }
    }

    if (diagBtn) {
        diagBtn.addEventListener('click', fetchDiagnostics);
    }

    // 5. Contact / Seminar Registration Form Handler
    const contactForm = document.getElementById('seminar-registration-form');
    const formAlert = document.getElementById('form-feedback-alert');
    const submitBtn = document.getElementById('contact-submit-btn');

    if (contactForm && formAlert && submitBtn) {
        contactForm.addEventListener('submit', async (e) => {
            // Check HTML5 client validation
            if (!contactForm.checkValidity()) {
                return; // let native tooltips show
            }

            e.preventDefault();
            const originalBtnHtml = submitBtn.innerHTML;
            submitBtn.innerHTML = `
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                Registering Seat...
            `;
            submitBtn.disabled = true;

            // Reset field error highlights
            contactForm.querySelectorAll('.field-error-text').forEach((el) => el.remove());
            contactForm.querySelectorAll('.input-field').forEach((el) => {
                el.classList.remove('border-rose-500', 'focus:ring-rose-500');
            });
            formAlert.classList.add('hidden');

            const formData = new FormData(contactForm);

            try {
                const res = await fetch(contactForm.action, {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: formData,
                });

                const data = await res.json();

                if (res.ok && data.success) {
                    formAlert.className = 'p-4 rounded-xl text-sm border bg-emerald-950/60 border-emerald-500/40 text-emerald-300 flex items-start gap-3';
                    formAlert.innerHTML = `
                        <svg class="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <div>
                            <p class="font-semibold text-emerald-200">Registration Confirmed!</p>
                            <p class="mt-0.5 text-xs text-emerald-300/90">${data.message}</p>
                        </div>
                    `;
                    formAlert.classList.remove('hidden');
                    contactForm.reset();

                    // Update live inquiries count badge if present
                    const countEl = document.getElementById('live-inquiries-count');
                    if (countEl) {
                        const current = parseInt(countEl.textContent, 10) || 0;
                        countEl.textContent = String(current + 1);
                    }
                } else if (res.status === 422) {
                    // Validation errors
                    formAlert.className = 'p-4 rounded-xl text-sm border bg-rose-950/60 border-rose-500/40 text-rose-300 flex items-start gap-3';
                    const errors = data.errors || {};
                    let errorListHtml = Object.values(errors).flat().map((msg) => `<li>• ${msg}</li>`).join('');
                    formAlert.innerHTML = `
                        <svg class="w-5 h-5 text-rose-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                        <div>
                            <p class="font-semibold text-rose-200">Please review the form errors:</p>
                            <ul class="mt-1 text-xs text-rose-300 space-y-0.5">${errorListHtml}</ul>
                        </div>
                    `;
                    formAlert.classList.remove('hidden');

                    // Highlight fields
                    Object.keys(errors).forEach((fieldName) => {
                        const input = contactForm.querySelector(`[name="${fieldName}"]`);
                        if (input) {
                            input.classList.add('border-rose-500');
                        }
                    });
                } else {
                    throw new Error(data.message || 'Server error occurred');
                }
            } catch (err) {
                formAlert.className = 'p-4 rounded-xl text-sm border bg-rose-950/60 border-rose-500/40 text-rose-300 flex items-start gap-3';
                formAlert.innerHTML = `
                    <svg class="w-5 h-5 text-rose-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <div>
                        <p class="font-semibold text-rose-200">Submission Error</p>
                        <p class="mt-0.5 text-xs text-rose-300/90">${err.message || 'Unable to submit inquiry. Check network or server status.'}</p>
                    </div>
                `;
                formAlert.classList.remove('hidden');
            } finally {
                submitBtn.innerHTML = originalBtnHtml;
                submitBtn.disabled = false;
            }
        });
    }
});
