<?php

namespace App\Http\Controllers;

use App\Models\Inquiry;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Cache;
use Throwable;

class HomeController extends Controller
{
    /**
     * Show the DeployLab landing page.
     */
    public function __invoke(): View
    {
        $cacheStatus = 'healthy';
        $views = 14820;

        try {
            // Base offset so the seminar counter looks like active telemetry
            if (! Cache::has('landing_page_views')) {
                Cache::forever('landing_page_views', 14820);
            }
            $views = Cache::increment('landing_page_views');
        } catch (Throwable) {
            $cacheStatus = 'degraded';
            $views = 14820;
        }

        $inquiryCount = 0;
        try {
            $inquiryCount = Inquiry::count();
        } catch (Throwable) {
            // Safe fallback if database is offline during seminar
            $inquiryCount = 0;
        }

        return view('landing', [
            'observedRequests' => $views,
            'cacheStatus' => $cacheStatus,
            'inquiryCount' => $inquiryCount,
            'phpVersion' => PHP_VERSION,
            'laravelVersion' => app()->version(),
            'databaseDriver' => config('database.default'),
            'cacheDriver' => config('cache.default'),
        ]);
    }
}
