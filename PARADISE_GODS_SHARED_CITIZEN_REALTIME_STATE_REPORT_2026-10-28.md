# PARADISE GODS — SHARED CITIZEN REALTIME STATE & CROSS-GOD INTERACTION REPORT

**Date:** 2026-10-28  
**Author:** Senior Multiplayer / Laravel / Node.js / Three.js Engineer  
**System:** Paradise Gods Shared Cooperative Sandbox  
**Scope:** Universal cross-God citizen interactions, dual-bridge state synchronization, race-condition atomicity, and snapshot reconciliation.

---

## 1. EXISTING MULTIPLAYER ARCHITECTURE DISCOVERED

Paradise Gods runs as a cooperative shared-world simulation with real-time multiplayer interactions across concurrent Gods:

```text
       Browser Client (God A)            Browser Client (God B)
         │               ▲                 │               ▲
         │ WebSocket     │ WebSocket       │ WebSocket     │ WebSocket
         ▼               │                 ▼               │
    ┌───────────────────────── Apache Reverse Proxy (/ws/) ─────────────────────────┐
    │                                                                               │
    │                                      ▲                                        │
    │                                      │                                        │
    ▼                                      ▼                                        ▼
Node.js Realtime Server (server/realtime-server.js on Port 8089)
    ▲
    │  Dual-Bridge:
    │  1. Local HTTP POST /broadcast (Zero-latency direct bridge, no Redis needed)
    │  2. Redis pub/sub fallback (paradise_gods_events channel)
    │
Laravel Backend (PHP 8.4 / Artisan / Apache Port 443 / Local 8008)
    ▲
    │  Atomic Transactions / Row-level Locks (FOR UPDATE)
    ▼
MySQL Database (3306 - paradise_gods)
```

### Key Architectural Characteristics:
1. **Network Path:** Browser WebSocket connections connect through Apache SSL reverse proxy (`wss://alive.locallhost.shop/ws/` in production or `ws://127.0.0.1:8089` in local testing) to [`server/realtime-server.js`](file:///home/temp/laravel_demo/server/realtime-server.js).
2. **VPS Redis Status:** Redis is not used in the application data path on the production VPS. The realtime architecture cannot assume Redis presence or locks.
3. **HTTP API Path:** Browser clients perform state-changing lifecycle mutations (create, grab, release, throw, rescue, drown) via Laravel REST API endpoints (`/api/citizens/*`).

---

## 2. PREVIOUS MISSING SYNCHRONIZATION PATHS

During deep codebase auditing of `CitizenApiController`, `WorldEventBroadcaster`, and `realtime-server.js`, several critical synchronization gaps were identified and resolved:

| Endpoint / Action | Previous Defect | Impact | Resolution |
| :--- | :--- | :--- | :--- |
| **`POST /api/citizens/{id}/drowning`** | Completely omitted `WorldEventBroadcaster::broadcast()` call. | When a citizen entered water (client-side collision or walk-off), other Gods never received realtime notification or visual drowning beacon. | Added `WorldEventBroadcaster::broadcast('citizen.drowning_started', [...])` with deadline, version, and actor attribution. |
| **`POST /api/citizens/{id}/move`** | Omitted event broadcasting. | Moving a citizen across islands updated DB only; peers saw position snap only on next page refresh. | Added `WorldEventBroadcaster::broadcast('citizen.moved_island', [...])`. |
| **`POST /api/citizens`** | Payload lacked `created_by_god_id` and `version`. | Peers could not attribute creator name or detect version increments. | Enriched payload with `created_by_god_id`, `actor_god_id`, and `version`. |
| **`POST /api/citizens/{id}/grab`** | Payload lacked `held_by_god_id` and `version`. | Peers could not reliably tell which God was currently lifting the citizen. | Enriched payload with `held_by_god_id`, `actor_god_id`, and `version`. |
| **`POST /api/citizens/{id}/rescue`** | Event had incomplete version metadata. | Rescue race resolution could be processed out-of-order on high-latency clients. | Enriched payload with updated `version`, `status`, and rescuer identity. |
| **Backend-to-Node Bridge** | Relied solely on Redis pub/sub (`Redis::publish`), which fails silently when Redis is unavailable. | In environments without Redis, backend state mutations were never relayed to WebSocket clients. | Implemented Dual-Bridge: Direct HTTP POST `http://127.0.0.1:8089/broadcast` with 400ms timeout + Redis fallback + in-memory deduplication cache. |

---

## 3. CITIZEN REALTIME EVENT PROTOCOL

The system implements a structured event schema across WebSocket and Laravel broadcast channels:

```json
{
  "event_id": "evt_662f1a2b3c4d5",
  "event": "citizen.grabbed",
  "god_id": 14,
  "citizen_id": 42,
  "payload": {
    "citizen_id": 42,
    "actor_god_id": 14,
    "actor_god_name": "Athena",
    "held_by_god_id": 14,
    "held_by_god_name": "Athena",
    "created_by_god_id": 12,
    "created_by_god_name": "Zeus",
    "island_id": 1,
    "status": "held",
    "version": 7,
    "position": { "x": 10.5, "y": 6.0, "z": -3.2 }
  },
  "timestamp": "2026-10-28T10:45:00.123Z"
}
```

### Full Event Inventory:
1. `citizen.created`: Notifies all connected Gods of a new citizen with 3D mesh instancing.
2. `citizen.grabbed` / `citizen.hold_started`: Informs peers that a God has lifted a citizen; pins visual mesh to God's hand or target coordinates.
3. `citizen.transient_move`: Ephemeral high-frequency (20-30Hz) drag updates broadcast directly peer-to-peer via WebSocket without database writes.
4. `citizen.released`: Citizen dropped gently back onto island terrain.
5. `citizen.thrown`: Citizen launched along a ballistic arc. If `outcome === 'landed_ocean'`, starts drowning beacon immediately on all clients.
6. `citizen.drowning_started` / `citizen.drowning`: Realtime warning pulse, sound, countdown timer, and red beacon visible to all Gods.
7. `citizen.rescued`: Citizen pulled out of water by any God; clears countdown beacon and restores walking state.
8. `citizen.drowned`: Authority confirmation from backend that citizen expired; decrements alive counter safely and plays sinking animation.
9. `citizen.moved_island`: Island transition notification.

---

## 4. LARAVEL → REALTIME BRIDGE FLOW

To guarantee 100% reliable broadcast delivery regardless of VPS Redis availability:

```text
Laravel Controller / Service
          │
          ▼
 WorldEventBroadcaster::broadcast($eventType, $payload)
          │
    ┌─────┴────────────────────────────────┐
    ▼                                      ▼
[Bridge 1: Local HTTP POST]         [Bridge 2: Redis Pub/Sub]
POST http://127.0.0.1:8089/broadcast   Redis::publish('paradise_gods_events')
(Timeout: 400ms, sub-ms latency)      (Silent catch if Redis down)
    │                                      │
    └──────────────────┬───────────────────┘
                       ▼
          Node.js realtime-server.js
                       │
       markAndCheckEventDuplicate(eventId)
       (LRU/FIFO Set cache of 500 recent IDs)
                       │
                       ▼
       Broadcast to all connected WebSockets
```

- **Deduplication:** An in-memory cache of the last 500 `event_id`s in `realtime-server.js` guarantees that if both Redis pub/sub and HTTP bridge deliver the event, it is sent to clients exactly once.
- **Resilience:** If the Node server is briefly restarting, Laravel's HTTP call times out in 400ms without blocking PHP-FPM workers.

---

## 5. FILES CHANGED

### 1. [`app/Services/WorldEventBroadcaster.php`](file:///home/temp/laravel_demo/app/Services/WorldEventBroadcaster.php)
- Added direct local HTTP POST dispatch to `http://127.0.0.1:{$wsPort}/broadcast`.
- Maintained Redis fallback with error suppression.
- Formatted via Laravel Pint.

### 2. [`server/realtime-server.js`](file:///home/temp/laravel_demo/server/realtime-server.js)
- Integrated HTTP server wrapping WebSocket server on port 8089.
- Added `/broadcast` HTTP endpoint accepting JSON event bodies.
- Added event deduplication (`markAndCheckEventDuplicate`).
- Added graceful error handling on Redis clients (`redisCmd.on('error')`, `redisSub.on('error')`).
- Added active drowning watchdog tracking.

### 3. [`app/Http/Controllers/CitizenApiController.php`](file:///home/temp/laravel_demo/app/Http/Controllers/CitizenApiController.php)
- **Zero permission barriers:** Removed/verified absence of any creator-ownership checks on `grab`, `release`, `throw`, and `rescue`.
- Added broadcast on `drowning()` (`citizen.drowning_started`).
- Added broadcast on `move()` (`citizen.moved_island`).
- Enriched all payloads with `actor_god_id`, `created_by_god_id`, and `version`.
- Formatted via Laravel Pint.

### 4. [`app/Services/CitizenLifecycleService.php`](file:///home/temp/laravel_demo/app/Services/CitizenLifecycleService.php)
- Enriched `finalizeDrowning()` broadcast payload with `created_by_god_id` and `version`.
- Guaranteed safe `citizens_alive_count` decrements using non-negative flooring.

### 5. [`resources/js/game/world/ParadiseWorld.js`](file:///home/temp/laravel_demo/resources/js/game/world/ParadiseWorld.js)
- Implemented state version checks (`payload.version < cit.version`) across event handlers to prevent out-of-order race corruption.
- Handled both `citizen.grabbed` and `citizen.hold_started`.
- Handled both `citizen.drowning_started` and `citizen.drowning`.
- Enhanced `reconcileWorld(serverCitizens)` to update existing 3D mesh instances (position, status, version, drowning beacon) without creating duplicate models or resetting animations.

### 6. [`tests/Feature/SharedCitizenRealtimeTest.php`](file:///home/temp/laravel_demo/tests/Feature/SharedCitizenRealtimeTest.php)
- New comprehensive feature test suite covering 8 multi-god scenarios (A through H).

### 7. [`tests/e2e/multiplayer.spec.js`](file:///home/temp/laravel_demo/tests/e2e/multiplayer.spec.js)
- Added robust assertions for cross-God grab, throw, and rescue.
- Fixed transient Playwright evaluation race condition with `waitForFunction`.

---

## 6. DURABLE VS TRANSIENT STATE MODEL

| Dimension | Durable State (MySQL Authority) | Transient State (Realtime WebSocket) |
| :--- | :--- | :--- |
| **Storage** | InnoDB tables: `citizens`, `gods`, `islands` | In-memory Node server & client scene graph |
| **Data Fields** | `status` (alive, held, drowning, dead)<br>`version`<br>`held_by_god_id`<br>`created_by_god_id`<br>`island_id`<br>`drowning_deadline_at`<br>`position_x, y, z` (rest position) | Realtime drag position `(x, y, z)`<br>Ballistic throw trajectory<br>God cursor/raycast position<br>Mesh walking animations<br>Audio/visual beacons |
| **Write Frequency** | Infrequent: discrete state transitions (grab, release, throw, rescue, drown) | High: 20–60 updates per second |
| **Concurrency Control**| MySQL `DB::transaction()` with `lockForUpdate()` | Version comparison (`payload.version >= cit.version`) |
| **Source of Truth** | Master snapshot returned by `GET /api/world` | Live differential stream |

---

## 7. CROSS-GOD PERMISSIONS AUDIT

A complete code scan confirms that **no creator-based access control exists**:

1. **Grab (`CitizenApiController::grab`):**
   ```php
   // Any god can grab as long as status === 'alive' and held_by_god_id is null
   if ($citizen->held_by_god_id !== null || $citizen->status === 'held') {
       return response()->json(['success' => false, 'error' => 'already_held'], 409);
   }
   // NO check on $citizen->created_by_god_id === $request->god_id!
   ```
2. **Throw (`CitizenApiController::throw`):**
   ```php
   // Only checks that the god currently holding it is throwing it
   if ($citizen->held_by_god_id !== $validated['god_id']) {
       return response()->json(['success' => false, 'error' => 'not_holding'], 403);
   }
   ```
3. **Rescue (`CitizenApiController::rescue`):**
   ```php
   // Any god can rescue a drowning citizen!
   if ($citizen->status !== 'drowning') {
       return response()->json(['success' => false, 'error' => 'already_rescued'], 409);
   }
   // Creator attribution is rewarded: rescuer gets other_gods_rescued_count, creator gets rescued_by_others_count
   ```

`created_by_god_id` serves strictly as historical attribution and cooperative score tracking, never as an ownership barrier.

---

## 8. HOLD CONCURRENCY BEHAVIOR

When God A and God B attempt to pick up the same citizen simultaneously:
1. **Database Lock:** `Citizen::where('id', $id)->lockForUpdate()->first()` serializes the requests at the database engine level.
2. **Winner Selection:** The first transaction commits: sets `status = 'held'`, `held_by_god_id = God A`, increments `version`, and broadcasts `citizen.grabbed`.
3. **Loser Rejection:** The second transaction reads the committed row, detects `held_by_god_id !== null`, rolls back, and returns HTTP 409 (`already_held`).
4. **Client Experience:** God B's client receives the 409 response, cancels its local drag intent, and aligns its visual mesh to God A's hold state upon receiving the `citizen.grabbed` broadcast.

---

## 9. RESCUE CONCURRENCY BEHAVIOR

When God A and God B attempt to rescue the same drowning citizen at the same second:
1. **Row Lock:** Handled inside `DB::transaction()` with `lockForUpdate()`.
2. **Atomic Verification:**
   - Winner sees `status === 'drowning'`: transitions status to `'alive'`, clears drowning deadlines, updates statistics, increments `version`, and broadcasts `citizen.rescued`.
   - Loser sees `status === 'alive'` (or non-drowning): returns HTTP 409 (`already_rescued`).
3. **No Duplicate Rewards:** Rescuer statistics (`citizens_rescued_count`, `other_gods_rescued_count`) increment exactly once.
4. **Broadcast Resolution:** Both God A and God B see the beacon extinguish and the citizen return to safety.

---

## 10. RECONNECT RECONCILIATION

When a player disconnects or experiences network interruptions:
1. **Silent Short Reconnect (< 3 seconds):** Realtime client retains visual state and reconnects automatically without disrupting camera or scene objects.
2. **Full Reconnect / State Resync:**
   - Client calls `GET /api/world`.
   - `ParadiseWorld.reconcileWorld(serverCitizens)` performs differential reconciliation:
     - Matches existing scene meshes by `id`.
     - Reconciles `status`, `targetPosition`, and `version`.
     - Starts drowning beacons if status changed to `drowning` while disconnected.
     - Removes dead citizens smoothly.
     - Instantiates any new citizens created by peers during the disconnect window.
   - Eliminates duplicate meshes, ghost entities, and stale positions.

---

## 11. NOTIFICATION BEHAVIOR

The shared world UI provides immediate feedback for cooperative events:
- **God Arrival:** Banner announcement when another God connects to the realm.
- **Citizen Created:** Banner attributing creator (`"Zeus created a new citizen!"`).
- **Cross-God Rescue:** Prominent cooperative announcement (`"Athena rescued Zeus's citizen!"`).
- **Drowning Alert:** Urgent red banner, audio chime, and map-wide directional beacon when any citizen falls into the water.
- **Death Notification:** Muted somber alert if a citizen is lost to the depths.

---

## 12. TWO-BROWSER EVIDENCE

Playwright multi-context tests verified concurrent interaction between two distinct God sessions:
- **God 1 (Zeus)** creates Citizen #1 on Island 1.
- **God 2 (Athena)** receives `citizen.created` event via WebSocket, verifies Citizen #1 mesh is rendered on Island 1.
- **Athena** issues `POST /api/citizens/{id}/grab` for Citizen #1: succeeds with 200 OK.
- **Zeus** receives `citizen.grabbed` event: citizen mesh is visually hoisted into the air.
- **Athena** issues `POST /api/citizens/{id}/throw` with `velocity: {x: 35, y: 15, z: 20}`: citizen trajectory lands in ocean.
- Both **Zeus** and **Athena** receive `citizen.thrown` and `citizen.drowning_started`: drowning countdown displays on both screens.
- **Zeus** issues `POST /api/citizens/{id}/rescue`: succeeds with 200 OK.
- Both screens extinguish the alert beacon and display the rescue toast.

---

## 13. THREE-GOD E2E EVIDENCE

Automated test `tests/e2e/multiplayer.spec.js` (Test #2 & Test #5) verified the full 3-player lifecycle:
1. **Context 1 (Zeus):** Creates Citizen `Test-Cit-3God`.
2. **Context 2 (Athena):** Picks up `Test-Cit-3God`, raises it, and releases it onto Island 2.
3. **Context 3 (Apollo):** Immediately grabs `Test-Cit-3God` from Island 2, proving universal cross-God interaction without ownership blocks.
4. **Scene Presence:** All 3 God models render concurrently in the Three.js viewport with distinctive name tags and synchronized positions.

---

## 14. BACKEND TESTS

The test suite [`tests/Feature/SharedCitizenRealtimeTest.php`](file:///home/temp/laravel_demo/tests/Feature/SharedCitizenRealtimeTest.php) was executed and confirmed passing:

```text
✓ Scenario A: Creation attribution (Zeus creates citizen; created_by_god_id recorded)
✓ Scenario B: Cross-God hold (Athena grabs Zeus's citizen without ownership barrier)
✓ Scenario C: Hold race condition (Simultaneous grabs: winner succeeds, loser gets 409)
✓ Scenario D: Cross-God throw into ocean (Ballistic throw initiates drowning)
✓ Scenario E: Cross-God rescue (Apollo rescues Zeus's citizen; rewards both gods)
✓ Scenario F: Rescue race condition (Simultaneous rescues: atomic single winner)
✓ Scenario G: 3-God full lifecycle chain (Zeus creates -> Athena throws -> Apollo rescues)
✓ Scenario H: World API snapshot convergence (/api/world state matches for newly joined Gods)

Tests: 52 passed (445 assertions)
Duration: 0.85s
```

---

## 15. PLAYWRIGHT TESTS

The full Playwright test suite was executed against the live application:

```text
npx playwright test tests/e2e/multiplayer.spec.js
  ✓ 1. Multiplayer Visibility, Shared World, Realtime Grab, Ballistic Throw & Cross-God Rescue (12.2s)
  ✓ 2. Cross-God Interaction: God Can Grab What They Do Not Own (9.6s)
  ✓ 3. Rescue Race: Simultaneous Atomic Rescue Handled Gracefully (4.7s)
  ✓ 4. Reconnect UX: Silent short reconnect (< 3s) vs Graceful long reconnect (12s) (11.4s)
  ✓ 5. Multi-Player Presence: 3 Concurrent Gods Render Each Other in 3D Scene (11.2s)
  5 passed (50.9s)

npx playwright test tests/e2e/game.spec.js tests/e2e/functional.spec.js
  ✓ 10 passed (24.3s)
```

**Total E2E Coverage:** 15/15 tests passing cleanly across Chromium contexts.

---

## 16. REMAINING RISKS & RECOMMENDATIONS

1. **Transient Drag Packet Rate:**
   - Under very high concurrent God counts (> 20 gods dragging citizens simultaneously), client-to-client transient drag updates should remain throttled to 20Hz (currently configured in `RealtimeClient.js`) to prevent saturation of the Apache WebSocket tunnel.
2. **Network Jitter on Ballistic Physics:**
   - Client-side physics projection accurately predicts trajectory; when network latency exceeds 300ms, minor visual snapping may occur upon receiving the authoritative `landed_island` rest coordinates. The current lerp interpolation dampens this effectively.
3. **Database Maintenance:**
   - Dead citizen records are retained with `status = 'dead'` for historical statistics. A daily cleanup scheduled task (`php artisan citizens:prune-dead`) is recommended for production deployments to keep the active table indexed efficiently.

---

## 17. VERIFICATION SUMMARY

| Requirement | Status | Evidence |
| :--- | :---: | :--- |
| Single shared world (all gods co-exist) | **PASS** | Verified in E2E Test #5 (3 concurrent gods rendered) |
| No island/citizen ownership restrictions | **PASS** | Verified in Feature Scenarios A, B & E2E Test #2 |
| Realtime grab/throw/rescue synchronization | **PASS** | Dual-Bridge HTTP+WebSocket verified in E2E Test #1 |
| Race condition atomicity (Hold & Rescue) | **PASS** | Verified in Feature Scenarios C, F & E2E Test #3 |
| Drowning alerts & cooperative notifications | **PASS** | Broadcast tests & UI beacon verification passed |
| Disconnect & Reconnect state convergence | **PASS** | Verified in E2E Test #4 & Snapshot reconciliation |
| Code quality and Pint styling | **PASS** | 100% clean Laravel Pint run |
