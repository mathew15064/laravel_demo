<?php

namespace App\Http\Controllers;

use App\Models\Citizen;
use App\Models\God;
use App\Models\Island;
use Database\Seeders\WorldSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
                        'stats' => $godModel->stats,
                    ];
                }
            }

            // World population = alive + drowning citizens
            $worldPopulation = Citizen::whereIn('status', ['alive', 'drowning'])->count();

            // Fetch islands with current population and coordinates
            $islands = Island::withCount([
                'citizens as population' => function ($q) {
                    $q->whereIn('status', ['alive', 'drowning']);
                },
            ])->get();

            // Fetch active citizens (alive or drowning)
            $citizens = Citizen::with(['god:id,name', 'island:id,name'])
                ->whereIn('status', ['alive', 'drowning'])
                ->get()
                ->map(function (Citizen $c) {
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
                        'position' => [
                            'x' => (float) $c->position_x,
                            'y' => (float) $c->position_y,
                            'z' => (float) $c->position_z,
                        ],
                    ];
                });

            return response()->json([
                'status' => 'ok',
                'god' => $god,
                'world_population' => $worldPopulation,
                'islands' => $islands,
                'citizens' => $citizens,
            ], 200);
        } catch (Throwable) {
            return response()->json([
                'status' => 'error',
                'code' => 'DATABASE_UNAVAILABLE',
                'message' => 'Cánh cổng dữ liệu đã đóng. Thiên Đường không thể tải trạng thái thế giới.',
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
            DB::table('citizens')->truncate();
            DB::table('islands')->truncate();
            DB::table('gods')->truncate();
            Schema::enableForeignKeyConstraints();

            (new WorldSeeder())->run();

            return response()->json([
                'status' => 'ok',
                'message' => 'Thế giới Thiên Đường đã được khôi phục trạng thái ban đầu.',
            ]);
        } catch (Throwable) {
            return response()->json([
                'status' => 'error',
                'code' => 'DATABASE_UNAVAILABLE',
            ], 503);
        }
    }
}
