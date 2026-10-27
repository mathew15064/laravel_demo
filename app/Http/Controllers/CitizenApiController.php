<?php

namespace App\Http\Controllers;

use App\Models\Citizen;
use App\Models\God;
use App\Models\Island;
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

        $god = null;
        if (! empty($validated['god_uuid'])) {
            $god = God::where('uuid', $validated['god_uuid'])->first();
        }

        if (! $god) {
            $god = God::first() ?? God::create(['name' => 'Thần Vô Danh']);
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

        $citizen->load(['god:id,name', 'island:id,name']);

        return response()->json([
            'status' => 'ok',
            'citizen' => [
                'id' => $citizen->id,
                'name' => $citizen->name,
                'status' => $citizen->status,
                'skin_tone' => $citizen->skin_tone,
                'clothing_color' => $citizen->clothing_color,
                'island_id' => $citizen->island_id,
                'island_name' => $citizen->island?->name,
                'created_by_god_id' => $citizen->created_by_god_id,
                'creator_name' => $citizen->god?->name,
                'position' => [
                    'x' => (float) $citizen->position_x,
                    'y' => (float) $citizen->position_y,
                    'z' => (float) $citizen->position_z,
                ],
            ],
            'island_population' => $island->fresh()->population,
            'world_population' => Citizen::whereIn('status', ['alive', 'drowning'])->count(),
            'god_stats' => $god->fresh()->stats,
            'message' => "{$god->name} đã ban sự sống cho {$citizen->name} trên {$island->name}.",
        ], 201);
    }

    /**
     * Rename or update citizen attributes.
     */
    public function update(Request $request, Citizen $citizen): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'min:1', 'max:40'],
            'position_x' => ['sometimes', 'numeric'],
            'position_y' => ['sometimes', 'numeric'],
            'position_z' => ['sometimes', 'numeric'],
        ]);

        $citizen->update($validated);

        return response()->json([
            'status' => 'ok',
            'citizen' => $citizen->fresh(),
            'message' => "Đã cập nhật cư dân {$citizen->name}.",
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
        $citizen->update([
            'status' => 'drowning',
        ]);

        return response()->json([
            'status' => 'ok',
            'citizen' => $citizen->fresh(),
            'message' => "⚠ {$citizen->name} đang chết đuối trong đại dương!",
        ]);
    }

    /**
     * God rescues drowning citizen.
     * Citizen returns to alive status; creator god rescued_count increments.
     * Population remains unchanged.
     */
    public function rescue(Citizen $citizen): JsonResponse
    {
        DB::transaction(function () use ($citizen) {
            $citizen->update([
                'status' => 'alive',
            ]);

            if ($citizen->created_by_god_id) {
                $god = God::find($citizen->created_by_god_id);
                if ($god) {
                    $god->increment('rescued_count');
                }
            }
        });

        $citizen->load('god');

        return response()->json([
            'status' => 'ok',
            'citizen' => $citizen->fresh(),
            'god_stats' => $citizen->god?->stats,
            'world_population' => Citizen::whereIn('status', ['alive', 'drowning'])->count(),
            'message' => "Đã cứu {$citizen->name} khỏi biển sâu!",
        ]);
    }

    /**
     * Citizen drowned (countdown expired).
     * Citizen status becomes 'dead', death_reason = 'drowned'.
     * Island population and world population decrement by 1.
     */
    public function drown(Citizen $citizen): JsonResponse
    {
        $islandId = $citizen->island_id;

        $citizen->update([
            'status' => 'dead',
            'death_reason' => 'drowned',
        ]);

        $island = $islandId ? Island::find($islandId) : null;
        $god = $citizen->created_by_god_id ? God::find($citizen->created_by_god_id) : null;

        return response()->json([
            'status' => 'ok',
            'citizen' => $citizen->fresh(),
            'island_population' => $island ? $island->population : 0,
            'world_population' => Citizen::whereIn('status', ['alive', 'drowning'])->count(),
            'god_stats' => $god?->stats,
            'message' => "{$citizen->name} đã chìm vào giấc ngủ vĩnh hằng dưới đáy biển.",
        ]);
    }
}
