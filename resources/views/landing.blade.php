<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="scroll-smooth">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>{{ config('app.name', 'DeployLab') }} — See Every Layer Behind a Web Request</title>
    <meta name="description" content="Technical seminar platform for full-stack Linux, Apache, PHP-FPM, Laravel, MySQL, and Redis request flow debugging.">

    <!-- Styles & Scripts bundled locally via Vite (No external CDNs) -->
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="bg-[#060913] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">

    <!-- Background Technical Grid & Ambient Lighting -->
    <div class="fixed inset-0 bg-grid-pattern pointer-events-none z-0 opacity-60"></div>
    <div class="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-radial-gradient pointer-events-none z-0"></div>

    <div class="relative z-10 flex flex-col min-h-screen">
        
        <!-- ================================================================= -->
        <!-- NAVIGATION -->
        <!-- ================================================================= -->
        <header class="sticky top-0 z-50 backdrop-blur-md bg-[#060913]/85 border-b border-slate-800/80 transition-all">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                
                <!-- Brand / Logo -->
                <a href="#hero" class="flex items-center gap-3.5 group">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-[1px] shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all duration-300">
                        <div class="w-full h-full bg-[#090e1c] rounded-[11px] flex items-center justify-center">
                            <svg class="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                            </svg>
                        </div>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-lg tracking-tight text-white group-hover:text-cyan-300 transition-colors">DeployLab</span>
                            <span class="text-[10px] font-mono tracking-widest px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">SEMINAR 2026</span>
                        </div>
                        <p class="text-[11px] font-mono text-slate-400">Request Flow Architecture</p>
                    </div>
                </a>

                <!-- Desktop Navigation Links -->
                <nav class="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-300">
                    <a href="#journey" class="hover:text-cyan-400 transition-colors">Request Journey</a>
                    <a href="#layers" class="hover:text-cyan-400 transition-colors">Architecture</a>
                    <a href="#breakdowns" class="hover:text-cyan-400 transition-colors">Failure Modes</a>
                    <a href="#diagnostics" class="hover:text-cyan-400 transition-colors">Live Status</a>
                    <a href="#contact" class="hover:text-cyan-400 transition-colors">Seminar Registration</a>
                </nav>

                <!-- Status Pill & Primary CTA -->
                <div class="hidden lg:flex items-center gap-4">
                    <a href="/health" target="_blank" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:border-cyan-500/40 transition-all">
                        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>/health: OK</span>
                    </a>
                    <a href="#contact" class="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/35 transition-all">
                        Reserve Seat
                    </a>
                </div>

                <!-- Mobile & Tablet Menu Button -->
                <button id="mobile-menu-btn" type="button" aria-expanded="false" aria-label="Toggle Navigation Menu" class="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 focus:outline-none">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"/>
                    </svg>
                </button>
            </div>

            <!-- Mobile & Tablet Navigation Drawer -->
            <div id="mobile-nav-drawer" class="hidden lg:hidden border-t border-slate-800/80 bg-[#090e1c] px-4 pt-3 pb-6 space-y-3">
                <a href="#journey" class="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-cyan-400">Request Journey</a>
                <a href="#layers" class="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-cyan-400">Architecture</a>
                <a href="#breakdowns" class="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-cyan-400">Failure Modes</a>
                <a href="#diagnostics" class="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-cyan-400">Live Status</a>
                <a href="#contact" class="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-cyan-400">Seminar Registration</a>
                <div class="pt-2 flex flex-col gap-2">
                    <a href="/health" target="_blank" class="text-center px-3 py-2 rounded-lg text-xs font-mono bg-slate-800/80 text-emerald-400 border border-slate-700">
                        ● Runtime Health Check
                    </a>
                    <a href="#contact" class="text-center px-4 py-2.5 rounded-lg text-xs font-bold bg-cyan-500 text-slate-950">
                        Reserve Seat
                    </a>
                </div>
            </div>
        </header>

        <main class="flex-grow">
            <!-- ================================================================= -->
            <!-- HERO SECTION WITH CINEMATIC THREE.JS VISUALIZATION -->
            <!-- ================================================================= -->
            <section id="hero" class="relative pt-8 pb-16 lg:pt-14 lg:pb-24 overflow-hidden border-b border-slate-800/60">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
                        
                        <!-- Left Hero Copy Column -->
                        <div class="lg:col-span-6 z-20 space-y-6">
                            
                            <!-- Topic Announcement Badge -->
                            <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono bg-slate-900/90 border border-cyan-500/30 text-cyan-300 shadow-sm shadow-cyan-500/10">
                                <span class="relative flex h-2 w-2">
                                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                    <span class="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                                </span>
                                <span>HANDS-ON PRODUCTION TROUBLESHOOTING</span>
                            </div>

                            <!-- Hero Headline -->
                            <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
                                Understand <span class="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">every layer</span> behind every request.
                            </h1>

                            <!-- Hero Subtitle -->
                            <p class="text-base sm:text-lg text-slate-300/90 leading-relaxed max-w-xl">
                                Follow a single HTTP packet from the user's browser through DNS, Apache, PHP-FPM 8.4, Laravel, and data tiers — and master diagnosing the exact failure point when production goes dark.
                            </p>

                            <!-- CTAs -->
                            <div class="flex flex-wrap items-center gap-4 pt-2">
                                <a href="#journey" class="px-6 py-3.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all flex items-center gap-2">
                                    <span>Explore Request Pipeline</span>
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
                                    </svg>
                                </a>
                                <a href="#diagnostics" class="px-6 py-3.5 rounded-xl text-sm font-semibold bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/40 text-slate-200 transition-all flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
                                    <span>Run Diagnostics</span>
                                </a>
                            </div>

                            <!-- Interactive Layer Indicator Pills -->
                            <div class="pt-4 border-t border-slate-800/60">
                                <p class="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3">Seminar Diagnostic Journey</p>
                                <div class="flex flex-wrap gap-2 text-xs font-mono text-slate-300">
                                    <span class="px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span> Browser</span>
                                    <span class="text-slate-600 self-center">→</span>
                                    <span class="px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span> DNS / Net</span>
                                    <span class="text-slate-600 self-center">→</span>
                                    <span class="px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> Apache</span>
                                    <span class="text-slate-600 self-center">→</span>
                                    <span class="px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span> PHP-FPM</span>
                                    <span class="text-slate-600 self-center">→</span>
                                    <span class="px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Laravel</span>
                                    <span class="text-slate-600 self-center">→</span>
                                    <span class="px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Data</span>
                                </div>
                            </div>
                        </div>

                        <!-- Right Three.js Canvas Column -->
                        <div class="lg:col-span-6 relative w-full h-[380px] sm:h-[460px] lg:h-[580px]">
                            
                            <!-- 3D Canvas Mounting Point -->
                            <div id="hero-canvas-container" class="w-full h-full rounded-2xl overflow-hidden relative">
                                
                                <!-- Floating 3D HUD Badge Overlay -->
                                <div class="absolute top-4 right-4 z-10 pointer-events-none hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#090e1c]/80 border border-cyan-500/30 text-[11px] font-mono text-cyan-300 backdrop-blur-md">
                                    <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                                    <span>THREE.JS TOPOLOGY ENGINE</span>
                                </div>

                                <div class="absolute bottom-4 left-4 z-10 pointer-events-none hidden sm:block px-3 py-1.5 rounded-lg bg-[#090e1c]/80 border border-slate-800 text-[11px] font-mono text-slate-400 backdrop-blur-md">
                                    Interactive Parallax Active • Hover & Drag
                                </div>

                                <!-- Graceful CSS Fallback (shown if WebGL is disabled or unavailable) -->
                                <div class="hero-css-fallback hidden absolute inset-0 bg-[#090e1c] flex-col items-center justify-center p-6 text-center border border-slate-800 rounded-2xl">
                                    <div class="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                                        </svg>
                                    </div>
                                    <h2 class="text-base font-bold text-white mb-1">Architecture Flow Active</h2>
                                    <p class="text-xs text-slate-400 max-w-sm">Browser → DNS Ingress → Apache Reverse Proxy → PHP-FPM 8.4 Pool → Laravel 13 → SQLite/MySQL & Cache</p>
                                </div>
                            </div>
                        </div>

                    </div>

                    <!-- Live Telemetry Ribbon at Base of Hero -->
                    <div class="mt-12 pt-8 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                        
                        <div class="p-4 rounded-xl bg-slate-900/50 border border-slate-800/70">
                            <div class="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                                <span>CACHE OBSERVED REQUESTS</span>
                                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            </div>
                            <div class="text-2xl font-bold font-mono text-cyan-300">
                                {{ number_format($observedRequests) }}
                            </div>
                            <div class="text-[11px] text-slate-400 mt-1">Backed by Laravel Cache store ({{ $cacheDriver }})</div>
                        </div>

                        <div class="p-4 rounded-xl bg-slate-900/50 border border-slate-800/70">
                            <div class="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                                <span>RUNTIME ENGINE</span>
                                <span class="text-emerald-400 text-[10px]">VERIFIED</span>
                            </div>
                            <div class="text-2xl font-bold font-mono text-white">
                                PHP {{ $phpVersion }}
                            </div>
                            <div class="text-[11px] text-slate-400 mt-1">Natively compiled CLI & FPM 8.4</div>
                        </div>

                        <div class="p-4 rounded-xl bg-slate-900/50 border border-slate-800/70">
                            <div class="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                                <span>CORE FRAMEWORK</span>
                                <span class="text-cyan-400 text-[10px]">STABLE</span>
                            </div>
                            <div class="text-2xl font-bold font-mono text-white">
                                Laravel {{ $laravelVersion }}
                            </div>
                            <div class="text-[11px] text-slate-400 mt-1">Vite + Blade + Eloquent Architecture</div>
                        </div>

                        <div class="p-4 rounded-xl bg-slate-900/50 border border-slate-800/70">
                            <div class="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                                <span>SEMINAR REGISTRATIONS</span>
                                <span class="text-amber-400 text-[10px]">LIVE DB</span>
                            </div>
                            <div id="live-inquiries-count" class="text-2xl font-bold font-mono text-amber-300">
                                {{ $inquiryCount }}
                            </div>
                            <div class="text-[11px] text-slate-400 mt-1">Stored in {{ strtoupper($databaseDriver) }} database</div>
                        </div>

                    </div>

                </div>
            </section>

            <!-- ================================================================= -->
            <!-- SECTION: REQUEST JOURNEY (INTERACTIVE PIPELINE) -->
            <!-- ================================================================= -->
            <section id="journey" class="py-20 border-b border-slate-800/60 bg-[#070b16]/50">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    <div class="text-center max-w-3xl mx-auto mb-14">
                        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-cyan-950/70 text-cyan-400 border border-cyan-800/40 mb-3">
                            END-TO-END PACKET LIFECYCLE
                        </div>
                        <h2 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                            The 6-Stage Request Journey
                        </h2>
                        <p class="mt-3 text-slate-400 text-base leading-relaxed">
                            Every single web request traverses multiple discrete operating system and software layers. Click any stage below to inspect its role, diagnostic commands, and failure signatures.
                        </p>
                    </div>

                    <!-- Step Selection Bar (Desktop & Mobile Scrollable) -->
                    <div class="flex overflow-x-auto pb-4 gap-2 sm:gap-3 justify-start lg:justify-center no-scrollbar mb-8">
                        <button type="button" data-layer="browser" class="journey-step-btn active px-4 py-2.5 rounded-xl border text-xs font-mono font-medium flex items-center gap-2 transition-all whitespace-nowrap border-cyan-400 bg-cyan-500/10 text-cyan-300">
                            <span class="w-2 h-2 rounded-full bg-cyan-400"></span> 01. Browser
                        </button>
                        <button type="button" data-layer="dns" class="journey-step-btn px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white text-xs font-mono font-medium flex items-center gap-2 transition-all whitespace-nowrap">
                            <span class="w-2 h-2 rounded-full bg-blue-400"></span> 02. DNS / Net
                        </button>
                        <button type="button" data-layer="apache" class="journey-step-btn px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white text-xs font-mono font-medium flex items-center gap-2 transition-all whitespace-nowrap">
                            <span class="w-2 h-2 rounded-full bg-indigo-400"></span> 03. Apache
                        </button>
                        <button type="button" data-layer="php" class="journey-step-btn px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white text-xs font-mono font-medium flex items-center gap-2 transition-all whitespace-nowrap">
                            <span class="w-2 h-2 rounded-full bg-purple-400"></span> 04. PHP-FPM
                        </button>
                        <button type="button" data-layer="laravel" class="journey-step-btn px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white text-xs font-mono font-medium flex items-center gap-2 transition-all whitespace-nowrap">
                            <span class="w-2 h-2 rounded-full bg-emerald-400"></span> 05. Laravel
                        </button>
                        <button type="button" data-layer="data" class="journey-step-btn px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white text-xs font-mono font-medium flex items-center gap-2 transition-all whitespace-nowrap">
                            <span class="w-2 h-2 rounded-full bg-amber-400"></span> 06. Data Tier
                        </button>
                    </div>

                    <!-- Journey Detail Panels -->
                    <div class="relative glass-panel rounded-2xl p-6 sm:p-8 lg:p-10 border border-slate-800/80 shadow-2xl">
                        
                        <!-- Panel 1: Browser -->
                        <div class="journey-layer-panel space-y-6" data-layer="browser">
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                                <div>
                                    <span class="text-xs font-mono text-cyan-400">STAGE 01</span>
                                    <h3 class="text-2xl font-bold text-white mt-1">Client User Agent & TLS Initiation</h3>
                                    <p class="text-sm text-slate-400 mt-1">User issues an HTTP GET or POST request via Chrome, Firefox, Safari, or cURL.</p>
                                </div>
                                <div class="flex items-center gap-2 text-xs font-mono bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 px-3 py-1.5 rounded-lg self-start">
                                    <span>PROTOCOL: HTTP/1.1, HTTP/2, TLS 1.3</span>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                                <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                                    <h4 class="font-semibold text-slate-200 mb-2 flex items-center gap-2">
                                        <span class="w-2 h-2 rounded-full bg-cyan-400"></span> Key Responsibilities
                                    </h4>
                                    <p class="text-slate-400 text-xs leading-relaxed">Local DNS cache check, TLS ClientHello handshake, cipher suite negotiation, sending request headers, and managing CSRF session cookies.</p>
                                </div>
                                <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                                    <h4 class="font-semibold text-slate-200 mb-2 flex items-center gap-2">
                                        <span class="w-2 h-2 rounded-full bg-rose-400"></span> Common Failure Symptoms
                                    </h4>
                                    <p class="text-slate-400 text-xs leading-relaxed"><code class="text-rose-300">SSL_ERROR_BAD_CERT_DOMAIN</code>, mixed-content warnings, CORS rejection, or client network timeout before any server socket is opened.</p>
                                </div>
                                <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                                    <h4 class="font-semibold text-slate-200 mb-2 flex items-center gap-2">
                                        <span class="w-2 h-2 rounded-full bg-emerald-400"></span> Seminar Inspection
                                    </h4>
                                    <p class="text-slate-400 text-xs font-mono bg-slate-950 p-2.5 rounded border border-slate-800 text-cyan-300">
                                        curl -Iv https://deploylab.example.com<br>
                                        openssl s_client -connect host:443
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Panel 2: DNS & Network -->
                        <div class="journey-layer-panel hidden space-y-6" data-layer="dns">
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                                <div>
                                    <span class="text-xs font-mono text-blue-400">STAGE 02</span>
                                    <h3 class="text-2xl font-bold text-white mt-1">Domain Name Resolution & TCP Routing</h3>
                                    <p class="text-sm text-slate-400 mt-1">Resolving domain name to target VPS IPv4/IPv6 and passing security firewall ingress rules.</p>
                                </div>
                                <div class="flex items-center gap-2 text-xs font-mono bg-blue-950/60 border border-blue-800/50 text-blue-300 px-3 py-1.5 rounded-lg self-start">
                                    <span>PORTS: 53 (UDP/TCP), 80/443 (TCP Ingress)</span>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                                <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                                    <h4 class="font-semibold text-slate-200 mb-2 flex items-center gap-2">
                                        <span class="w-2 h-2 rounded-full bg-blue-400"></span> Key Responsibilities
                                    </h4>
                                    <p class="text-slate-400 text-xs leading-relaxed">Authoritative nameservers, TTL caching, iptables / ufw firewall packet filtering, SYN/ACK three-way handshake on TCP port 80 or 443.</p>
                                </div>
                                <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                                    <h4 class="font-semibold text-slate-200 mb-2 flex items-center gap-2">
                                        <span class="w-2 h-2 rounded-full bg-rose-400"></span> Common Failure Symptoms
                                    </h4>
                                    <p class="text-slate-400 text-xs leading-relaxed"><code class="text-rose-300">NXDOMAIN</code>, connection refused, silent packet drop by firewall, or stale DNS pointing to a decommissioned VPS IP.</p>
                                </div>
                                <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                                    <h4 class="font-semibold text-slate-200 mb-2 flex items-center gap-2">
                                        <span class="w-2 h-2 rounded-full bg-emerald-400"></span> Seminar Inspection
                                    </h4>
                                    <p class="text-slate-400 text-xs font-mono bg-slate-950 p-2.5 rounded border border-slate-800 text-blue-300">
                                        dig +trace deploylab.example.com<br>
                                        nc -zv 127.0.0.1 80 443<br>
                                        sudo ufw status verbose
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Panel 3: Apache -->
                        <div class="journey-layer-panel hidden space-y-6" data-layer="apache">
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                                <div>
                                    <span class="text-xs font-mono text-indigo-400">STAGE 03</span>
                                    <h3 class="text-2xl font-bold text-white mt-1">Apache 2.4 Web Server & Reverse Proxy</h3>
                                    <p class="text-sm text-slate-400 mt-1">VirtualHost matching, SSL termination via Let's Encrypt, DocumentRoot mapping, and FastCGI pass.</p>
                                </div>
                                <div class="flex items-center gap-2 text-xs font-mono bg-indigo-950/60 border border-indigo-800/50 text-indigo-300 px-3 py-1.5 rounded-lg self-start">
                                    <span>SOCKET: proxy:unix:/run/php/php8.4-fpm.sock</span>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                                <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                                    <h4 class="font-semibold text-slate-200 mb-2 flex items-center gap-2">
                                        <span class="w-2 h-2 rounded-full bg-indigo-400"></span> Key Responsibilities
                                    </h4>
                                    <p class="text-slate-400 text-xs leading-relaxed">Serving static files directly from <code class="text-slate-300">public/</code>, rewriting URL routes via <code class="text-slate-300">.htaccess</code>, and forwarding dynamic PHP calls via <code class="text-slate-300">mod_proxy_fcgi</code>.</p>
                                </div>
                                <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                                    <h4 class="font-semibold text-slate-200 mb-2 flex items-center gap-2">
                                        <span class="w-2 h-2 rounded-full bg-rose-400"></span> Common Failure Symptoms
                                    </h4>
                                    <p class="text-slate-400 text-xs leading-relaxed"><code class="text-rose-300">403 Forbidden</code> (directory index prohibited or wrong file permissions), <code class="text-rose-300">503 Service Unavailable</code> (PHP-FPM socket offline), or fallback to default Apache test page.</p>
                                </div>
                                <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                                    <h4 class="font-semibold text-slate-200 mb-2 flex items-center gap-2">
                                        <span class="w-2 h-2 rounded-full bg-emerald-400"></span> Seminar Inspection
                                    </h4>
                                    <p class="text-slate-400 text-xs font-mono bg-slate-950 p-2.5 rounded border border-slate-800 text-indigo-300">
                                        sudo apache2ctl -S<br>
                                        sudo tail -f /var/log/apache2/error.log
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Panel 4: PHP-FPM -->
                        <div class="journey-layer-panel hidden space-y-6" data-layer="php">
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                                <div>
                                    <span class="text-xs font-mono text-purple-400">STAGE 04</span>
                                    <h3 class="text-2xl font-bold text-white mt-1">PHP-FPM 8.4 Process Manager & OPcache</h3>
                                    <p class="text-sm text-slate-400 mt-1">Receiving the FastCGI payload, spawning worker processes, and executing bytecode.</p>
                                </div>
                                <div class="flex items-center gap-2 text-xs font-mono bg-purple-950/60 border border-purple-800/50 text-purple-300 px-3 py-1.5 rounded-lg self-start">
                                    <span>POOL: /etc/php/8.4/fpm/pool.d/www.conf</span>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                                <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                                    <h4 class="font-semibold text-slate-200 mb-2 flex items-center gap-2">
                                        <span class="w-2 h-2 rounded-full bg-purple-400"></span> Key Responsibilities
                                    </h4>
                                    <p class="text-slate-400 text-xs leading-relaxed">Managing dynamic worker pools (<code class="text-slate-300">pm.max_children</code>), caching compiled bytecode via OPcache, handling memory limits, and executing <code class="text-slate-300">public/index.php</code>.</p>
                                </div>
                                <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                                    <h4 class="font-semibold text-slate-200 mb-2 flex items-center gap-2">
                                        <span class="w-2 h-2 rounded-full bg-rose-400"></span> Common Failure Symptoms
                                    </h4>
                                    <p class="text-slate-400 text-xs leading-relaxed"><code class="text-rose-300">502 Bad Gateway</code>, <code class="text-rose-300">504 Gateway Timeout</code>, <code class="text-rose-300">server reached pm.max_children</code> worker starvation, or segmentation faults from misconfigured native extensions.</p>
                                </div>
                                <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                                    <h4 class="font-semibold text-slate-200 mb-2 flex items-center gap-2">
                                        <span class="w-2 h-2 rounded-full bg-emerald-400"></span> Seminar Inspection
                                    </h4>
                                    <p class="text-slate-400 text-xs font-mono bg-slate-950 p-2.5 rounded border border-slate-800 text-purple-300">
                                        sudo systemctl status php8.4-fpm<br>
                                        sudo tail -f /var/log/php8.4-fpm.log
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Panel 5: Laravel Application -->
                        <div class="journey-layer-panel hidden space-y-6" data-layer="laravel">
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                                <div>
                                    <span class="text-xs font-mono text-emerald-400">STAGE 05</span>
                                    <h3 class="text-2xl font-bold text-white mt-1">Laravel 13 Application Core</h3>
                                    <p class="text-sm text-slate-400 mt-1">Bootstrapping service container, resolving middleware, matching routes, and executing business logic.</p>
                                </div>
                                <div class="flex items-center gap-2 text-xs font-mono bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 px-3 py-1.5 rounded-lg self-start">
                                    <span>ENTRY: bootstrap/app.php → routes/web.php</span>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                                <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                                    <h4 class="font-semibold text-slate-200 mb-2 flex items-center gap-2">
                                        <span class="w-2 h-2 rounded-full bg-emerald-400"></span> Key Responsibilities
                                    </h4>
                                    <p class="text-slate-400 text-xs leading-relaxed">Validating CSRF tokens, hydrating Form Requests, dispatching to Controllers, reading configurations from cached environment, and rendering Blade views.</p>
                                </div>
                                <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                                    <h4 class="font-semibold text-slate-200 mb-2 flex items-center gap-2">
                                        <span class="w-2 h-2 rounded-full bg-rose-400"></span> Common Failure Symptoms
                                    </h4>
                                    <p class="text-slate-400 text-xs leading-relaxed"><code class="text-rose-300">500 Internal Server Error</code> (missing <code class="text-slate-300">APP_KEY</code>, unwritable <code class="text-slate-300">storage/logs</code>), stale cached config, or unhandled exceptions.</p>
                                </div>
                                <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                                    <h4 class="font-semibold text-slate-200 mb-2 flex items-center gap-2">
                                        <span class="w-2 h-2 rounded-full bg-emerald-400"></span> Seminar Inspection
                                    </h4>
                                    <p class="text-slate-400 text-xs font-mono bg-slate-950 p-2.5 rounded border border-slate-800 text-emerald-300">
                                        php artisan route:list<br>
                                        php artisan config:clear<br>
                                        tail -f storage/logs/laravel.log
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Panel 6: Data & Cache Tier -->
                        <div class="journey-layer-panel hidden space-y-6" data-layer="data">
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                                <div>
                                    <span class="text-xs font-mono text-amber-400">STAGE 06</span>
                                    <h3 class="text-2xl font-bold text-white mt-1">Data Layer: MySQL 8 & Redis Cache</h3>
                                    <p class="text-sm text-slate-400 mt-1">Persisting relational records (Inquiries) and providing sub-millisecond key-value caching.</p>
                                </div>
                                <div class="flex items-center gap-2 text-xs font-mono bg-amber-950/60 border border-amber-800/50 text-amber-300 px-3 py-1.5 rounded-lg self-start">
                                    <span>DRIVERS: PDO MySQL (:3306) & phpredis (:6379)</span>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                                <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                                    <h4 class="font-semibold text-slate-200 mb-2 flex items-center gap-2">
                                        <span class="w-2 h-2 rounded-full bg-amber-400"></span> Key Responsibilities
                                    </h4>
                                    <p class="text-slate-400 text-xs leading-relaxed">ACID transactions for seminar registrations, cache locking for rate limits, session store persistence, and request counter increments.</p>
                                </div>
                                <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                                    <h4 class="font-semibold text-slate-200 mb-2 flex items-center gap-2">
                                        <span class="w-2 h-2 rounded-full bg-rose-400"></span> Common Failure Symptoms
                                    </h4>
                                    <p class="text-slate-400 text-xs leading-relaxed"><code class="text-rose-300">SQLSTATE[HY000] [2002] Connection refused</code>, <code class="text-rose-300">Too many connections</code>, lock wait timeouts, or Redis OOM eviction policies throwing read-only exceptions.</p>
                                </div>
                                <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                                    <h4 class="font-semibold text-slate-200 mb-2 flex items-center gap-2">
                                        <span class="w-2 h-2 rounded-full bg-emerald-400"></span> Seminar Inspection
                                    </h4>
                                    <p class="text-slate-400 text-xs font-mono bg-slate-950 p-2.5 rounded border border-slate-800 text-amber-300">
                                        mysqladmin -u deploylab -p ping<br>
                                        redis-cli ping<br>
                                        curl -s http://localhost:8000/api/status
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>
            </section>

            <!-- ================================================================= -->
            <!-- SECTION: ARCHITECTURE & FAILURE MODES DEEP DIVE -->
            <!-- ================================================================= -->
            <section id="layers" class="py-20 border-b border-slate-800/60">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    <div class="text-center max-w-3xl mx-auto mb-16">
                        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-blue-950/70 text-blue-400 border border-blue-800/40 mb-3">
                            SEMINAR LABORATORY ARCHITECTURE
                        </div>
                        <h2 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                            Engineered for Controlled Disruption
                        </h2>
                        <p class="mt-3 text-slate-400 text-base leading-relaxed">
                            Each layer is intentionally decoupled so seminar attendees can observe real-world failure patterns when individual components crash or misbehave.
                        </p>
                    </div>

                    <!-- 6 Architecture Cards Grid -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        
                        <!-- Card 1: DNS & Network -->
                        <div class="glass-panel glass-panel-hover rounded-2xl p-6 border border-slate-800 relative flex flex-col justify-between">
                            <div>
                                <div class="flex items-center justify-between mb-4">
                                    <span class="text-xs font-mono px-2.5 py-1 rounded bg-blue-950 text-blue-400 border border-blue-800/50">TIER 1 • INGRESS</span>
                                    <span class="text-xs font-mono text-slate-400">Port 80 / 443</span>
                                </div>
                                <h3 class="text-lg font-bold text-white mb-2">DNS, TLS & Firewall Ingress</h3>
                                <p class="text-xs text-slate-400 leading-relaxed mb-4">
                                    Handles domain resolution and TCP packet handshakes before any web daemon is reached.
                                </p>
                                <div class="space-y-2 text-xs">
                                    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                                        <span class="font-mono text-rose-400 font-semibold block mb-0.5">Seminar Break Scenario:</span>
                                        <span class="text-slate-400">UFW firewall block on port 443 or broken Let's Encrypt certificate chain.</span>
                                    </div>
                                    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                                        <span class="font-mono text-cyan-400 font-semibold block mb-0.5">Verification Command:</span>
                                        <code class="text-slate-300 font-mono text-[11px]">sudo ufw status && certbot certificates</code>
                                    </div>
                                </div>
                            </div>
                            <div class="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
                                <span>Isolated: Yes</span>
                                <span class="text-blue-400">Layer 1/6</span>
                            </div>
                        </div>

                        <!-- Card 2: Apache -->
                        <div class="glass-panel glass-panel-hover rounded-2xl p-6 border border-slate-800 relative flex flex-col justify-between">
                            <div>
                                <div class="flex items-center justify-between mb-4">
                                    <span class="text-xs font-mono px-2.5 py-1 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/50">TIER 2 • WEBSERVER</span>
                                    <span class="text-xs font-mono text-slate-400">Apache 2.4</span>
                                </div>
                                <h3 class="text-lg font-bold text-white mb-2">Apache VirtualHost & FastCGI</h3>
                                <p class="text-xs text-slate-400 leading-relaxed mb-4">
                                    Handles server configuration, DocumentRoot targeting, and proxying PHP requests to the FPM socket.
                                </p>
                                <div class="space-y-2 text-xs">
                                    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                                        <span class="font-mono text-rose-400 font-semibold block mb-0.5">Seminar Break Scenario:</span>
                                        <span class="text-slate-400">Wrong DocumentRoot (omitting <code class="text-slate-300">/public</code>) causing 403 Forbidden or missing rewrite engine.</span>
                                    </div>
                                    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                                        <span class="font-mono text-cyan-400 font-semibold block mb-0.5">Verification Command:</span>
                                        <code class="text-slate-300 font-mono text-[11px]">apache2ctl configtest && apache2ctl -S</code>
                                    </div>
                                </div>
                            </div>
                            <div class="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
                                <span>Isolated: Yes</span>
                                <span class="text-indigo-400">Layer 2/6</span>
                            </div>
                        </div>

                        <!-- Card 3: PHP-FPM -->
                        <div class="glass-panel glass-panel-hover rounded-2xl p-6 border border-slate-800 relative flex flex-col justify-between">
                            <div>
                                <div class="flex items-center justify-between mb-4">
                                    <span class="text-xs font-mono px-2.5 py-1 rounded bg-purple-950 text-purple-400 border border-purple-800/50">TIER 3 • RUNTIME</span>
                                    <span class="text-xs font-mono text-slate-400">PHP 8.4-FPM</span>
                                </div>
                                <h3 class="text-lg font-bold text-white mb-2">PHP-FPM Worker Pool & OPcache</h3>
                                <p class="text-xs text-slate-400 leading-relaxed mb-4">
                                    Spawns isolated child workers to execute PHP scripts via UNIX domain sockets.
                                </p>
                                <div class="space-y-2 text-xs">
                                    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                                        <span class="font-mono text-rose-400 font-semibold block mb-0.5">Seminar Break Scenario:</span>
                                        <span class="text-slate-400">Killing PHP-FPM daemon or setting socket permissions to <code class="text-slate-300">0600 root:root</code> triggering 502 Bad Gateway.</span>
                                    </div>
                                    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                                        <span class="font-mono text-cyan-400 font-semibold block mb-0.5">Verification Command:</span>
                                        <code class="text-slate-300 font-mono text-[11px]">systemctl status php8.4-fpm</code>
                                    </div>
                                </div>
                            </div>
                            <div class="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
                                <span>Isolated: Yes</span>
                                <span class="text-purple-400">Layer 3/6</span>
                            </div>
                        </div>

                        <!-- Card 4: Laravel -->
                        <div class="glass-panel glass-panel-hover rounded-2xl p-6 border border-slate-800 relative flex flex-col justify-between">
                            <div>
                                <div class="flex items-center justify-between mb-4">
                                    <span class="text-xs font-mono px-2.5 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50">TIER 4 • FRAMEWORK</span>
                                    <span class="text-xs font-mono text-slate-400">Laravel 13</span>
                                </div>
                                <h3 class="text-lg font-bold text-white mb-2">Laravel Application Kernel</h3>
                                <p class="text-xs text-slate-400 leading-relaxed mb-4">
                                    Core business logic, routing table, service container, and view compilation.
                                </p>
                                <div class="space-y-2 text-xs">
                                    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                                        <span class="font-mono text-rose-400 font-semibold block mb-0.5">Seminar Break Scenario:</span>
                                        <span class="text-slate-400">Missing <code class="text-slate-300">APP_KEY</code> or unwritable permissions on <code class="text-slate-300">storage/</code> and <code class="text-slate-300">bootstrap/cache/</code>.</span>
                                    </div>
                                    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                                        <span class="font-mono text-cyan-400 font-semibold block mb-0.5">Verification Command:</span>
                                        <code class="text-slate-300 font-mono text-[11px]">php artisan config:cache && php artisan about</code>
                                    </div>
                                </div>
                            </div>
                            <div class="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
                                <span>Isolated: Yes</span>
                                <span class="text-emerald-400">Layer 4/6</span>
                            </div>
                        </div>

                        <!-- Card 5: Database -->
                        <div class="glass-panel glass-panel-hover rounded-2xl p-6 border border-slate-800 relative flex flex-col justify-between">
                            <div>
                                <div class="flex items-center justify-between mb-4">
                                    <span class="text-xs font-mono px-2.5 py-1 rounded bg-amber-950 text-amber-400 border border-amber-800/50">TIER 5 • DATABASE</span>
                                    <span class="text-xs font-mono text-slate-400">SQLite / MySQL 8</span>
                                </div>
                                <h3 class="text-lg font-bold text-white mb-2">Relational Persistence Tier</h3>
                                <p class="text-xs text-slate-400 leading-relaxed mb-4">
                                    Stores user inquiries and relational models with strict ACID transactions.
                                </p>
                                <div class="space-y-2 text-xs">
                                    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                                        <span class="font-mono text-rose-400 font-semibold block mb-0.5">Seminar Break Scenario:</span>
                                        <span class="text-slate-400">Stopping MySQL service or invalid DB password in <code class="text-slate-300">.env</code> causing contact form failure.</span>
                                    </div>
                                    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                                        <span class="font-mono text-cyan-400 font-semibold block mb-0.5">Verification Command:</span>
                                        <code class="text-slate-300 font-mono text-[11px]">php artisan db:monitor && php artisan migrate:status</code>
                                    </div>
                                </div>
                            </div>
                            <div class="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
                                <span>Isolated: Yes</span>
                                <span class="text-amber-400">Layer 5/6</span>
                            </div>
                        </div>

                        <!-- Card 6: Cache -->
                        <div class="glass-panel glass-panel-hover rounded-2xl p-6 border border-slate-800 relative flex flex-col justify-between">
                            <div>
                                <div class="flex items-center justify-between mb-4">
                                    <span class="text-xs font-mono px-2.5 py-1 rounded bg-rose-950 text-rose-400 border border-rose-800/50">TIER 6 • CACHE</span>
                                    <span class="text-xs font-mono text-slate-400">File / Redis 7</span>
                                </div>
                                <h3 class="text-lg font-bold text-white mb-2">In-Memory Cache & Sessions</h3>
                                <p class="text-xs text-slate-400 leading-relaxed mb-4">
                                    Powers high-speed request telemetry counting and fast session storage.
                                </p>
                                <div class="space-y-2 text-xs">
                                    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                                        <span class="font-mono text-rose-400 font-semibold block mb-0.5">Seminar Break Scenario:</span>
                                        <span class="text-slate-400">Stopping Redis daemon or setting maxmemory eviction policy to noeviction.</span>
                                    </div>
                                    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                                        <span class="font-mono text-cyan-400 font-semibold block mb-0.5">Verification Command:</span>
                                        <code class="text-slate-300 font-mono text-[11px]">redis-cli info stats && php artisan cache:clear</code>
                                    </div>
                                </div>
                            </div>
                            <div class="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
                                <span>Isolated: Yes</span>
                                <span class="text-rose-400">Layer 6/6</span>
                            </div>
                        </div>

                    </div>

                </div>
            </section>

            <!-- ================================================================= -->
            <!-- SECTION: WHY DEBUGGING BY LAYER MATTERS -->
            <!-- ================================================================= -->
            <section id="breakdowns" class="py-20 border-b border-slate-800/60 bg-[#070b16]/50">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    <div class="text-center max-w-3xl mx-auto mb-14">
                        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-cyan-950/70 text-cyan-400 border border-cyan-800/40 mb-3">
                            METHODOLOGY
                        </div>
                        <h2 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                            Why Layered Isolation Saves Hours
                        </h2>
                        <p class="mt-3 text-slate-400 text-base leading-relaxed">
                            When an application goes offline, inexperienced developers restart services blindly. Senior engineers verify each boundary independently.
                        </p>
                    </div>

                    <!-- Comparison Table / Matrix -->
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-sm border-collapse rounded-2xl overflow-hidden glass-panel border border-slate-800">
                            <thead>
                                <tr class="bg-slate-900/80 text-xs font-mono uppercase text-slate-400 border-b border-slate-800">
                                    <th class="p-4 sm:p-5">Observed Symptom</th>
                                    <th class="p-4 sm:p-5">Naive Guess</th>
                                    <th class="p-4 sm:p-5">Real Root Cause</th>
                                    <th class="p-4 sm:p-5">Immediate Diagnostic Proof</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-800/70 font-sans">
                                <tr class="hover:bg-slate-900/40 transition-colors">
                                    <td class="p-4 sm:p-5 font-semibold text-rose-400 flex items-center gap-2">
                                        <span class="w-2 h-2 rounded-full bg-rose-500"></span> 502 Bad Gateway
                                    </td>
                                    <td class="p-4 sm:p-5 text-slate-400">"Apache has crashed"</td>
                                    <td class="p-4 sm:p-5 text-slate-200">Apache is fine; PHP-FPM socket died or pool reached <code class="text-cyan-300">max_children</code>.</td>
                                    <td class="p-4 sm:p-5 font-mono text-xs text-cyan-400"><code>curl http://localhost/health</code> fails with 502, but Apache port 80 accepts TCP.</td>
                                </tr>
                                <tr class="hover:bg-slate-900/40 transition-colors">
                                    <td class="p-4 sm:p-5 font-semibold text-amber-400 flex items-center gap-2">
                                        <span class="w-2 h-2 rounded-full bg-amber-500"></span> Request Timeout (60s)
                                    </td>
                                    <td class="p-4 sm:p-5 text-slate-400">"PHP script slow"</td>
                                    <td class="p-4 sm:p-5 text-slate-200">MySQL InnoDB lock wait timeout or unresponding remote Redis socket.</td>
                                    <td class="p-4 sm:p-5 font-mono text-xs text-cyan-400"><code>/health</code> responds in 2ms, but <code>/api/status</code> hangs on DB ping.</td>
                                </tr>
                                <tr class="hover:bg-slate-900/40 transition-colors">
                                    <td class="p-4 sm:p-5 font-semibold text-purple-400 flex items-center gap-2">
                                        <span class="w-2 h-2 rounded-full bg-purple-500"></span> 500 Server Error
                                    </td>
                                    <td class="p-4 sm:p-5 text-slate-400">"Server out of memory"</td>
                                    <td class="p-4 sm:p-5 text-slate-200"><code class="text-purple-300">storage/</code> directory permission denied or missing encryption key.</td>
                                    <td class="p-4 sm:p-5 font-mono text-xs text-cyan-400">PHP executes <code>index.php</code>, but Laravel terminates in <code>storage/logs</code>.</td>
                                </tr>
                                <tr class="hover:bg-slate-900/40 transition-colors">
                                    <td class="p-4 sm:p-5 font-semibold text-blue-400 flex items-center gap-2">
                                        <span class="w-2 h-2 rounded-full bg-blue-500"></span> Connection Refused
                                    </td>
                                    <td class="p-4 sm:p-5 text-slate-400">"App error in code"</td>
                                    <td class="p-4 sm:p-5 text-slate-200">UFW firewall dropping incoming SYN packets or Apache not bound to 0.0.0.0.</td>
                                    <td class="p-4 sm:p-5 font-mono text-xs text-cyan-400"><code>nc -zv vps_ip 80</code> fails immediately without TCP handshake.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                </div>
            </section>

            <!-- ================================================================= -->
            <!-- SECTION: LIVE DIAGNOSTICS & TELEMETRY -->
            <!-- ================================================================= -->
            <section id="diagnostics" class="py-20 border-b border-slate-800/60">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                        
                        <!-- Left Info -->
                        <div class="lg:col-span-5 space-y-5">
                            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-emerald-950/70 text-emerald-400 border border-emerald-800/40">
                                LIVE TELEMETRY
                            </div>
                            <h2 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                                Autonomous Dependency Diagnostics
                            </h2>
                            <p class="text-sm sm:text-base text-slate-400 leading-relaxed">
                                DeployLab isolates system layers via dedicated endpoints. <code class="text-cyan-300">/health</code> guarantees PHP and framework bootability without database coupling, while <code class="text-cyan-300">/api/status</code> inspects individual data tiers.
                            </p>
                            
                            <div class="pt-2 flex flex-wrap gap-3">
                                <a href="/health" target="_blank" class="px-3.5 py-2 rounded-lg text-xs font-mono bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 transition-colors flex items-center gap-2">
                                    <span>GET /health</span>
                                    <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                                </a>
                                <a href="/api/status" target="_blank" class="px-3.5 py-2 rounded-lg text-xs font-mono bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 transition-colors flex items-center gap-2">
                                    <span>GET /api/status</span>
                                    <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                                </a>
                            </div>
                        </div>

                        <!-- Right Live Status Card -->
                        <div class="lg:col-span-7">
                            <div class="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative">
                                
                                <div class="flex items-center justify-between pb-6 border-b border-slate-800 mb-6">
                                    <div class="flex items-center gap-3">
                                        <div class="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
                                        <div>
                                            <h3 class="text-base font-bold text-white">Live System Inspection</h3>
                                            <p id="diag-timestamp" class="text-xs font-mono text-slate-400">Endpoint: /api/status</p>
                                        </div>
                                    </div>
                                    <div id="diag-overall-badge">
                                        <span class="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-700/50 px-3 py-1 rounded-full">
                                            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> All Systems Operational
                                        </span>
                                    </div>
                                </div>

                                <!-- Diagnostics Row Items -->
                                <div class="space-y-4">
                                    
                                    <!-- Row 1: Application -->
                                    <div class="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                                        <div class="flex items-center gap-3">
                                            <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
                                            <div>
                                                <span class="text-xs font-mono text-white font-semibold">Laravel Application</span>
                                                <span class="text-[11px] text-slate-400 block font-mono">Kernel & Routing Pipeline</span>
                                            </div>
                                        </div>
                                        <span id="diag-app-status" class="font-mono text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                            HEALTHY
                                        </span>
                                    </div>

                                    <!-- Row 2: Database -->
                                    <div class="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                                        <div class="flex items-center gap-3">
                                            <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                                            <div>
                                                <span class="text-xs font-mono text-white font-semibold">Database ({{ strtoupper($databaseDriver) }})</span>
                                                <span class="text-[11px] text-slate-400 block font-mono">Ping Latency: <span id="diag-db-latency" class="text-slate-300 font-bold">&lt; 1 ms</span></span>
                                            </div>
                                        </div>
                                        <span id="diag-db-status" class="font-mono text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                            CONNECTED
                                        </span>
                                    </div>

                                    <!-- Row 3: Cache -->
                                    <div class="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                                        <div class="flex items-center gap-3">
                                            <span class="w-2 h-2 rounded-full bg-purple-400"></span>
                                            <div>
                                                <span class="text-xs font-mono text-white font-semibold">Cache Store ({{ strtoupper($cacheDriver) }})</span>
                                                <span class="text-[11px] text-slate-400 block font-mono">Read/Write Latency: <span id="diag-cache-latency" class="text-slate-300 font-bold">&lt; 1 ms</span></span>
                                            </div>
                                        </div>
                                        <span id="diag-cache-status" class="font-mono text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                            OPERATIONAL
                                        </span>
                                    </div>

                                </div>

                                <div class="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                                    <span class="text-xs text-slate-400">Zero sensitive credentials exposed</span>
                                    <button id="refresh-diag-btn" type="button" class="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all flex items-center gap-2">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                                        Run Diagnostic Ping
                                    </button>
                                </div>

                            </div>
                        </div>

                    </div>

                </div>
            </section>

            <!-- ================================================================= -->
            <!-- SECTION: SEMINAR REGISTRATION & INQUIRY FORM (DATABASE BACKED) -->
            <!-- ================================================================= -->
            <section id="contact" class="py-20 border-b border-slate-800/60 bg-[#070b16]/50">
                <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    <div class="text-center mb-12">
                        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-cyan-950/70 text-cyan-400 border border-cyan-800/40 mb-3">
                            DATABASE VERIFICATION FEATURE
                        </div>
                        <h2 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                            Reserve Seminar Seat
                        </h2>
                        <p class="mt-3 text-slate-400 text-sm sm:text-base leading-relaxed">
                            Submitting this form executes a real database transaction through Eloquent into the <code class="text-cyan-300">inquiries</code> table. When MySQL is later disconnected on the VPS, attendees will inspect how failure cascades to the user interface.
                        </p>
                    </div>

                    <div class="glass-panel rounded-2xl p-6 sm:p-10 border border-slate-800 shadow-2xl relative">
                        
                        <!-- Real-time Feedback Alert Box (supports both AJAX and Blade Flash) -->
                        <div id="form-feedback-alert" class="{{ session('success') ? 'p-4 rounded-xl text-sm border bg-emerald-950/60 border-emerald-500/40 text-emerald-300 flex items-start gap-3 mb-6' : 'hidden mb-6' }}">
                            @if (session('success'))
                                <svg class="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                <div>
                                    <p class="font-semibold text-emerald-200">Registration Confirmed!</p>
                                    <p class="mt-0.5 text-xs text-emerald-300/90">{{ session('success') }}</p>
                                </div>
                            @endif
                        </div>

                        <!-- Blade Error Summary if submitted non-AJAX -->
                        @if ($errors->any())
                            <div class="p-4 rounded-xl text-sm border bg-rose-950/60 border-rose-500/40 text-rose-300 flex items-start gap-3 mb-6">
                                <svg class="w-5 h-5 text-rose-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                </svg>
                                <div>
                                    <p class="font-semibold text-rose-200">Validation Failed:</p>
                                    <ul class="mt-1 text-xs text-rose-300 space-y-0.5">
                                        @foreach ($errors->all() as $error)
                                            <li>• {{ $error }}</li>
                                        @endforeach
                                    </ul>
                                </div>
                            </div>
                        @endif

                        <form id="seminar-registration-form" action="{{ route('contact.store') }}" method="POST" class="space-y-6">
                            @csrf

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                
                                <!-- Name Field -->
                                <div>
                                    <label for="name" class="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-2">
                                        Full Name <span class="text-cyan-400">*</span>
                                    </label>
                                    <input type="text" id="name" name="name" required minlength="2" maxlength="120" value="{{ old('name') }}" placeholder="Alex Mercer" class="input-field w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all">
                                </div>

                                <!-- Email Field -->
                                <div>
                                    <label for="email" class="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-2">
                                        Work Email <span class="text-cyan-400">*</span>
                                    </label>
                                    <input type="email" id="email" name="email" required maxlength="150" value="{{ old('email') }}" placeholder="alex@infrastructure.io" class="input-field w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all">
                                </div>

                            </div>

                            <!-- Message Field -->
                            <div>
                                <label for="message" class="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-2">
                                    Infrastructure Topic / Specific Debug Scenario <span class="text-cyan-400">*</span>
                                </label>
                                <textarea id="message" name="message" rows="4" required minlength="5" maxlength="3000" placeholder="e.g. Interested in diagnosing Apache vs PHP-FPM socket starvation and MySQL deadlock patterns." class="input-field w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all">{{ old('message') }}</textarea>
                            </div>

                            <!-- Submit Button -->
                            <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                                <div class="text-xs text-slate-400 font-mono">
                                    Writes to <code class="text-slate-300">inquiries</code> table • CSRF protected
                                </div>
                                <button id="contact-submit-btn" type="submit" class="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all">
                                    Confirm Seminar Registration
                                </button>
                            </div>

                        </form>

                    </div>

                </div>
            </section>

        </main>

        <!-- ================================================================= -->
        <!-- FOOTER -->
        <!-- ================================================================= -->
        <footer class="border-t border-slate-800/80 bg-[#04060d] py-12 text-sm text-slate-400">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800/60">
                    
                    <div class="md:col-span-2 space-y-3">
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-white text-base">DeployLab</span>
                            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">SEMINAR BASELINE</span>
                        </div>
                        <p class="text-xs text-slate-400 leading-relaxed max-w-md">
                            "See every layer behind a web request." A structured laboratory application engineered to teach DNS, Apache, PHP-FPM, Laravel, MySQL, and Redis failure isolation on Linux VPS systems.
                        </p>
                    </div>

                    <div>
                        <h4 class="text-xs font-mono uppercase tracking-wider text-slate-200 mb-3">Diagnostic Endpoints</h4>
                        <ul class="space-y-2 text-xs font-mono">
                            <li><a href="/" class="hover:text-cyan-400 transition-colors">GET / (Landing)</a></li>
                            <li><a href="/health" class="hover:text-cyan-400 transition-colors">GET /health (Runtime)</a></li>
                            <li><a href="/api/status" class="hover:text-cyan-400 transition-colors">GET /api/status (Dependencies)</a></li>
                            <li><a href="#contact" class="hover:text-cyan-400 transition-colors">POST /contact (DB Write)</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 class="text-xs font-mono uppercase tracking-wider text-slate-200 mb-3">Seminar Modules</h4>
                        <ul class="space-y-2 text-xs">
                            <li><a href="#layers" class="hover:text-cyan-400 transition-colors">Apache VirtualHost & FastCGI</a></li>
                            <li><a href="#layers" class="hover:text-cyan-400 transition-colors">PHP-FPM Worker Pool Limits</a></li>
                            <li><a href="#layers" class="hover:text-cyan-400 transition-colors">MySQL Lock Contention</a></li>
                            <li><a href="#layers" class="hover:text-cyan-400 transition-colors">Redis Memory Eviction</a></li>
                        </ul>
                    </div>

                </div>

                <div class="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
                    <p>© 2026 DeployLab Seminar. No external CDNs required. 100% locally self-hosted assets.</p>
                    <p class="font-mono">Local Baseline: SQLite + File Cache | Production Ready: MySQL + Redis</p>
                </div>
            </div>
        </footer>

    </div>

</body>
</html>
