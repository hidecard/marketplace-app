<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Web\AuthController;
use App\Http\Controllers\Web\MarketplaceController;

Route::get('/', [MarketplaceController::class, 'home'])->name('home');
Route::get('/products', [MarketplaceController::class, 'products'])->name('products.index');
Route::middleware('guest')->group(function (): void {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');
    Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
    Route::post('/register', [AuthController::class, 'register']);
});
Route::middleware(['auth', 'active.user'])->group(function (): void {
    Route::get('/dashboard', [MarketplaceController::class, 'dashboard'])->name('dashboard');
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
});
