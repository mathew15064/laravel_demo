<?php

namespace App\Services;

use App\Models\WorldState;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;
use Throwable;

class WorldEventBroadcaster
{
    public const CHANNEL = 'paradise.events';

    public const VERSION_KEY = 'paradise:world_version';

    /**
     * Get or increment atomic world version.
     */
    public static function nextVersion(): int
    {
        try {
            $val = Redis::get(self::VERSION_KEY);
            if ($val === null || (int) $val < 1000) {
                $dbVersion = WorldState::value('world_version') ?? 1000;
                $initial = max(1000, (int) $dbVersion);
                Redis::set(self::VERSION_KEY, $initial);
            }

            $version = (int) Redis::incr(self::VERSION_KEY);

            // Persist periodically or opportunistically
            if ($version % 5 === 0) {
                WorldState::where('id', 1)->update(['world_version' => $version]);
            }

            return $version;
        } catch (Throwable $e) {
            Log::warning('Redis version increment failed, falling back to DB: '.$e->getMessage());
            $state = WorldState::firstOrCreate(['id' => 1], ['world_version' => 1000]);
            $state->increment('world_version');

            return (int) $state->fresh()->world_version;
        }
    }

    /**
     * Get current world version without incrementing.
     */
    public static function currentVersion(): int
    {
        try {
            $val = Redis::get(self::VERSION_KEY);
            if ($val !== null && $val !== false && (int) $val >= 1000) {
                return (int) $val;
            }
        } catch (Throwable) {
        }

        return (int) (WorldState::value('world_version') ?? 1000);
    }

    /**
     * Broadcast an authoritative world event.
     */
    public static function broadcast(
        string $eventType,
        ?int $actorGodId = null,
        ?int $entityId = null,
        array $payload = []
    ): array {
        $version = self::nextVersion();
        $occurredAt = (int) round(microtime(true) * 1000);

        $event = [
            'event_id' => (string) Str::uuid(),
            'world_version' => $version,
            'event_type' => $eventType,
            'actor_god_id' => $actorGodId,
            'entity_id' => $entityId,
            'occurred_at' => $occurredAt,
            'payload' => $payload,
        ];

        // 1. Direct delivery to Node realtime-server via local HTTP POST (super-fast < 1ms, zero Redis dependency)
        try {
            $wsPort = config('services.realtime.port') ?? env('WEBSOCKET_PORT', 8089);
            Http::timeout(0.4)->post("http://127.0.0.1:{$wsPort}/broadcast", $event);
        } catch (Throwable $e) {
            // Node server may be starting or will receive via Redis
        }

        // 2. Publish to Redis channel if Redis is active
        try {
            Redis::publish(self::CHANNEL, json_encode($event));
        } catch (Throwable $e) {
            // Redis is optional per environment architecture
        }

        return $event;
    }
}
