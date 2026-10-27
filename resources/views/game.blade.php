<!DOCTYPE html>
<html lang="vi" class="h-full w-full overflow-hidden">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>{{ $appName ?? 'Paradise Gods' }} — Thiên Đường Quần Đảo</title>
    <meta name="description" content="A tiny 3D paradise archipelago where gods create life and rule over miniature islands.">

    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="h-full w-full m-0 p-0 overflow-hidden bg-slate-950 font-sans select-none" data-drowning-timeout="{{ $drowningTimeoutMs ?? 3000 }}">

    <!-- 1. Fullscreen 3D WebGL Canvas Mounting Point -->
    <div id="game-canvas-container" class="absolute inset-0 w-full h-full z-0"></div>

    <!-- 2. Top-Left Minimal In-Game HUD -->
    <div id="game-hud-container" class="absolute top-4 left-4 z-20 pointer-events-none hidden"></div>

    <!-- 3. Top-Right Urgent Drowning Alert Container -->
    <div id="drowning-alerts-container" class="absolute top-4 right-4 z-30 pointer-events-none flex flex-col gap-2.5"></div>

    <!-- 4. Right-Side Contextual Panels (Island & Citizen) -->
    <div id="island-panel-container" class="absolute bottom-6 right-6 z-20 pointer-events-none hidden"></div>
    <div id="citizen-panel-container" class="absolute bottom-6 right-6 z-20 pointer-events-none hidden"></div>

    <!-- 5. Bottom-Left Event Notification Toasts -->
    <div id="toast-container" class="absolute bottom-6 left-6 z-20 pointer-events-none flex flex-col gap-2 max-w-sm"></div>

    <!-- 6. God Welcome & Registration Overlay -->
    <div id="god-welcome-overlay" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md hidden pointer-events-auto"></div>

    <!-- 7. God Statistics & Rename Modal -->
    <div id="god-stats-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md hidden pointer-events-auto"></div>

    <!-- 8. Database Failure Overlay (Volcano Failure World) -->
    <div id="failure-overlay-container" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md hidden pointer-events-auto"></div>

</body>
</html>
