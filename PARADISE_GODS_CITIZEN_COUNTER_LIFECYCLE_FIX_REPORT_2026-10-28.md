# PARADISE GODS — CITIZEN LIFECYCLE COUNTER CONSISTENCY FIX REPORT

- **Date:** 2026-10-28
- **Author:** Senior Laravel Engineer
- **Component:** Paradise Gods Backend Lifecycle & Counter Consistency Engine
- **Status:** Complete, Verified, Regression-Free

---

## 1. ROOT CAUSE ANALYSIS

### Symptom
Production logs observed the following error on drowning finalization:
```text
SQLSTATE[22003]: Numeric value out of range: 1690 BIGINT UNSIGNED value is out of range in '(`paradise_gods`.`gods`.`citizens_alive_count` - 1)'
```
Triggered by:
```text
POST /api/citizens/{citizen}/drown
```

### Exact Call Path & Mechanics
1. **Unsynchronized Drowning Expirations**: When a citizen fell into the ocean, the frontend initiated a countdown. When the countdown reached 0, the client invoked `POST /api/citizens/{id}/drown`. Concurrently, if a player attempted a rescue near the timeout boundary, `CitizenApiController::rescue()` also evaluated `if (now() >= expires_at)` and executed its internal drowning branch.
2. **Missing Concurrency Protection & Non-Atomic Decrements**: In `CitizenApiController`, both the `rescue` timeout fallback and the `drown` endpoint executed direct, unconstrained database decrements:
   ```php
   God::where('id', $c->created_by_god_id)->decrement('citizens_alive_count');
   ```
   No `lockForUpdate()` was held on either the `citizens` row or the `gods` row. If a second request arrived (duplicate network retry, simultaneous rescue + client timer timeout), both branches proceeded to execute `decrement()`.
3. **Flawed Living Invariant in Seeders & Queries**: In `WorldSeeder.php` line 259, `citizens_alive_count` was initialized via:
   ```php
   $g->citizens()->where('status', 'alive')->count()
   ```
   Citizens in `'held'` or `'drowning'` state were excluded from `citizens_alive_count`. Consequently, if a god's citizens transitioned to `'drowning'`, their `citizens_alive_count` could reach `0` before the citizen died. When finalization occurred, MySQL attempted `0 - 1` on an `unsignedInteger` column, throwing `SQLSTATE[22003]`.
4. **Transaction Abort & Corrupted State**: The resulting exception caused MySQL to rollback the transaction. The citizen remained stuck in `'drowning'` state in the database, breaking the multiplayer death broadcast and leaving the client in an inconsistent loop.

---

## 2. PREVIOUS INCONSISTENT SEMANTICS VS NEW AUTHORITATIVE SEMANTICS

| Aspect | Previous Inconsistent Semantics | New Authoritative Semantics |
| :--- | :--- | :--- |
| **Living Definition** | `status = 'alive'` only. Citizens in `'held'` or `'drowning'` were ambiguously living. | **Authoritative Living Scope**: `status IN ('alive', 'held', 'drowning')`. Any citizen not dead is alive. |
| **God Counter Scope** | Fragmented across raw queries in controllers, models, and seeders. | Centralized via `Citizen::scopeLiving()` and `CitizenLifecycleService`. |
| **Drown Concurrency** | Race condition between `POST /drown` and `POST /rescue`. Duplicate requests caused double decrements. | Single atomic entry point `CitizenLifecycleService::finalizeDrowning()` with `DB::transaction()` and pessimistic row locks (`lockForUpdate`). |
| **Idempotency** | If citizen already transitioned to `'dead'`, secondary calls still executed decrements. | Guard checks `if ($citizen->status !== 'drowning') return ['status' => 'already_dead']`. Does not decrement, returns HTTP 200 idempotently. |
| **Underflow Guard** | Direct MySQL `col - 1` without bounding. | `max(0, $god->citizens_alive_count - 1)` prevents underflow even under unforeseen anomalies. |

---

## 3. FILES CHANGED

1. [`app/Models/Citizen.php`](file:///home/temp/laravel_demo/app/Models/Citizen.php):
   - Defined `LIVING_STATUSES = ['alive', 'held', 'drowning']`.
   - Added `scopeLiving(Builder $query)`: queries `whereIn('status', self::LIVING_STATUSES)`.
   - Added helper method `isLiving(): bool`.
2. [`app/Models/God.php`](file:///home/temp/laravel_demo/app/Models/God.php):
   - Updated `getStatsAttribute()`: uses `$this->citizens()->living()->count()` to calculate current living population accurately.
3. [`app/Models/Island.php`](file:///home/temp/laravel_demo/app/Models/Island.php):
   - Updated `getPopulationAttribute()`: uses `$this->citizens()->living()->count()`.
4. [`app/Services/CitizenLifecycleService.php`](file:///home/temp/laravel_demo/app/Services/CitizenLifecycleService.php) *(New Service)*:
   - Encapsulates atomic drowning finalization (`finalizeDrowning`) with row locks, status transitions, version increments, safe god counter mutation, and deduplicated broadcast dispatch.
   - Encapsulates drift reconciliation (`reconcileGodCounters`) with dry-run support.
5. [`app/Http/Controllers/CitizenApiController.php`](file:///home/temp/laravel_demo/app/Http/Controllers/CitizenApiController.php):
   - Injected `CitizenLifecycleService`.
   - Refactored `rescue()` timeout branch and `drown()` endpoint to delegate to `CitizenLifecycleService::finalizeDrowning()`.
   - Refactored `store()` and `move()` world population calculations to use `Citizen::living()->count()`.
6. [`app/Http/Controllers/WorldApiController.php`](file:///home/temp/laravel_demo/app/Http/Controllers/WorldApiController.php):
   - Refactored total population and island citizen counts to utilize `->living()`.
7. [`database/seeders/WorldSeeder.php`](file:///home/temp/laravel_demo/database/seeders/WorldSeeder.php):
   - Updated god statistics seeding from `where('status', 'alive')` to `->living()`.
8. [`app/Console/Commands/ReconcileGodCountersCommand.php`](file:///home/temp/laravel_demo/app/Console/Commands/ReconcileGodCountersCommand.php) *(New Command)*:
   - Provides CLI command `php artisan paradise:reconcile-counters {--dry-run} {--god=}`.
9. [`tests/Feature/CitizenCounterConsistencyTest.php`](file:///home/temp/laravel_demo/tests/Feature/CitizenCounterConsistencyTest.php) *(New Test Suite)*:
   - Automated tests covering Tests A through H.

---

## 4. LIFECYCLE STATE TRANSITION TABLE

| Source Status | Destination Status | Allowed Trigger | `citizens_alive_count` Change | `citizens_drowned_count` Change |
| :--- | :--- | :--- | :--- | :--- |
| `[None]` | `alive` | Creation (`POST /api/citizens`) | **+1** | 0 |
| `alive` | `held` | Grab (`POST /api/citizens/{id}/hold`) | 0 (still living) | 0 |
| `held` | `alive` | Soft Release / Drop (`POST /api/citizens/{id}/release`) | 0 (still living) | 0 |
| `held` | `drowning` | Ocean Throw / Drop into water | 0 (still living) | 0 |
| `alive` | `drowning` | Ambient walk into water | 0 (still living) | 0 |
| `drowning` | `alive` | Cross-God Rescue (`POST /api/citizens/{id}/rescue`) | 0 (still living) | 0 |
| `drowning` | `dead` | Timeout Drown Finalization (`finalizeDrowning`) | **-1** | **+1** |
| `dead` | `dead` | Duplicate / Retry Drown Call | **0 (Idempotent ignore)** | **0 (Idempotent ignore)** |

---

## 5. EXISTING DATA DRIFT AUDIT & RECONCILIATION

### Execution of Reconciliation Command
The command was executed on the MySQL database:
```bash
php artisan paradise:reconcile-counters
```
### Reconciliation Output
```text
⚙ Reconciling God citizen counters with authoritative database state..
+----+----------------+---------------------------+-------------------------+---------------------------+--------+
| ID | Name           | Created (Before -> After) | Alive (Before -> After) | Drowned (Before -> After) | Drift? |
+----+----------------+---------------------------+-------------------------+---------------------------+--------+
| 1  | Zeus           | 51 -> 51                  | 39 -> 39                | 12 -> 12                  | ✓ OK   |
| 2  | Athena         | 6 -> 6                    | 1 -> 1                  | 5 -> 5                    | ✓ OK   |
| 5  | Zeus           | 1 -> 1                    | 1 -> 1                  | 0 -> 0                    | ✓ OK   |
| 10 | Thần Kiến Tạo  | 1 -> 1                    | 1 -> 1                  | 0 -> 0                    | ✓ OK   |
| ...| (All other gods)| 0 -> 0                   | 0 -> 0                  | 0 -> 0                    | ✓ OK   |
+----+----------------+---------------------------+-------------------------+---------------------------+--------+
✓ All God counters are already 100% consistent with authoritative citizen state.
```
Every God entity in the database matches the true count of living (`alive`, `held`, `drowning`) and drowned citizens.

---

## 6. AUTOMATED TEST SUITE (PHPUNIT)

Test suite implemented in [`tests/Feature/CitizenCounterConsistencyTest.php`](file:///home/temp/laravel_demo/tests/Feature/CitizenCounterConsistencyTest.php):

- **Test A: Normal Death Finalization** (`test_normal_drowning_finalization_decrements_alive_and_increments_drowned`):
  - Validates `alive_count: 1 -> 0`, `drowned_count: 0 -> 1`, HTTP 200 status `'drowned'`.
- **Test B: Duplicate Drown Idempotency** (`test_duplicate_drown_calls_are_idempotent_and_do_not_decrement_twice`):
  - Validates second `/drown` call returns HTTP 200 with status `'already_dead'`, leaving counts unchanged.
- **Test C: Concurrent Rescue Timeout vs Drown Endpoint Dedup** (`test_concurrent_rescue_timeout_and_drown_endpoint_are_deduplicated`):
  - Simulates simultaneous execution of rescue-timeout fallback and drown endpoint; verifies exactly one decrement occurs.
- **Test D: Successful Rescue Preserves Counters** (`test_successful_rescue_preserves_alive_and_drowned_counters`):
  - Citizen rescued before timeout transitions `drowning -> alive`; verifies `alive_count` remains intact and `drowned_count` does not increment.
- **Test E: Grab and Hold Preserves Counters** (`test_grab_and_release_preserves_alive_counter`):
  - Citizen grabbed (`alive -> held`) and released (`held -> alive`); verifies `alive_count` remains 1 throughout.
- **Test F: Drowning In-Flight Preserves Living Count** (`test_transition_to_drowning_preserves_alive_counter`):
  - Transition from `alive` to `drowning` maintains `citizens_alive_count` at 1.
- **Test G: Drift Reconciliation Command** (`test_reconciliation_command_detects_and_fixes_counter_drift`):
  - Intentionally introduces counter drift; verifies `paradise:reconcile-counters` identifies and restores exact authoritative counts.
- **Test H: Production Incident Reproduction** (`test_production_incident_reproduction_does_not_throw_numeric_overflow`):
  - Simulates the exact production bug where `citizens_alive_count = 0` while a citizen is drowning. Calling `/drown` succeeds with HTTP 200 and does NOT throw `SQLSTATE[22003]`.

### PHPUnit Execution Result
```json
{"tool":"phpunit","result":"passed","tests":8,"passed":8,"assertions":43,"duration_ms":193}
```
Full test suite (`php artisan test`):
```json
{"tool":"phpunit","result":"passed","tests":39,"passed":39,"assertions":376,"duration_ms":634}
```

---

## 7. MULTIPLAYER REGRESSION & END-TO-END VERIFICATION

1. **Multiplayer Playwright Suite** (`tests/e2e/multiplayer.spec.js`):
   - Test 1: Cross-God rescue across shared world (Zeus throws citizen, Athena rescues).
   - Test 2: Any God can interact with any citizen (Zeus creates, Athena lifts, Apollo grabs).
   - Test 3: Rescue race: simultaneous atomic rescue handled gracefully.
   - Test 4: Reconnect UX: silent short reconnect vs graceful long reconnect.
   - Test 5: 3 Concurrent Gods (Zeus, Athena, Apollo) render each other in 3D scene.
   - **Result: 5 passed (41.7s)**

2. **Single-Player / Drowning Lifecycle Suite** (`tests/e2e/game.spec.js`):
   - Test 5: Drowning countdown triggers alert and rescue preserves citizen.
   - Test 6: Drowning countdown expiration leads to death and population decrement.
   - Test 7: Volcano Failure World switch and Paradise recovery.
   - **Result: 7 passed (21.0s)**

---

## 8. CODE STYLE FORMATTING
Ran Laravel Pint on all modified files:
```bash
vendor/bin/pint --dirty --format agent
```
Result: All files cleanly formatted according to Laravel standards.

---

## 9. REMAINING RISKS & MITIGATIONS

1. **Scheduled Background Cleanups**:
   - *Risk*: If a browser crashes or disconnects during drowning countdown, and no other client calls `/drown` or `/rescue`, a citizen could theoretically stay in `'drowning'` state in DB.
   - *Mitigation*: The `paradise:reconcile-counters` command or a light periodic cron can invoke `CitizenLifecycleService::finalizeExpiredDrownings()` if unattended cleanups are desired in the future.
2. **Database Integrity**:
   - `citizens_alive_count` retains its standard `unsignedInteger` definition. Underflow is completely eliminated by authoritative domain semantics and `max(0, $val - 1)` safety guards.
