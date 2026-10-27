<?php

use App\Http\Controllers\CitizenApiController;
use App\Http\Controllers\DatabaseHealthController;
use App\Http\Controllers\GodApiController;
use App\Http\Controllers\IslandApiController;
use App\Http\Controllers\StatusController;
use App\Http\Controllers\WorldApiController;
use Illuminate\Support\Facades\Route;

// System diagnostics
Route::get('/status', StatusController::class)->name('api.status');
Route::get('/health/database', DatabaseHealthController::class)->name('api.health.database');

// World simulation API
Route::get('/world', [WorldApiController::class, 'index'])->name('api.world');
Route::post('/world/reset', [WorldApiController::class, 'reset'])->name('api.world.reset');

// God identity API
Route::post('/gods', [GodApiController::class, 'store'])->name('api.gods.store');
Route::get('/gods/{uuid}', [GodApiController::class, 'show'])->name('api.gods.show');
Route::patch('/gods/{uuid}', [GodApiController::class, 'update'])->name('api.gods.update');

// Island management API
Route::patch('/islands/{island}', [IslandApiController::class, 'update'])->name('api.islands.update');

// Citizen lifecycle API
Route::post('/islands/{island}/citizens', [CitizenApiController::class, 'store'])->name('api.citizens.store');
Route::patch('/citizens/{citizen}', [CitizenApiController::class, 'update'])->name('api.citizens.update');
Route::post('/citizens/{citizen}/move', [CitizenApiController::class, 'move'])->name('api.citizens.move');
Route::post('/citizens/{citizen}/drowning', [CitizenApiController::class, 'drowning'])->name('api.citizens.drowning');
Route::post('/citizens/{citizen}/rescue', [CitizenApiController::class, 'rescue'])->name('api.citizens.rescue');
Route::post('/citizens/{citizen}/drown', [CitizenApiController::class, 'drown'])->name('api.citizens.drown');
