<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;

class GameViewController extends Controller
{
    /**
     * Render the lightweight Blade game shell.
     * Crucial: Does NOT perform database queries so that if MySQL/SQLite fails,
     * the game shell still renders in browser and initiates the 3D Volcano Failure World.
     */
    public function __invoke(): View
    {
        return view('game', [
            'appName' => config('app.name', 'Paradise Gods'),
            'drowningTimeoutMs' => (int) env('DROWNING_TIMEOUT_MS', 3000),
        ]);
    }
}
