<!DOCTYPE html>
<html lang="vi" class="h-full w-full overflow-hidden">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="ws-url" content="{{ env('VITE_WS_URL', 'ws://127.0.0.1:8089') }}">

    <title>{{ $appName ?? 'Paradise Gods' }} — Thiên Đường Quần Đảo Đa Thần</title>
    <meta name="description" content="A shared persistent realtime world where multiple gods interact, rescue citizens, and govern miniature islands.">

    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="h-full w-full m-0 p-0 overflow-hidden bg-slate-950 font-sans select-none" data-drowning-timeout="{{ $drowningTimeoutMs ?? 3000 }}">

    <!-- 1. Fullscreen 3D WebGL Canvas Mounting Point -->
    <div id="game-canvas-container" class="absolute inset-0 w-full h-full z-0"></div>

    <!-- 2. Subtle Non-intrusive Reconnection Indicator (hidden during transient reconnects < 3s) -->
    <div id="reconnect-indicator" class="fixed top-4 right-4 z-40 pointer-events-none px-3.5 py-1.5 rounded-full bg-slate-900/85 border border-amber-500/40 text-amber-400 text-xs font-mono shadow-xl backdrop-blur-md hidden transition-opacity flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
        <span>● Đang kết nối lại...</span>
    </div>

    <!-- 3. Top-Left Minimal In-Game HUD & Presence List -->
    <div id="game-hud-container" class="absolute top-4 left-4 z-20 pointer-events-none hidden flex flex-col gap-3"></div>

    <!-- 4. Top-Right Urgent Drowning Alert Container -->
    <div id="drowning-alerts-container" class="absolute top-4 right-4 z-30 pointer-events-none flex flex-col gap-2.5"></div>

    <!-- 5. Right-Side Contextual Panels (Island & Citizen) -->
    <div id="island-panel-container" class="absolute bottom-6 right-6 z-20 pointer-events-none hidden"></div>
    <div id="citizen-panel-container" class="absolute bottom-6 right-6 z-20 pointer-events-none hidden"></div>

    <!-- 6. Bottom-Left Event Notification Toasts -->
    <div id="toast-container" class="absolute bottom-6 left-6 z-20 pointer-events-none flex flex-col gap-2 max-w-sm"></div>

    <!-- 7. God Welcome & Registration Overlay -->
    <div id="god-welcome-overlay" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md hidden pointer-events-auto"></div>

    <!-- 8. God Statistics & Rename Modal -->
    <div id="god-stats-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md hidden pointer-events-auto"></div>

    <!-- 9. Remote God Profile & Interaction Modal -->
    <div id="god-profile-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md hidden pointer-events-auto"></div>

    <!-- 10. Database Failure Overlay (Volcano Failure World) -->
    <div id="failure-overlay-container" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md hidden pointer-events-auto"></div>

</body>
</html>
