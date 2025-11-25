<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\AuthController;

Route::post('auth/login', [AuthController::class, 'login']);

Route::middleware(['auth.jwt'])->group(function () {
    Route::apiResource('companies', CompanyController::class);
    Route::get('companies/stream', [CompanyController::class, 'stream']);
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::post('auth/refresh', [AuthController::class, 'refresh']);
    Route::get('auth/me', [AuthController::class, 'me']);
});
