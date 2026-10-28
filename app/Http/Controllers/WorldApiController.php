<?php

namespace App\Http\Controllers;

use App\Models\Citizen;
use App\Models\God;
use App\Models\Island;
use App\Services\WorldEventBroadcaster;
use Database\Seeders\WorldSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Schema;
use Throwable;

class WorldApiController extends Controller
{
    /**
     * Fetch complete world simulation state.
     * Safely catches database unavailability to trigger Volcano Failure World on client.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            DB::connection()->getPdo();

            // Locate active God by UUID if provided in request
            $godUuid = $request->header('X-God-UUID') ?? $request->query('god_uuid');
            $god = null;
            if ($godUuid) {
                $godModel = God::where('uuid', $godUuid)->first();
                if ($godModel) {
                    $god = [
                        'id' => $godModel->id,
                        'uuid' => $godModel->uuid,
                        'name' => $godModel->name,
                        'god_color' => $godModel->god_color,
                        'stats' => $godModel->stats,
                    ];
                }
            }

            $worldVersion = WorldEventBroadcaster::currentVersion();

            // Fetch online gods from Redis presence
            $onlineGods = [];
            try {
                $onlineIds = Redis::smembers('paradise:online_gods');
                if (! empty($onlineIds)) {
                    $onlineGodModels = God::whereIn('id', $onlineIds)->get();
                    foreach ($onlineGodModels as $og) {
                        $posJson = Redis::get("paradise:pos:{$og->id}");
                        $pos = $posJson ? json_decode($posJson, true) : ['x' => 0, 'y' => 15, 'z' => 0];
                        $onlineGods[] = [
                            'id' => $og->id,
                            'uuid' => $og->uuid,
                            'name' => $og->name,
                            'god_color' => $og->god_color,
                            'position' => $pos,
                            'stats' => $og->stats,
                        ];
                    }
                }
            } catch (Throwable) {
                // Redis non-fatal for world snapshot
            }

            // World population = alive + drowning + held citizens
            $worldPopulation = Citizen::living()->count();

            // Fetch islands with current population
            $islands = Island::withCount([
                'citizens as population' => function ($q) {
                    $q->living();
                },
            ])->get()->map(function (Island $isl) {
                return [
                    'id' => $isl->id,
                    'name' => $isl->name,
                    'slug' => $isl->slug,
                    'world_x' => (float) $isl->world_x,
                    'world_z' => (float) $isl->world_z,
                    'radius' => (float) $isl->radius,
                    'type' => $isl->type,
                    'seed' => (int) $isl->seed,
                    'population' => (int) $isl->population,
                ];
            });

            // Fetch active citizens (alive, drowning, or held)
            $nowMs = (int) round(microtime(true) * 1000);
            $citizens = Citizen::with(['god:id,uuid,name,god_color', 'heldByGod:id,name,god_color', 'island:id,name'])
                ->living()
                ->get()
                ->map(function (Citizen $c) use ($nowMs) {
                    $remainingDrowningSec = 0;
                    if ($c->status === 'drowning' && $c->drowning_deadline_at) {
                        $remainingDrowningSec = max(0, (int) ceil(($c->drowning_deadline_at - $nowMs) / 1000));
                    }

                    return [
                        'id' => $c->id,
                        'name' => $c->name,
                        'status' => $c->status,
                        'skin_tone' => $c->skin_tone,
                        'clothing_color' => $c->clothing_color,
                        'island_id' => $c->island_id,
                        'island_name' => $c->island?->name,
                        'created_by_god_id' => $c->created_by_god_id,
                        'creator_name' => $c->god?->name ?? 'Vô danh',
                        'creator_color' => $c->god?->god_color ?? '#8b5cf6',
                        'held_by_god_id' => $c->held_by_god_id,
                        'held_by_god_name' => $c->heldByGod?->name,
                        'held_by_god_color' => $c->heldByGod?->god_color,
                        'version' => $c->version ?? 1,
                        'position' => [
                            'x' => (float) $c->position_x,
                            'y' => (float) $c->position_y,
                            'z' => (float) $c->position_z,
                        ],
                        'drowning_started_at' => $c->drowning_started_at,
                        'drowning_deadline_at' => $c->drowning_deadline_at,
                        'drowning_version' => $c->drowning_version,
                        'remaining_drowning_sec' => $remainingDrowningSec,
                    ];
                });

            // Leaderboard: Top Rescuers
            $topRescuers = God::orderByDesc('rescued_count')
                ->limit(5)
                ->get(['id', 'uuid', 'name', 'god_color', 'rescued_count', 'other_gods_rescued_count']);

            return response()->json([
                'status' => 'ok',
                'world_version' => $worldVersion,
                'god' => $god,
                'world_population' => $worldPopulation,
                'online_gods' => $onlineGods,
                'top_rescuers' => $topRescuers,
                'islands' => $islands,
                'citizens' => $citizens,
            ], 200);
        } catch (Throwable $e) {
            return response()->json([
                'status' => 'error',
                'code' => 'DATABASE_UNAVAILABLE',
                'message' => 'Cánh cổng dữ liệu đã đóng. Thiên Đường không thể tải trạng thái thế giới: '.$e->getMessage(),
            ], 503);
        }
    }

    /**
     * Reset world to initial deterministic state.
     */
    public function reset(): JsonResponse
    {
        try {
            Schema::disableForeignKeyConstraints();
            DB::table('rescues')->truncate();
            DB::table('citizens')->truncate();
            DB::table('islands')->truncate();
            DB::table('gods')->truncate();
            DB::table('world_states')->truncate();
            Schema::enableForeignKeyConstraints();

            // Re-seed world
            $seeder = new WorldSeeder;
            $seeder->run();

            // Reset Redis version and online presence
            try {
                Redis::set(WorldEventBroadcaster::VERSION_KEY, 1000);
                Redis::del('paradise:online_gods');
                $presenceKeys = Redis::keys('paradise:presence:*');
                if (! empty($presenceKeys)) {
                    Redis::del($presenceKeys);
                }
                $posKeys = Redis::keys('paradise:pos:*');
                if (! empty($posKeys)) {
                    Redis::del($posKeys);
                }
            } catch (Throwable) {
            }

            WorldEventBroadcaster::broadcast('world.reset', null, null, [
                'message' => 'Thế giới đã được tái khởi nguyên.',
            ]);

            return response()->json([
                'status' => 'ok',
                'world_version' => 1000,
                'message' => 'Quần đảo Thiên Đường đã được tái khởi nguyên thành công.',
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'status' => 'error',
                'code' => 'DATABASE_RESET_FAILED',
                'message' => 'Tái khởi nguyên thất bại: '.$e->getMessage(),
            ], 500);
        }
    }
}
