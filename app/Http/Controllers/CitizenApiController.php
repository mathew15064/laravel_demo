<?php

namespace App\Http\Controllers;

use App\Models\Citizen;
use App\Models\God;
use App\Models\Island;
use App\Models\Rescue;
use App\Services\WorldEventBroadcaster;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CitizenApiController extends Controller
{
    /**
     * Create a new citizen on an island.
     */
    public function store(Request $request, Island $island): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:1', 'max:40'],
            'god_uuid' => ['nullable', 'string'],
        ]);

        $callerUuid = $request->header('X-God-UUID') ?? $validated['god_uuid'] ?? null;
        $god = null;
        if ($callerUuid) {
            $god = God::where('uuid', $callerUuid)->first();
        }

        if (! $god) {
            $god = God::first() ?? God::create(['name' => 'Thần Vô Danh', 'god_color' => '#8b5cf6']);
        }

        // Place within island radius
        $angle = mt_rand(0, 360) * (M_PI / 180);
        $dist = mt_rand(10, 65) / 100 * ($island->radius * 0.75);
        $posX = $island->world_x + cos($angle) * $dist;
        $posZ = $island->world_z + sin($angle) * $dist;

        $citizen = Citizen::create([
            'island_id' => $island->id,
            'created_by_god_id' => $god->id,
            'name' => trim($validated['name']),
            'status' => 'alive',
            'skin_tone' => Citizen::randomSkinTone(),
            'clothing_color' => Citizen::randomClothingColor(),
            'position_x' => $posX,
            'position_y' => 0.0,
            'position_z' => $posZ,
            'last_island_id' => $island->id,
        ]);

        $god->increment('citizens_created_count');
        $god->increment('citizens_alive_count');

        $citizenData = [
            'id' => $citizen->id,
            'name' => $citizen->name,
            'status' => $citizen->status,
            'skin_tone' => $citizen->skin_tone,
            'clothing_color' => $citizen->clothing_color,
            'island_id' => $citizen->island_id,
            'island_name' => $island->name,
            'created_by_god_id' => $citizen->created_by_god_id,
            'creator_name' => $god->name,
            'creator_color' => $god->god_color,
            'position' => [
                'x' => (float) $citizen->position_x,
                'y' => (float) $citizen->position_y,
                'z' => (float) $citizen->position_z,
            ],
        ];

        WorldEventBroadcaster::broadcast('citizen.created', $god->id, $citizen->id, [
            'citizen' => $citizenData,
            'island_id' => $island->id,
            'island_name' => $island->name,
            'message' => "✨ {$god->name} đã ban sự sống cho {$citizen->name} trên {$island->name}.",
        ]);

        return response()->json([
            'status' => 'ok',
            'citizen' => $citizenData,
            'island_population' => $island->fresh()->population,
            'world_population' => Citizen::whereIn('status', ['alive', 'drowning'])->count(),
            'god_stats' => $god->fresh()->stats,
            'message' => "{$god->name} đã ban sự sống cho {$citizen->name} trên {$island->name}.",
        ], 201);
    }

    /**
     * Rename citizen. Creator only.
     */
    public function update(Request $request, Citizen $citizen): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'min:1', 'max:40'],
            'god_uuid' => ['nullable', 'string'],
        ]);

        $callerUuid = $request->header('X-God-UUID') ?? $validated['god_uuid'] ?? null;
        $callerGod = $callerUuid ? God::where('uuid', $callerUuid)->first() : null;

        if ($callerGod && $citizen->created_by_god_id !== $callerGod->id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Chỉ vị thần tạo ra mới có quyền đổi tên cư dân này!',
            ], 403);
        }

        $oldName = $citizen->name;
        $citizen->update([
            'name' => trim($validated['name']),
        ]);

        WorldEventBroadcaster::broadcast('citizen.renamed', $callerGod?->id, $citizen->id, [
            'citizen_id' => $citizen->id,
            'old_name' => $oldName,
            'name' => $citizen->name,
        ]);

        return response()->json([
            'status' => 'ok',
            'citizen' => $citizen->fresh(),
            'message' => "Đã đổi tên cư dân thành {$citizen->name}.",
        ]);
    }

    /**
     * Citizen moves/lands on a different island after being thrown.
     */
    public function move(Request $request, Citizen $citizen): JsonResponse
    {
        $validated = $request->validate([
            'target_island_id' => ['required', 'exists:islands,id'],
            'position_x' => ['nullable', 'numeric'],
            'position_z' => ['nullable', 'numeric'],
        ]);

        $oldIslandId = $citizen->island_id;
        $targetIsland = Island::findOrFail($validated['target_island_id']);

        $citizen->update([
            'last_island_id' => $oldIslandId,
            'island_id' => $targetIsland->id,
            'status' => 'alive',
            'position_x' => $validated['position_x'] ?? $targetIsland->world_x,
            'position_y' => 0.0,
            'position_z' => $validated['position_z'] ?? $targetIsland->world_z,
            'drowning_started_at' => null,
            'drowning_deadline_at' => null,
        ]);

        $oldIsland = $oldIslandId ? Island::find($oldIslandId) : null;

        return response()->json([
            'status' => 'ok',
            'citizen' => $citizen->fresh()->load('island:id,name'),
            'old_island_population' => $oldIsland ? $oldIsland->population : null,
            'new_island_population' => $targetIsland->population,
            'world_population' => Citizen::whereIn('status', ['alive', 'drowning'])->count(),
            'message' => "{$citizen->name} đã chuyển sang {$targetIsland->name}.",
        ]);
    }

    /**
     * Citizen fell into water and is now drowning.
     * Population remains unchanged per requirement 12 & 29.
     */
    public function drowning(Citizen $citizen): JsonResponse
    {
        $nowMs = (int) round(microtime(true) * 1000);
        $citizen->update([
            'status' => 'drowning',
            'drowning_started_at' => $nowMs,
            'drowning_deadline_at' => $nowMs + 10000,
        ]);

        return response()->json([
            'status' => 'ok',
            'citizen' => $citizen->fresh(),
            'message' => "⚠ {$citizen->name} đang chết đuối trong đại dương!",
        ]);
    }

    /**
     * Authoritative ballistic throw of citizen.
     */
    public function throw(Request $request, Citizen $citizen): JsonResponse
    {
        $validated = $request->validate([
            'god_uuid' => ['nullable', 'string'],
            'start_position' => ['required', 'array'],
            'start_position.x' => ['required', 'numeric'],
            'start_position.y' => ['required', 'numeric'],
            'start_position.z' => ['required', 'numeric'],
            'velocity' => ['required', 'array'],
            'velocity.x' => ['required', 'numeric'],
            'velocity.y' => ['required', 'numeric'],
            'velocity.z' => ['required', 'numeric'],
        ]);

        $callerUuid = $request->header('X-God-UUID') ?? $validated['god_uuid'] ?? null;
        $callerGod = $callerUuid ? God::where('uuid', $callerUuid)->first() : null;

        // Check ownership: only creator can throw citizen
        if ($callerGod && $citizen->created_by_god_id !== $callerGod->id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Chỉ vị thần tạo ra mới có quyền ném cư dân này!',
            ], 403);
        }

        if (! $callerGod) {
            $callerGod = God::find($citizen->created_by_god_id) ?? God::first();
        }

        $x0 = (float) $validated['start_position']['x'];
        $y0 = (float) $validated['start_position']['y'];
        $z0 = (float) $validated['start_position']['z'];
        $vx = (float) $validated['velocity']['x'];
        $vy = (float) $validated['velocity']['y'];
        $vz = (float) $validated['velocity']['z'];

        // Physics calculation: gravity = 18.0 m/s^2 (game arcade gravity)
        $g = 18.0;
        $disc = ($vy * $vy) + (2 * $g * max(0.1, $y0));
        $flightTime = ($vy + sqrt(max(0.0, $disc))) / $g;
        if ($flightTime <= 0.1) {
            $flightTime = 1.0;
        }

        $landX = $x0 + ($vx * $flightTime);
        $landZ = $z0 + ($vz * $flightTime);

        // Determine landing outcome against all islands
        $islands = Island::all();
        $targetIsland = null;
        foreach ($islands as $island) {
            $dx = $landX - $island->world_x;
            $dz = $landZ - $island->world_z;
            $distSq = ($dx * $dx) + ($dz * $dz);
            if ($distSq <= (($island->radius * 0.95) ** 2)) {
                $targetIsland = $island;
                break;
            }
        }

        $nowMs = (int) round(microtime(true) * 1000);
        $oldIslandId = $citizen->island_id;

        if ($targetIsland) {
            // Landed safely on an island
            $citizen->update([
                'last_island_id' => $oldIslandId ?? $targetIsland->id,
                'island_id' => $targetIsland->id,
                'status' => 'alive',
                'position_x' => $landX,
                'position_y' => 0.0,
                'position_z' => $landZ,
                'thrown_by_god_id' => $callerGod->id,
                'drowning_started_at' => null,
                'drowning_deadline_at' => null,
            ]);

            $outcome = 'landed_island';
            $message = "🎯 {$callerGod->name} đã ném {$citizen->name} hạ cánh an toàn xuống {$targetIsland->name}!";
        } else {
            // Landed into ocean -> DROWNING!
            $drowningDeadline = $nowMs + 10000; // 10 seconds authoritative window
            $newDrowningVersion = $citizen->drowning_version + 1;

            $citizen->update([
                'last_island_id' => $oldIslandId,
                'island_id' => null,
                'status' => 'drowning',
                'position_x' => $landX,
                'position_y' => -0.2,
                'position_z' => $landZ,
                'thrown_by_god_id' => $callerGod->id,
                'drowning_started_at' => $nowMs,
                'drowning_deadline_at' => $drowningDeadline,
                'drowning_version' => $newDrowningVersion,
            ]);

            $outcome = 'landed_ocean';
            $message = "🌊 Ối! {$citizen->name} rơi xuống biển sâu và đang chết đuối! Cần cứu trợ gấp!";
        }

        $eventPayload = [
            'citizen_id' => $citizen->id,
            'citizen_name' => $citizen->name,
            'actor_god_id' => $callerGod->id,
            'actor_god_name' => $callerGod->name,
            'start_position' => ['x' => $x0, 'y' => $y0, 'z' => $z0],
            'velocity' => ['x' => $vx, 'y' => $vy, 'z' => $vz],
            'flight_time' => $flightTime,
            'landing_position' => ['x' => $landX, 'y' => 0.0, 'z' => $landZ],
            'outcome' => $outcome,
            'target_island_id' => $targetIsland?->id,
            'target_island_name' => $targetIsland?->name,
            'drowning_started_at' => $citizen->drowning_started_at,
            'drowning_deadline_at' => $citizen->drowning_deadline_at,
            'drowning_version' => $citizen->drowning_version,
            'message' => $message,
        ];

        WorldEventBroadcaster::broadcast('citizen.thrown', $callerGod->id, $citizen->id, $eventPayload);

        return response()->json([
            'status' => 'ok',
            'outcome' => $outcome,
            'citizen' => $citizen->fresh(),
            'target_island' => $targetIsland,
            'flight_time' => $flightTime,
            'landing_position' => ['x' => $landX, 'y' => 0.0, 'z' => $landZ],
            'drowning_deadline_at' => $citizen->drowning_deadline_at,
            'message' => $message,
        ]);
    }

    /**
     * Cooperative atomic rescue of a drowning citizen.
     */
    public function rescue(Request $request, Citizen $citizen): JsonResponse
    {
        $validated = $request->validate([
            'god_uuid' => ['nullable', 'string'],
        ]);

        $callerUuid = $request->header('X-God-UUID') ?? $validated['god_uuid'] ?? null;
        $callerGod = null;
        if ($callerUuid) {
            $callerGod = God::where('uuid', $callerUuid)->first();
        }

        if (! $callerGod) {
            $callerGod = God::first();
        }

        $nowMs = (int) round(microtime(true) * 1000);

        return DB::transaction(function () use ($citizen, $callerGod, $nowMs) {
            /** @var Citizen $c */
            $c = Citizen::lockForUpdate()->find($citizen->id);

            if (! $c) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Cư dân không tồn tại.',
                ], 404);
            }

            // Race condition: already rescued
            if ($c->status === 'alive') {
                return response()->json([
                    'status' => 'already_rescued',
                    'citizen' => $c->fresh()->load('god:id,uuid,name,god_color', 'island:id,name'),
                    'message' => "Cư dân {$c->name} đã được một vị thần cứu sống an toàn trước đó!",
                ], 200);
            }

            // Already dead
            if ($c->status === 'dead') {
                return response()->json([
                    'status' => 'already_dead',
                    'citizen' => $c,
                    'message' => "Đã quá muộn, {$c->name} đã chìm vào giấc ngủ vĩnh hằng dưới biển sâu.",
                ], 410);
            }

            // Check if deadline expired in database
            if ($c->drowning_deadline_at && $nowMs > $c->drowning_deadline_at) {
                $c->update([
                    'status' => 'dead',
                    'death_reason' => 'drowned',
                    'drowning_started_at' => null,
                    'drowning_deadline_at' => null,
                ]);

                if ($c->created_by_god_id) {
                    God::where('id', $c->created_by_god_id)->decrement('citizens_alive_count');
                    God::where('id', $c->created_by_god_id)->increment('citizens_drowned_count');
                }

                WorldEventBroadcaster::broadcast('citizen.drowned', null, $c->id, [
                    'citizen_id' => $c->id,
                    'citizen_name' => $c->name,
                    'owner_id' => $c->created_by_god_id,
                    'reason' => 'timeout',
                    'message' => "🌊 {$c->name} đã chìm sâu dưới đáy đại dương.",
                ]);

                return response()->json([
                    'status' => 'already_dead',
                    'message' => "Thời gian cứu hộ đã hết, {$c->name} đã chìm xuống đáy biển.",
                ], 410);
            }

            // SUCCESSFUL RESCUE!
            $targetIsland = Island::find($c->last_island_id) ?? Island::first();
            $angle = mt_rand(0, 360) * (M_PI / 180);
            $dist = mt_rand(10, 50) / 100 * ($targetIsland->radius * 0.6);
            $safeX = $targetIsland->world_x + cos($angle) * $dist;
            $safeZ = $targetIsland->world_z + sin($angle) * $dist;

            $c->update([
                'status' => 'alive',
                'island_id' => $targetIsland->id,
                'position_x' => $safeX,
                'position_y' => 0.0,
                'position_z' => $safeZ,
                'last_rescued_by_god_id' => $callerGod->id,
                'drowning_started_at' => null,
                'drowning_deadline_at' => null,
            ]);

            // Increment savior stats
            $callerGod->increment('rescued_count');
            if ($c->created_by_god_id && $callerGod->id !== $c->created_by_god_id) {
                $callerGod->increment('other_gods_rescued_count');
                God::where('id', $c->created_by_god_id)->increment('rescued_by_others_count');
            }

            // Record in audit rescues table
            Rescue::create([
                'citizen_id' => $c->id,
                'rescued_by_god_id' => $callerGod->id,
                'citizen_owner_god_id' => $c->created_by_god_id,
                'island_id' => $targetIsland->id,
                'rescued_at' => now(),
            ]);

            $ownerGod = $c->created_by_god_id ? God::find($c->created_by_god_id) : null;

            WorldEventBroadcaster::broadcast('citizen.rescued', $callerGod->id, $c->id, [
                'citizen_id' => $c->id,
                'citizen_name' => $c->name,
                'savior_id' => $callerGod->id,
                'savior_name' => $callerGod->name,
                'savior_color' => $callerGod->god_color,
                'owner_id' => $c->created_by_god_id,
                'owner_name' => $ownerGod?->name,
                'target_island_id' => $targetIsland->id,
                'target_island_name' => $targetIsland->name,
                'safe_position' => ['x' => $safeX, 'y' => 0.0, 'z' => $safeZ],
                'message' => "⚡ Vị thần {$callerGod->name} đã phóng tia thần lực cứu sống {$c->name} thoát khỏi biển sâu đưa về {$targetIsland->name}!",
            ]);

            return response()->json([
                'status' => 'ok',
                'citizen' => $c->fresh()->load('god:id,uuid,name,god_color', 'island:id,name'),
                'savior' => [
                    'id' => $callerGod->id,
                    'name' => $callerGod->name,
                    'god_color' => $callerGod->god_color,
                    'stats' => $callerGod->fresh()->stats,
                ],
                'safe_position' => ['x' => $safeX, 'y' => 0.0, 'z' => $safeZ],
                'target_island_id' => $targetIsland->id,
                'message' => "Đã cứu {$c->name} thoát khỏi biển sâu đưa về {$targetIsland->name}!",
            ]);
        });
    }

    /**
     * Authoritative drown finalization (deadline passed).
     */
    public function drown(Citizen $citizen): JsonResponse
    {
        $nowMs = (int) round(microtime(true) * 1000);

        return DB::transaction(function () use ($citizen, $nowMs) {
            /** @var Citizen $c */
            $c = Citizen::lockForUpdate()->find($citizen->id);

            if (! $c) {
                return response()->json(['status' => 'error', 'message' => 'Cư dân không tồn tại'], 404);
            }

            if ($c->status !== 'drowning') {
                return response()->json([
                    'status' => 'not_drowning',
                    'citizen' => $c,
                    'message' => "Cư dân hiện không ở trạng thái chết đuối.",
                ]);
            }

            // Only drown if deadline has actually passed (or force called)
            if ($c->drowning_deadline_at && $nowMs < $c->drowning_deadline_at) {
                return response()->json([
                    'status' => 'still_drowning',
                    'remaining_ms' => $c->drowning_deadline_at - $nowMs,
                    'message' => "Thời gian chết đuối chưa hết.",
                ], 422);
            }

            $c->update([
                'status' => 'dead',
                'death_reason' => 'drowned',
                'drowning_started_at' => null,
                'drowning_deadline_at' => null,
            ]);

            if ($c->created_by_god_id) {
                God::where('id', $c->created_by_god_id)->decrement('citizens_alive_count');
                God::where('id', $c->created_by_god_id)->increment('citizens_drowned_count');
            }

            WorldEventBroadcaster::broadcast('citizen.drowned', null, $c->id, [
                'citizen_id' => $c->id,
                'citizen_name' => $c->name,
                'owner_id' => $c->created_by_god_id,
                'message' => "🌊 {$c->name} đã chìm vào đại dương vô tận.",
            ]);

            return response()->json([
                'status' => 'ok',
                'citizen' => $c->fresh(),
                'world_population' => Citizen::whereIn('status', ['alive', 'drowning'])->count(),
                'message' => "{$c->name} đã chìm vào giấc ngủ vĩnh hằng dưới đáy biển.",
            ]);
        });
    }
}
