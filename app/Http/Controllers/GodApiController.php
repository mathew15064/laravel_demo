<?php

namespace App\Http\Controllers;

use App\Models\God;
use App\Services\WorldEventBroadcaster;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GodApiController extends Controller
{
    /**
     * Create a new God identity.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:30'],
            'god_color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ]);

        $god = God::create([
            'name' => trim($validated['name']),
            'god_color' => $validated['god_color'] ?? null,
            'rescued_count' => 0,
            'citizens_created_count' => 0,
            'citizens_alive_count' => 0,
            'citizens_drowned_count' => 0,
            'other_gods_rescued_count' => 0,
            'rescued_by_others_count' => 0,
            'last_seen_at' => now(),
        ]);

        WorldEventBroadcaster::broadcast('god.created', $god->id, $god->id, [
            'god_id' => $god->id,
            'uuid' => $god->uuid,
            'name' => $god->name,
            'god_color' => $god->god_color,
        ]);

        return response()->json([
            'status' => 'ok',
            'god' => [
                'id' => $god->id,
                'uuid' => $god->uuid,
                'name' => $god->name,
                'god_color' => $god->god_color,
                'stats' => $god->stats,
            ],
            'message' => "Chào mừng vị thần {$god->name} đã đến với Quần Đảo Thiên Đường.",
        ], 201);
    }

    /**
     * Fetch God profile & statistics by UUID.
     */
    public function show(string $uuid): JsonResponse
    {
        $god = God::where('uuid', $uuid)->first();

        if (! $god) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không tìm thấy danh tính vị thần.',
            ], 404);
        }

        return response()->json([
            'status' => 'ok',
            'god' => [
                'id' => $god->id,
                'uuid' => $god->uuid,
                'name' => $god->name,
                'god_color' => $god->god_color,
                'stats' => $god->stats,
            ],
        ]);
    }

    /**
     * Update God name or color.
     */
    public function update(Request $request, string $uuid): JsonResponse
    {
        $god = God::where('uuid', $uuid)->first();

        if (! $god) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không tìm thấy danh tính vị thần.',
            ], 404);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'min:2', 'max:30'],
            'god_color' => ['sometimes', 'required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ]);

        $god->update($validated);

        WorldEventBroadcaster::broadcast('god.profile_updated', $god->id, $god->id, [
            'god_id' => $god->id,
            'name' => $god->name,
            'god_color' => $god->god_color,
        ]);

        return response()->json([
            'status' => 'ok',
            'god' => [
                'id' => $god->id,
                'uuid' => $god->uuid,
                'name' => $god->name,
                'god_color' => $god->god_color,
                'stats' => $god->stats,
            ],
            'message' => "Đã cập nhật biểu tượng thần thánh của {$god->name}.",
        ]);
    }

    /**
     * Divine blessing from caller god to target god.
     */
    public function bless(Request $request, string $uuid): JsonResponse
    {
        $targetGod = God::where('uuid', $uuid)->firstOrFail();
        $actorUuid = $request->header('X-God-UUID') ?? $request->input('actor_uuid');
        $actorGod = $actorUuid ? God::where('uuid', $actorUuid)->first() : null;

        $actorName = $actorGod?->name ?? 'Một vị thần ẩn danh';
        $actorColor = $actorGod?->god_color ?? '#f59e0b';

        WorldEventBroadcaster::broadcast('divine.blessing', $actorGod?->id, $targetGod->id, [
            'actor_id' => $actorGod?->id,
            'actor_name' => $actorName,
            'actor_color' => $actorColor,
            'target_id' => $targetGod->id,
            'target_name' => $targetGod->name,
            'message' => "✨ {$actorName} đã ban phước lành thần thánh cho {$targetGod->name}!",
        ]);

        return response()->json([
            'status' => 'ok',
            'message' => "Bạn đã ban phước lành cho {$targetGod->name}.",
        ]);
    }

    /**
     * Divine greeting from caller god to target god.
     */
    public function greet(Request $request, string $uuid): JsonResponse
    {
        $targetGod = God::where('uuid', $uuid)->firstOrFail();
        $actorUuid = $request->header('X-God-UUID') ?? $request->input('actor_uuid');
        $actorGod = $actorUuid ? God::where('uuid', $actorUuid)->first() : null;

        $actorName = $actorGod?->name ?? 'Một vị thần ẩn danh';

        WorldEventBroadcaster::broadcast('divine.emote', $actorGod?->id, $targetGod->id, [
            'type' => 'greet',
            'actor_id' => $actorGod?->id,
            'actor_name' => $actorName,
            'target_id' => $targetGod->id,
            'target_name' => $targetGod->name,
            'message' => "👋 {$actorName} cúi chào vị thần {$targetGod->name}.",
        ]);

        return response()->json([
            'status' => 'ok',
            'message' => "Bạn đã gửi lời chào tới {$targetGod->name}.",
        ]);
    }
}
