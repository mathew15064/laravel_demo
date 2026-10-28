# PARADISE GODS — WEBSOCKET URL CONFIGURATION FIX REPORT

- **Date:** 2026-10-28
- **Author:** Senior Laravel & JavaScript Engineer
- **Component:** WebSocket Endpoint Configuration & Runtime Resolution
- **Status:** Complete, Verified, Zero-Regression

---

## 1. ROOT CAUSE ANALYSIS

### Symptom
On the production environment, the server-rendered HTML returned:
```html
<meta name="ws-url" content="ws://127.0.0.1:8089">
```
Remote browsers then attempted to connect to `ws://127.0.0.1:8089/`, which pointed to the visitor's local machine loopback rather than the VPS, generating repeated connection failure logs:
```text
WebSocket connection to 'ws://127.0.0.1:8089/' failed
```

### Detailed Cause
1. **Direct `env()` Call in Blade Template**: In [`resources/views/game.blade.php`](file:///home/temp/laravel_demo/resources/views/game.blade.php), the WebSocket meta tag directly called:
   ```blade
   <meta name="ws-url" content="{{ env('VITE_WS_URL', 'ws://127.0.0.1:8089') }}">
   ```
2. **Laravel Configuration Caching Invalidation**: In Laravel, when `php artisan config:cache` is executed during production deployment, all configuration files under `config/` are serialized into `bootstrap/cache/config.php`. Once cached, `Dotenv` is intentionally bypassed by Laravel for performance, causing `env(...)` called outside `config/` files to always return `null`.
3. **Trigger of Insecure Localhost Fallback**: Because `env('VITE_WS_URL')` evaluated to `null`, the second parameter `'ws://127.0.0.1:8089'` was rendered into the HTML on production even though `.env` contained `VITE_WS_URL=wss://alive.locallhost.shop/ws/`.
4. **Hardcoded Loopback in JavaScript Fallback**: In [`resources/js/game/multiplayer/RealtimeClient.js`](file:///home/temp/laravel_demo/resources/js/game/multiplayer/RealtimeClient.js), the constructor fallback was:
   ```js
   const defaultHost = window.location.hostname || '127.0.0.1';
   this.wsUrl = wsUrl || metaTag?.getAttribute('content') || `ws://${defaultHost}:8089`;
   ```
   If the meta tag was missing or malformed, remote browsers directly attempted `ws://<remote-host>:8089` or `127.0.0.1:8089`, bypassing the Apache SSL reverse proxy on port 443.

---

## 2. PREVIOUS CONFIGURATION CHAIN VS NEW AUTHORITATIVE CHAIN

### Previous Inconsistent Chain
```text
.env (VITE_WS_URL=wss://...)
   │
   ├─ [Bypassed by config:cache]
   ▼
Blade template (game.blade.php): env('VITE_WS_URL', 'ws://127.0.0.1:8089')
   ▼ (Evaluates to NULL when cached)
Falls back to: ws://127.0.0.1:8089
   ▼
HTML: <meta name="ws-url" content="ws://127.0.0.1:8089">
   ▼
RealtimeClient connects to: ws://127.0.0.1:8089 (Client's local machine loopback — FAILS)
```

### New Authoritative Configuration Chain
```text
.env
VITE_WS_URL=wss://alive.locallhost.shop/ws/
        │
        ▼
config/services.php
'realtime' => [
    'ws_url' => env('VITE_WS_URL'),
]
        │ (Serialized during `php artisan config:cache`)
        ▼
config('services.realtime.ws_url')
        │
        ▼
resources/views/game.blade.php
<meta name="ws-url" content="{{ config('services.realtime.ws_url') ?: ((request()->isSecure() ? 'wss://' : 'ws://') . request()->getHttpHost() . '/ws/') }}">
        │
        ▼
HTML: <meta name="ws-url" content="wss://alive.locallhost.shop/ws/">
        │
        ▼
RealtimeClient (reads meta[name="ws-url"])
        │
        ▼
wss://alive.locallhost.shop/ws/
        │ (Port 443 TLS)
        ▼
Apache Reverse Proxy
        │
        ▼
Node Realtime Server (127.0.0.1:8089)
```

---

## 3. FILES MODIFIED

1. [`config/services.php`](file:///home/temp/laravel_demo/config/services.php):
   - Added configuration mapping:
     ```php
     'realtime' => [
         'ws_url' => env('VITE_WS_URL'),
     ],
     ```
2. [`resources/views/game.blade.php`](file:///home/temp/laravel_demo/resources/views/game.blade.php):
   - Replaced direct `env()` call with `config('services.realtime.ws_url')`.
   - Added safe same-origin fallback `((request()->isSecure() ? 'wss://' : 'ws://') . request()->getHttpHost() . '/ws/')` so that even if `VITE_WS_URL` is omitted, the HTML derives same-origin `/ws/` and never leaks `127.0.0.1:8089`.
3. [`resources/js/game/multiplayer/RealtimeClient.js`](file:///home/temp/laravel_demo/resources/js/game/multiplayer/RealtimeClient.js):
   - Updated constructor resolution:
     - Prioritizes passed `wsUrl`.
     - Prioritizes `meta[name="ws-url"]`.
     - Supports relative paths (`/ws/`) by resolving to `${protocol}//${window.location.host}/ws/`.
     - Safe fallback derives same-origin (`window.location.protocol === 'https:' ? 'wss:' : 'ws:'`) with current host.
     - Never defaults to `127.0.0.1:8089`.
4. [`playwright.config.js`](file:///home/temp/laravel_demo/playwright.config.js):
   - Configured `webServer.env` for `php artisan serve` with `VITE_WS_URL: 'ws://127.0.0.1:8089'` to ensure isolated local automated testing targets the local node server on port 8089.
5. [`tests/Feature/WebSocketUrlConfigurationTest.php`](file:///home/temp/laravel_demo/tests/Feature/WebSocketUrlConfigurationTest.php) *(New Test Suite)*:
   - Added automated regression tests covering Cases A through E.

---

## 4. .ENV AND CONFIG BEHAVIOR

- `.env` remains the authoritative single source of truth for deployments:
  ```env
  VITE_WS_URL=wss://alive.locallhost.shop/ws/
  ```
- Any environment change to `VITE_WS_URL` dynamically updates `config('services.realtime.ws_url')` without editing any JavaScript code or Blade templates.
- Works seamlessly in local dev, staging, and production environments.

---

## 5. REALTIMECLIENT FALLBACK BEHAVIOR

The client implements defensive same-origin protocol derivation:
```js
let resolvedUrl = wsUrl || metaContent;
if (!resolvedUrl) {
    const isSecure = typeof window !== 'undefined' && window.location?.protocol === 'https:';
    const protocol = isSecure ? 'wss:' : 'ws:';
    const host = (typeof window !== 'undefined' && window.location?.host) ? window.location.host : 'localhost';
    resolvedUrl = `${protocol}//${host}/ws/`;
} else if (resolvedUrl.startsWith('/')) {
    const isSecure = typeof window !== 'undefined' && window.location?.protocol === 'https:';
    const protocol = isSecure ? 'wss:' : 'ws:';
    const host = (typeof window !== 'undefined' && window.location?.host) ? window.location.host : 'localhost';
    resolvedUrl = `${protocol}//${host}${resolvedUrl}`;
}
this.wsUrl = resolvedUrl;
```

---

## 6. LARAVEL CONFIG CACHING VERIFICATION

Executed:
```bash
php artisan optimize:clear
php artisan config:cache
php artisan tinker --execute="dump(config('services.realtime.ws_url'));"
```

Output:
```text
INFO Configuration cached successfully.
"wss://alive.locallhost.shop/ws/"
```

Tested Blade rendering under cached configuration:
```bash
php artisan tinker --execute="echo preg_match('/<meta name=\"ws-url\" content=\"([^\"]+)\">/', view('game')->render(), \$matches) ? \$matches[0] : 'not found';"
```

Output:
```html
<meta name="ws-url" content="wss://alive.locallhost.shop/ws/">
```
Verification confirmed: Blade reliably outputs the configured WSS URL without reverting to `ws://127.0.0.1:8089`.

---

## 7. AUTOMATED TESTS & VERIFICATION RESULTS

### PHPUnit Feature Test Suite (`WebSocketUrlConfigurationTest.php`)
- **Case A — Environment config resolution**: Validates `config('services.realtime.ws_url')` reads from configuration. (**PASSED**)
- **Case B — Blade output**: Validates `<meta name="ws-url" content="wss://example.test/ws/">` is rendered. (**PASSED**)
- **Case C — Production configuration cache**: Validates `php artisan config:cache` preserves the configured URL in Blade. (**PASSED**)
- **Case D — Safe fallback without loopback**: Validates that when config is null, HTTP requests derive same-origin `ws://<host>/ws/` without loopback. (**PASSED**)
- **Case E — HTTPS same-origin fallback**: Validates that HTTPS requests derive `wss://<host>/ws/`. (**PASSED**)

```json
{"tool":"phpunit","result":"passed","tests":5,"passed":5,"assertions":16,"duration_ms":169}
```
Full PHPUnit Suite: **44/44 tests passed, 392 assertions**.

### Playwright End-to-End Test Suite
- `tests/e2e/multiplayer.spec.js`: **5/5 passed (46.0s)** (Multiplayer visibility, throw & rescue, reconnect UX, concurrent 3D gods).
- `tests/e2e/game.spec.js`: **7/7 passed (22.4s)** (Citizen lifecycle, drowning alerts, drowning expiration, scene transitions).

### Frontend Build
- `npm run build`: Compiled cleanly via Vite (client bundle generated at `public/build/assets/app-CScvBsZd.js`).

---

## 8. REMAINING RISKS & MITIGATIONS

1. **Proxy Headers in Complex Topologies**:
   - *Risk*: If an edge proxy terminates SSL without passing standard `X-Forwarded-Proto: https`, `request()->isSecure()` might detect HTTP instead of HTTPS if `services.realtime.ws_url` is missing.
   - *Mitigation*: In production, `.env` explicitly defines `VITE_WS_URL=wss://alive.locallhost.shop/ws/`, so `config('services.realtime.ws_url')` is used directly, bypassing scheme autodetection.
