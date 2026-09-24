<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json([
    'status' => 'ok',
    'service' => 'marketplace-api',
    'database' => config('database.default'),
]));

Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{product}', [ProductController::class, 'show']);

Route::prefix('auth')->group(function (): void {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');
    Route::middleware(['auth:sanctum', 'active.user'])->group(function (): void {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/logout-all', [AuthController::class, 'logoutAll']);
        Route::patch('/profile', [AuthController::class, 'updateProfile']);
        Route::post('/change-password', [AuthController::class, 'changePassword']);
    });
});

Route::middleware(['auth:sanctum', 'active.user'])->get('/user/me', fn (\Illuminate\Http\Request $request) => response()->json(['user' => $request->user()]));

Route::middleware(['auth:sanctum', 'seller'])->prefix('seller')->group(function (): void {
    Route::get('/me', fn (\Illuminate\Http\Request $request) => response()->json(['user' => $request->user(), 'shop' => $request->user()->shop]));
    Route::post('/products', [ProductController::class, 'store']);
    Route::patch('/products/{product}', [ProductController::class, 'update']);
    Route::delete('/products/{product}', [ProductController::class, 'destroy']);
});

Route::middleware(['auth:sanctum', 'active.user'])->group(function (): void {
    Route::get('/orders', [OrderController::class, 'index']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
});

Route::middleware(['auth:sanctum', 'role:seller,admin'])->group(function (): void {
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
});

Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function (): void {
    Route::get('/me', fn (\Illuminate\Http\Request $request) => response()->json(['user' => $request->user()]));
});
