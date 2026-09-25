<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Web\AuthController;
use App\Http\Controllers\Web\MarketplaceController;
use App\Http\Controllers\Web\RoleController;

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
    Route::middleware('role:user,admin')->group(function (): void {
        Route::get('/seller/shop/create', [RoleController::class, 'createShop'])->name('seller.shop.create');
        Route::post('/seller/shop', [RoleController::class, 'storeShop'])->name('seller.shop.store');
    });
    Route::middleware('seller')->group(function (): void {
        Route::get('/seller/verification', [RoleController::class, 'verification'])->name('seller.verification');
        Route::post('/seller/verification', [RoleController::class, 'submitVerification'])->name('seller.verification.submit');
    });
    Route::middleware('admin')->prefix('admin')->group(function (): void {
        Route::get('/', [MarketplaceController::class, 'dashboard'])->name('admin.dashboard');
        Route::get('/verifications', [RoleController::class, 'adminVerifications'])->name('admin.verifications');
        Route::post('/verifications/{verification}/review', [RoleController::class, 'reviewVerification'])->name('admin.verifications.review');
    });
});
