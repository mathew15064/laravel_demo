<?php

namespace App\Http\Controllers;

use App\Models\God;
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
        ]);

        $god = God::create([
            'name' => trim($validated['name']),
            'rescued_count' => 0,
        ]);

        return response()->json([
            'status' => 'ok',
            'god' => [
                'id' => $god->id,
                'uuid' => $god->uuid,
                'name' => $god->name,
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
                'stats' => $god->stats,
            ],
        ]);
    }

    /**
     * Rename God.
     */
    public function update(Request $request, string $uuid): JsonResponse
    {
        $god = God::where('uuid', $uuid)->first();

        if (! $god) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không tìm thấy vị thần.',
            ], 404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:30'],
        ]);

        $god->update(['name' => trim($validated['name'])]);

        return response()->json([
            'status' => 'ok',
            'god' => [
                'id' => $god->id,
                'uuid' => $god->uuid,
                'name' => $god->name,
                'stats' => $god->stats,
            ],
            'message' => "Đã đổi tên vị thần thành {$god->name}.",
        ]);
    }
}
