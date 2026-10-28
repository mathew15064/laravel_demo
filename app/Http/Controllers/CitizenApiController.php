<?php

namespace App\Http\Controllers;

use App\Models\Citizen;
use App\Models\God;
use App\Models\Island;
use App\Models\Rescue;
use App\Services\CitizenLifecycleService;
use App\Services\WorldEventBroadcaster;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CitizenApiController extends Controller
{
    public function __construct(
        public CitizenLifecycleService $lifecycleService
    ) {}

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

        $worldPop = Citizen::living()->count();

        WorldEventBroadcaster::broadcast('citizen.created', $god->id, $citizen->id, [
            'citizen' => $citizenData,
            'actor_god_id' => $god->id,
            'created_by_god_id' => $citizen->created_by_god_id,
            'island_id' => $island->id,
            'island_name' => $island->name,
            'world_population' => $worldPop,
            'version' => $citizen->version ?? 1,
            'message' => "✨ {$god->name} đã ban sự sống cho {$citizen->name} trên {$island->name}.",
        ]);

        return response()->json([
            'status' => 'ok',
            'citizen' => $citizenData,
            'island_population' => $island->fresh()->population,
            'world_population' => $worldPop,
            'god_stats' => $god->fresh()->stats,
            'message' => "{$god->name} đã ban sự sống cho {$citizen->name} trên {$island->name}.",
        ], 201);
    }

    /**
     * Rename citizen. Available to any God in cooperative shared world.
     */
    public function update(Request $request, Citizen $citizen): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'min:1', 'max:40'],
            'god_uuid' => ['nullable', 'string'],
        ]);

        $callerUuid = $request->header('X-God-UUID') ?? $validated['god_uuid'] ?? null;
        $callerGod = $callerUuid ? God::where('uuid', $callerUuid)->first() : null;

        $oldName = $citizen->name;
        $citizen->update([
            'name' => trim($validated['name']),
            'version' => ($citizen->version ?? 1) + 1,
        ]);

        WorldEventBroadcaster::broadcast('citizen.renamed', $callerGod?->id, $citizen->id, [
            'citizen_id' => $citizen->id,
            'old_name' => $oldName,
            'name' => $citizen->name,
            'actor_god_name' => $callerGod?->name,
            'version' => $citizen->version,
        ]);

        return response()->json([
            'status' => 'ok',
            'citizen' => $citizen->fresh(),
            'message' => "Đã đổi tên cư dân thành {$citizen->name}.",
        ]);
    }

    /**
     * Authoritative grab / pick-up of a citizen.
     */
    public function grab(Request $request, Citizen $citizen): JsonResponse
    {
        $validated = $request->validate([
            'god_uuid' => ['nullable', 'string'],
        ]);

        $callerUuid = $request->header('X-God-UUID') ?? $validated['god_uuid'] ?? null;
        $callerGod = $callerUuid ? God::where('uuid', $callerUuid)->first() : null;
        if (! $callerGod) {
            $callerGod = God::first() ?? God::create(['name' => 'Thần Vô Danh', 'god_color' => '#8b5cf6']);
        }

        return DB::transaction(function () use ($citizen, $callerGod) {
            /** @var Citizen $c */
            $c = Citizen::lockForUpdate()->find($citizen->id);
            if (! $c) {
                return response()->json(['status' => 'error', 'message' => 'Cư dân không tồn tại.'], 404);
            }

            if ($c->status === 'dead') {
                return response()->json(['status' => 'error', 'message' => 'Cư dân đã qua đời.'], 400);
            }

            // Concurrent grab race condition check:
            if ($c->status === 'held' && $c->held_by_god_id && $c->held_by_god_id !== $callerGod->id) {
                $holdingGod = God::find($c->held_by_god_id);

                return response()->json([
                    'status' => 'already_held',
                    'held_by_god_id' => $c->held_by_god_id,
                    'held_by_god_name' => $holdingGod?->name ?? 'Một vị thần',
                    'message' => 'Cư dân đang được một vị thần khác giữ.',
                ], 409);
            }

            $c->status = 'held';
            $c->held_by_god_id = $callerGod->id;
            $c->version = ($c->version ?? 1) + 1;
            $c->save();

            WorldEventBroadcaster::broadcast('citizen.grabbed', $callerGod->id, $c->id, [
                'citizen_id' => $c->id,
                'citizen_name' => $c->name,
                'actor_god_id' => $callerGod->id,
                'actor_god_name' => $callerGod->name,
                'created_by_god_id' => $c->created_by_god_id,
                'held_by_god_id' => $callerGod->id,
                'god_id' => $callerGod->id,
                'god_name' => $callerGod->name,
                'god_color' => $callerGod->god_color,
                'version' => $c->version,
                'message' => "✋ Thần {$callerGod->name} đang nhấc {$c->name} lên không trung.",
            ]);

            return response()->json([
                'status' => 'ok',
                'citizen' => $c->fresh(),
                'god' => [
                    'id' => $callerGod->id,
                    'name' => $callerGod->name,
                    'god_color' => $callerGod->god_color,
                ],
            ]);
        });
    }

    /**
     * Authoritative release / drop of a citizen.
     */
    public function release(Request $request, Citizen $citizen): JsonResponse
    {
        $validated = $request->validate([
            'god_uuid' => ['nullable', 'string'],
            'position' => ['nullable', 'array'],
            'position.x' => ['nullable', 'numeric'],
            'position.y' => ['nullable', 'numeric'],
            'position.z' => ['nullable', 'numeric'],
            'island_id' => ['nullable', 'exists:islands,id'],
        ]);

        $callerUuid = $request->header('X-God-UUID') ?? $validated['god_uuid'] ?? null;
        $callerGod = $callerUuid ? God::where('uuid', $callerUuid)->first() : null;

        return DB::transaction(function () use ($citizen, $callerGod, $validated) {
            /** @var Citizen $c */
            $c = Citizen::lockForUpdate()->find($citizen->id);
            if (! $c) {
                return response()->json(['status' => 'error', 'message' => 'Cư dân không tồn tại.'], 404);
            }

            $c->status = 'alive';
            $c->held_by_god_id = null;
            if (isset($validated['position']['x'])) {
                $c->position_x = (float) $validated['position']['x'];
                $c->position_y = (float) ($validated['position']['y'] ?? 0.0);
                $c->position_z = (float) $validated['position']['z'];
            }
            if (! empty($validated['island_id'])) {
                $c->island_id = $validated['island_id'];
                $c->last_island_id = $validated['island_id'];
            }
            $c->version = ($c->version ?? 1) + 1;
            $c->save();

            WorldEventBroadcaster::broadcast('citizen.released', $callerGod?->id, $c->id, [
                'citizen_id' => $c->id,
                'citizen_name' => $c->name,
                'actor_god_id' => $callerGod?->id,
                'actor_god_name' => $callerGod?->name,
                'created_by_god_id' => $c->created_by_god_id,
                'position' => [
                    'x' => $c->position_x,
                    'y' => $c->position_y,
                    'z' => $c->position_z,
                ],
                'island_id' => $c->island_id,
                'version' => $c->version,
                'message' => "Cư dân {$c->name} đã được đặt xuống bình an.",
            ]);

            return response()->json([
                'status' => 'ok',
                'citizen' => $c->fresh(),
            ]);
        });
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
            'version' => ($citizen->version ?? 1) + 1,
        ]);

        $oldIsland = $oldIslandId ? Island::find($oldIslandId) : null;

        WorldEventBroadcaster::broadcast('citizen.moved_island', null, $citizen->id, [
            'citizen_id' => $citizen->id,
            'citizen_name' => $citizen->name,
            'island_id' => $targetIsland->id,
            'island_name' => $targetIsland->name,
            'position' => [
                'x' => (float) $citizen->position_x,
                'y' => 0.0,
                'z' => (float) $citizen->position_z,
            ],
            'version' => $citizen->version,
            'message' => "{$citizen->name} đã chuyển sang {$targetIsland->name}.",
        ]);

        return response()->json([
            'status' => 'ok',
            'citizen' => $citizen->fresh()->load('island:id,name'),
            'old_island_population' => $oldIsland ? $oldIsland->population : null,
            'new_island_population' => $targetIsland->population,
            'world_population' => Citizen::living()->count(),
            'message' => "{$citizen->name} đã chuyển sang {$targetIsland->name}.",
        ]);
    }

    /**
     * Citizen fell into water and is now drowning.
     * Population remains unchanged per requirement 12 & 29.
     */
    public function drowning(Request $request, Citizen $citizen): JsonResponse
    {
        $timeoutMs = (int) ($request->input('timeout_ms') ?? env('DROWNING_TIMEOUT_MS', 3000));
        $nowMs = (int) round(microtime(true) * 1000);
        $citizen->update([
            'status' => 'drowning',
            'drowning_started_at' => $nowMs,
            'drowning_deadline_at' => $nowMs + $timeoutMs,
            'drowning_version' => ($citizen->drowning_version ?? 0) + 1,
            'version' => ($citizen->version ?? 1) + 1,
        ]);

        WorldEventBroadcaster::broadcast('citizen.drowning_started', null, $citizen->id, [
            'citizen_id' => $citizen->id,
            'citizen_name' => $citizen->name,
            'actor_god_id' => null,
            'created_by_god_id' => $citizen->created_by_god_id,
            'status' => 'drowning',
            'drowning_started_at' => $nowMs,
            'drowning_deadline_at' => $nowMs + $timeoutMs,
            'drowning_version' => $citizen->drowning_version,
            'position' => [
                'x' => (float) $citizen->position_x,
                'y' => (float) $citizen->position_y,
                'z' => (float) $citizen->position_z,
            ],
            'version' => $citizen->version,
            'message' => "🌊 Ối! {$citizen->name} rơi xuống biển và đang chết đuối! Cần cứu trợ gấp!",
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

        if (! $callerGod) {
            $callerGod = God::find($citizen->created_by_god_id) ?? God::first() ?? God::create(['name' => 'Thần Vô Danh', 'god_color' => '#8b5cf6']);
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
                'held_by_god_id' => null,
                'thrown_by_god_id' => $callerGod->id,
                'drowning_started_at' => null,
                'drowning_deadline_at' => null,
                'version' => ($citizen->version ?? 1) + 1,
            ]);

            $outcome = 'landed_island';
            $message = "🎯 {$callerGod->name} đã ném {$citizen->name} hạ cánh an toàn xuống {$targetIsland->name}!";
        } else {
            // Landed into ocean -> DROWNING!
            $timeoutMs = (int) env('DROWNING_TIMEOUT_MS', 3000);
            $drowningDeadline = $nowMs + (int) round($flightTime * 1000) + $timeoutMs;
            $newDrowningVersion = $citizen->drowning_version + 1;

            $citizen->update([
                'last_island_id' => $oldIslandId,
                'island_id' => null,
                'status' => 'drowning',
                'position_x' => $landX,
                'position_y' => -0.2,
                'position_z' => $landZ,
                'held_by_god_id' => null,
                'thrown_by_god_id' => $callerGod->id,
                'drowning_started_at' => $nowMs,
                'drowning_deadline_at' => $drowningDeadline,
                'drowning_version' => $newDrowningVersion,
                'version' => ($citizen->version ?? 1) + 1,
            ]);

            $outcome = 'landed_ocean';
            $message = "🌊 Ối! {$citizen->name} rơi xuống biển sâu và đang chết đuối! Cần cứu trợ gấp!";
        }

        $eventPayload = [
            'citizen_id' => $citizen->id,
            'citizen_name' => $citizen->name,
            'actor_god_id' => $callerGod->id,
            'actor_god_name' => $callerGod->name,
            'created_by_god_id' => $citizen->created_by_god_id,
            'version' => $citizen->version,
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
                $finalized = $this->lifecycleService->finalizeDrowning($c->id, 'timeout');

                return response()->json([
                    'status' => 'already_dead',
                    'citizen' => $finalized['citizen'] ?? $c,
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
                'held_by_god_id' => null,
                'drowning_started_at' => null,
                'drowning_deadline_at' => null,
                'version' => ($c->version ?? 1) + 1,
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
                'actor_god_id' => $callerGod->id,
                'actor_god_name' => $callerGod->name,
                'savior_id' => $callerGod->id,
                'savior_name' => $callerGod->name,
                'savior_color' => $callerGod->god_color,
                'created_by_god_id' => $c->created_by_god_id,
                'owner_id' => $c->created_by_god_id,
                'owner_name' => $ownerGod?->name,
                'target_island_id' => $targetIsland->id,
                'target_island_name' => $targetIsland->name,
                'safe_position' => ['x' => $safeX, 'y' => 0.0, 'z' => $safeZ],
                'version' => $c->version,
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

        /** @var Citizen|null $c */
        $c = Citizen::find($citizen->id);

        if (! $c) {
            return response()->json(['status' => 'error', 'message' => 'Cư dân không tồn tại'], 404);
        }

        // Idempotent safe handling if already dead
        if ($c->status === 'dead') {
            return response()->json([
                'status' => 'already_dead',
                'citizen' => $c,
                'world_population' => Citizen::living()->count(),
                'message' => "Cư dân {$c->name} đã qua đời trước đó.",
            ], 200);
        }

        if ($c->status !== 'drowning') {
            return response()->json([
                'status' => 'not_drowning',
                'citizen' => $c,
                'message' => 'Cư dân hiện không ở trạng thái chết đuối.',
            ], 422);
        }

        // Only drown if deadline has actually passed (or force called with 150ms latency tolerance)
        if ($c->drowning_deadline_at && $nowMs < ($c->drowning_deadline_at - 150)) {
            return response()->json([
                'status' => 'still_drowning',
                'remaining_ms' => $c->drowning_deadline_at - $nowMs,
                'message' => 'Thời gian chết đuối chưa hết.',
            ], 422);
        }

        $result = $this->lifecycleService->finalizeDrowning($c->id, 'timeout');

        if (! $result['success']) {
            return response()->json([
                'status' => $result['status'],
                'citizen' => $result['citizen'] ?? $c,
                'world_population' => Citizen::living()->count(),
                'message' => 'Cư dân đã được xử lý trạng thái trước đó.',
            ], 200);
        }

        return response()->json([
            'status' => 'ok',
            'citizen' => $result['citizen'],
            'world_population' => Citizen::living()->count(),
            'message' => "{$result['citizen']->name} đã chìm vào giấc ngủ vĩnh hằng dưới đáy biển.",
        ]);
    }
}
