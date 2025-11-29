<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\EntrepriseController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\VenueController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\StaffController;
use App\Http\Controllers\Api\ProviderController;
use App\Http\Controllers\Api\EventTaskController;
use App\Http\Controllers\Api\EventAssignmentController;

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

Route::middleware(['jwt', 'role:admin'])->group(function () {
    Route::apiResource('venues', VenueController::class);
    Route::apiResource('events', EventController::class);
    Route::apiResource('staff', StaffController::class);
    // Providers (Prestataires) per event
    Route::get('events/{event}/providers', [ProviderController::class, 'index']);
    Route::post('events/{event}/providers', [ProviderController::class, 'store']);
    Route::patch('providers/{provider}', [ProviderController::class, 'update']);
    Route::delete('providers/{provider}', [ProviderController::class, 'destroy']);
    // Event Tasks (Réaménagement)
    Route::get('events/{event}/tasks', [EventTaskController::class, 'index']);
    Route::post('events/{event}/tasks', [EventTaskController::class, 'store']);
    Route::patch('tasks/{task}', [EventTaskController::class, 'update']);
    Route::delete('tasks/{task}', [EventTaskController::class, 'destroy']);
    // Event-level staff assignments
    Route::get('events/{event}/assignments', [EventAssignmentController::class, 'index']);
    Route::post('events/{event}/assignments', [EventAssignmentController::class, 'store']);
    Route::delete('events/{event}/assignments/{staff}', [EventAssignmentController::class, 'destroy']);
});
