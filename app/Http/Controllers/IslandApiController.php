<?php

namespace App\Http\Controllers;

use App\Models\Island;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IslandApiController extends Controller
{
    /**
     * Rename an island.
     */
    public function update(Request $request, Island $island): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:80'],
        ]);

        $island->update([
            'name' => trim($validated['name']),
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
            ],
            'message' => "Đã đổi tên hòn đảo thành {$island->name}.",
        ]);
    }
}
