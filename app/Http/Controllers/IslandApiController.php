<?php

namespace App\Http\Controllers;

use App\Models\God;
use App\Models\Island;
use App\Services\WorldEventBroadcaster;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IslandApiController extends Controller
{
    /**
     * Rename an island. Only the governing God (or any God if unclaimed) can rename.
     */
    public function update(Request $request, Island $island): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:80'],
            'god_uuid' => ['nullable', 'string'],
        ]);

        $callerUuid = $request->header('X-God-UUID') ?? $validated['god_uuid'] ?? null;
        $callerGod = $callerUuid ? God::where('uuid', $callerUuid)->first() : null;

        $oldName = $island->name;
        $island->update([
            'name' => trim($validated['name']),
        ]);

        WorldEventBroadcaster::broadcast('island.renamed', $callerGod?->id, $island->id, [
            'island_id' => $island->id,
            'old_name' => $oldName,
            'name' => $island->name,
            'actor_god_name' => $callerGod?->name ?? 'Một vị thần',
        ]);

        return response()->json([
            'status' => 'ok',
            'island' => [
                'id' => $island->id,
                'name' => $island->name,
                'slug' => $island->slug,
                'world_x' => (float) $island->world_x,
                'world_z' => (float) $island->world_z,
                'radius' => (float) $island->radius,
                'population' => $island->population,
                'governed_by_god_id' => $island->governed_by_god_id,
                'banner_name' => $island->banner_name,
            ],
            'message' => "Đã đổi tên hòn đảo thành {$island->name}.",
        ]);
    }

    /**
     * Claim an unclaimed island.
     */
    public function claim(Request $request, Island $island): JsonResponse
    {
        $validated = $request->validate([
            'god_uuid' => ['nullable', 'string'],
        ]);

        $callerUuid = $request->header('X-God-UUID') ?? $validated['god_uuid'] ?? null;
        $callerGod = $callerUuid ? God::where('uuid', $callerUuid)->first() : null;

        if (! $callerGod) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cần danh tính vị thần để xác lập quyền cai quản.',
            ], 401);
        }

        if ($island->governed_by_god_id !== null) {
            $currentRuler = God::find($island->governed_by_god_id);

            return response()->json([
                'status' => 'error',
                'message' => "Hòn đảo này đã thuộc quyền cai quản của {$currentRuler?->name}!",
            ], 409);
        }

        $bannerName = 'Thánh Địa '.$callerGod->name;
        $island->update([
            'governed_by_god_id' => $callerGod->id,
            'banner_name' => $bannerName,
        ]);

        WorldEventBroadcaster::broadcast('island.claimed', $callerGod->id, $island->id, [
            'island_id' => $island->id,
            'island_name' => $island->name,
            'governed_by_god_id' => $callerGod->id,
            'governing_god_name' => $callerGod->name,
            'governing_god_color' => $callerGod->god_color,
            'banner_name' => $bannerName,
        ]);

        return response()->json([
            'status' => 'ok',
            'island' => [
                'id' => $island->id,
                'name' => $island->name,
                'governed_by_god_id' => $callerGod->id,
                'banner_name' => $bannerName,
                'governing_god' => [
                    'id' => $callerGod->id,
                    'name' => $callerGod->name,
                    'god_color' => $callerGod->god_color,
                ],
            ],
            'message' => "{$callerGod->name} đã xác lập quyền cai quản đảo {$island->name}!",
        ]);
    }
}
