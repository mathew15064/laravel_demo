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

    <!-- 2. Disconnect / Reconnect Banner -->
    <div id="reconnect-banner" class="fixed top-0 left-0 right-0 z-40 bg-amber-500/90 text-slate-950 font-bold text-center py-2 px-4 shadow-lg backdrop-blur-md hidden transition-all">
        ⚠ KẾT NỐI BỊ GIÁN ĐOẠN — ĐANG KẾT NỐI LẠI VỚI THIÊN ĐƯỜNG...
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
