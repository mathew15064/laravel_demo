<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Throwable;

class StatusController extends Controller
{
    /**
     * Inspect application, database, and cache dependencies independently.
     * Safe for public/client diagnostics: reveals no credentials, paths, or traces.
     */
    public function __invoke(): JsonResponse
    {
        $appStatus = 'ok';
        $dbStatus = 'ok';
        $cacheStatus = 'ok';

        $dbLatencyMs = null;
        $cacheLatencyMs = null;

        // 1. Check Database independently
        try {
            $dbStart = microtime(true);
            DB::connection()->getPdo();
            // Simple query that works on both SQLite and MySQL
            DB::select('SELECT 1 as ping');
            $dbLatencyMs = round((microtime(true) - $dbStart) * 1000, 2);
        } catch (Throwable) {
            $dbStatus = 'error';
        }

        // 2. Check Cache independently
        try {
            $cacheStart = microtime(true);
            $cacheKey = '_deploylab_ping_' . now()->timestamp;
            Cache::put($cacheKey, 'ok', 5);
            $val = Cache::get($cacheKey);
            Cache::forget($cacheKey);

            if ($val === 'ok') {
                $cacheLatencyMs = round((microtime(true) - $cacheStart) * 1000, 2);
            } else {
                $cacheStatus = 'error';
            }
        } catch (Throwable) {
            $cacheStatus = 'error';
        }

        $allOk = ($appStatus === 'ok' && $dbStatus === 'ok' && $cacheStatus === 'ok');

        return response()->json([
            'application' => $appStatus,
            'database' => $dbStatus,
            'cache' => $cacheStatus,
            'details' => [
                'environment' => config('app.env'),
                'database_driver' => config('database.default'),
                'database_latency_ms' => $dbLatencyMs,
                'cache_store' => config('cache.default'),
                'cache_latency_ms' => $cacheLatencyMs,
                'timestamp' => now()->toIso8601String(),
            ],
        ], $allOk ? 200 : 503);
    }
}
