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
Route::post('/gods/{uuid}/bless', [GodApiController::class, 'bless'])->name('api.gods.bless');
Route::post('/gods/{uuid}/greet', [GodApiController::class, 'greet'])->name('api.gods.greet');

// Island management API
Route::patch('/islands/{island}', [IslandApiController::class, 'update'])->name('api.islands.update');
Route::post('/islands/{island}/claim', [IslandApiController::class, 'claim'])->name('api.islands.claim');

// Citizen lifecycle API
Route::post('/islands/{island}/citizens', [CitizenApiController::class, 'store'])->name('api.citizens.store');
Route::patch('/citizens/{citizen}', [CitizenApiController::class, 'update'])->name('api.citizens.update');
Route::post('/citizens/{citizen}/grab', [CitizenApiController::class, 'grab'])->name('api.citizens.grab');
Route::post('/citizens/{citizen}/release', [CitizenApiController::class, 'release'])->name('api.citizens.release');
Route::post('/citizens/{citizen}/move', [CitizenApiController::class, 'move'])->name('api.citizens.move');
Route::post('/citizens/{citizen}/drowning', [CitizenApiController::class, 'drowning'])->name('api.citizens.drowning');
Route::post('/citizens/{citizen}/throw', [CitizenApiController::class, 'throw'])->name('api.citizens.throw');
Route::post('/citizens/{citizen}/rescue', [CitizenApiController::class, 'rescue'])->name('api.citizens.rescue');
Route::post('/citizens/{citizen}/drown', [CitizenApiController::class, 'drown'])->name('api.citizens.drown');
