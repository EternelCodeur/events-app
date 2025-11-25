<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\CompanyController;

Route::apiResource('companies', CompanyController::class);
