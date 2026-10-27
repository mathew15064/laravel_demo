<?php

use App\Http\Controllers\HealthController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\InquiryController;
use Illuminate\Support\Facades\Route;

Route::get('/', HomeController::class)->name('home');
Route::get('/health', HealthController::class)->name('health');
Route::post('/contact', [InquiryController::class, 'store'])->name('contact.store');
