<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

class HealthController extends Controller
{
    /**
     * Lightweight health check verifying PHP + Laravel runtime.
     * Does NOT touch database or cache to isolate web server & runtime health.
     */
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'application' => config('app.name', 'DeployLab'),
            'runtime' => 'PHP ' . PHP_VERSION,
            'timestamp' => now()->toIso8601String(),
        ]);
    }
}
