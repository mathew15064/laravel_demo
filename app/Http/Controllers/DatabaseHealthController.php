<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

class DatabaseHealthController extends Controller
{
    /**
     * Dedicated lightweight database health check for live seminar and game recovery.
     * Never exposes credentials, SQL exceptions, or stack traces.
     */
    public function __invoke(): JsonResponse
    {
        try {
            DB::connection()->getPdo();
            DB::select('SELECT 1 as ping');

            return response()->json([
                'status' => 'ok',
            ], 200);
        } catch (Throwable) {
            return response()->json([
                'status' => 'error',
                'code' => 'DATABASE_UNAVAILABLE',
            ], 503);
        }
    }
}
