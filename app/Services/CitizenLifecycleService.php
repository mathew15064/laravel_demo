<?php

namespace App\Services;

use App\Models\Citizen;
use App\Models\God;
use Illuminate\Support\Facades\DB;

class CitizenLifecycleService
{
    /**
     * Atomically and idempotently finalize a citizen's death by drowning.
     *
     * Core Invariants:
     * - Only transitions citizen from 'drowning' to 'dead'.
     * - Exactly once: decrements God.citizens_alive_count (with underflow safety)
     *   and increments God.citizens_drowned_count.
     * - Idempotent: returns status 'already_dead' or 'not_drowning' if citizen is not currently drowning,
     *   never mutates counters twice.
     * - Broadcasts 'citizen.drowned' event exactly once upon successful transition.
     *
     * @return array{success: bool, status: string, citizen: ?Citizen, god: ?God, event: ?array}
     */
    public function finalizeDrowning(int|Citizen $citizen, string $reason = 'timeout'): array
    {
        $citizenId = $citizen instanceof Citizen ? $citizen->id : $citizen;

        return DB::transaction(function () use ($citizenId, $reason) {
            /** @var Citizen|null $c */
            $c = Citizen::lockForUpdate()->find($citizenId);

            if (! $c) {
                return [
                    'success' => false,
                    'status' => 'not_found',
                    'citizen' => null,
                    'god' => null,
                    'event' => null,
                ];
            }

            // Idempotency: If already dead or not drowning, do NOT mutate counters or broadcast again
            if ($c->status !== 'drowning') {
                return [
                    'success' => false,
                    'status' => $c->status === 'dead' ? 'already_dead' : 'not_drowning',
                    'citizen' => $c,
                    'god' => $c->created_by_god_id ? God::find($c->created_by_god_id) : null,
                    'event' => null,
                ];
            }

            // Transition citizen to dead
            $c->update([
                'status' => 'dead',
                'death_reason' => 'drowned',
                'drowning_started_at' => null,
                'drowning_deadline_at' => null,
                'version' => ($c->version ?? 1) + 1,
            ]);

            $god = null;
            if ($c->created_by_god_id) {
                // Lock the God record to prevent race conditions on counters
                $god = God::lockForUpdate()->find($c->created_by_god_id);
                if ($god) {
                    $newAlive = max(0, $god->citizens_alive_count - 1);
                    $god->update([
                        'citizens_alive_count' => $newAlive,
                        'citizens_drowned_count' => $god->citizens_drowned_count + 1,
                    ]);
                }
            }

            // Authoritative single broadcast
            $event = WorldEventBroadcaster::broadcast('citizen.drowned', null, $c->id, [
                'citizen_id' => $c->id,
                'citizen_name' => $c->name,
                'owner_id' => $c->created_by_god_id,
                'reason' => $reason,
                'message' => "🌊 {$c->name} đã chìm vào đại dương vô tận.",
            ]);

            return [
                'success' => true,
                'status' => 'ok',
                'citizen' => $c->fresh(),
                'god' => $god?->fresh(),
                'event' => $event,
            ];
        });
    }

    /**
     * Reconcile God counters against actual database state.
     *
     * Invariants:
     * - citizens_created_count = COUNT(citizens WHERE created_by_god_id = God.id)
     * - citizens_alive_count   = COUNT(citizens WHERE created_by_god_id = God.id AND status IN ('alive','held','drowning'))
     * - citizens_drowned_count = COUNT(citizens WHERE created_by_god_id = God.id AND status = 'dead' AND death_reason = 'drowned')
     *
     * @return array<int, array{id: int, name: string, before: array{created: int, alive: int, drowned: int}, after: array{created: int, alive: int, drowned: int}, drift_detected: bool}>
     */
    public function reconcileGodCounters(?int $godId = null, bool $dryRun = false): array
    {
        $query = God::query();
        if ($godId) {
            $query->where('id', $godId);
        }

        $results = [];

        foreach ($query->get() as $god) {
            $beforeCreated = (int) $god->citizens_created_count;
            $beforeAlive = (int) $god->citizens_alive_count;
            $beforeDrowned = (int) $god->citizens_drowned_count;

            $actualCreated = $god->citizens()->count();
            $actualAlive = $god->citizens()->living()->count();
            $actualDrowned = $god->citizens()->where('status', 'dead')->where('death_reason', 'drowned')->count();

            $drift = ($beforeCreated !== $actualCreated)
                || ($beforeAlive !== $actualAlive)
                || ($beforeDrowned !== $actualDrowned);

            if ($drift && ! $dryRun) {
                $god->update([
                    'citizens_created_count' => $actualCreated,
                    'citizens_alive_count' => $actualAlive,
                    'citizens_drowned_count' => $actualDrowned,
                ]);
            }

            $results[] = [
                'id' => $god->id,
                'name' => $god->name,
                'before' => [
                    'created' => $beforeCreated,
                    'alive' => $beforeAlive,
                    'drowned' => $beforeDrowned,
                ],
                'after' => [
                    'created' => $actualCreated,
                    'alive' => $actualAlive,
                    'drowned' => $actualDrowned,
                ],
                'drift_detected' => $drift,
            ];
        }

        return $results;
    }
}
