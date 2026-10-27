<?php

use App\Http\Controllers\GameViewController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\InquiryController;
use Illuminate\Support\Facades\Route;

// Main interactive 3D mini-game shell
Route::get('/', GameViewController::class)->name('game.home');
Route::get('/world', GameViewController::class)->name('game.world');

// Lightweight runtime health check (zero DB coupling)
Route::get('/health', HealthController::class)->name('health');

// Seminar database persistence verification endpoint
Route::post('/contact', [InquiryController::class, 'store'])->name('contact.store');
