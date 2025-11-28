<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\EntrepriseController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\VenueController;

Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::middleware('jwt')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
        Route::post('refresh', [AuthController::class, 'refresh']);
    });
});

Route::middleware(['jwt', 'role:superadmin'])->group(function () {
    Route::apiResource('entreprises', EntrepriseController::class);
});

Route::middleware(['jwt', 'role:superadmin,admin'])->group(function () {
    Route::apiResource('venues', VenueController::class);
});
