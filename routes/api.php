<?php

use App\Http\Controllers\StatusController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Independent dependency and runtime diagnostic inspection for DeployLab.
|
*/

Route::get('/status', StatusController::class)->name('api.status');
