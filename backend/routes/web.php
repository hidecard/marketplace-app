<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Web\AuthController;
use App\Http\Controllers\Web\MarketplaceController;
use App\Http\Controllers\Web\RoleController;
use App\Http\Controllers\Web\ProductController;
use App\Http\Controllers\Web\CartController;
use App\Http\Controllers\Web\BusinessController;

Route::get('/', [MarketplaceController::class, 'home'])->name('home');
Route::get('/products', [MarketplaceController::class, 'products'])->name('products.index');
Route::get('/products/{product}', [MarketplaceController::class, 'product'])->name('products.show');
Route::get('/cart', [CartController::class, 'index'])->name('cart.index');
Route::post('/cart/{product}', [CartController::class, 'add'])->name('cart.add');
Route::put('/cart', [CartController::class, 'update'])->name('cart.update');
Route::delete('/cart/{product}', [CartController::class, 'remove'])->name('cart.remove');
Route::middleware('guest')->group(function (): void {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');
    Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
    Route::post('/register', [AuthController::class, 'register']);
});
Route::middleware(['auth', 'active.user'])->group(function (): void {
    Route::get('/dashboard', [MarketplaceController::class, 'dashboard'])->name('dashboard');
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::get('/checkout', [CartController::class, 'checkout'])->name('checkout')->middleware('throttle:30,1');
    Route::post('/checkout', [CartController::class, 'placeOrder'])->name('checkout.place')->middleware('throttle:10,1');
    Route::get('/orders', [CartController::class, 'orders'])->name('orders.index');
    Route::get('/orders/{order}', [CartController::class, 'order'])->name('orders.show');
    Route::middleware('role:user,admin')->group(function (): void {
        Route::get('/seller/shop/create', [RoleController::class, 'createShop'])->name('seller.shop.create');
        Route::post('/seller/shop', [RoleController::class, 'storeShop'])->name('seller.shop.store');
    });
    Route::middleware('seller')->group(function (): void {
        Route::get('/seller/verification', [RoleController::class, 'verification'])->name('seller.verification');
        Route::post('/seller/verification', [RoleController::class, 'submitVerification'])->name('seller.verification.submit');
    });
    Route::middleware('verified.seller')->prefix('seller/products')->group(function (): void {
        Route::get('/', [ProductController::class, 'index'])->name('seller.products.index');
        Route::get('/create', [ProductController::class, 'create'])->name('seller.products.create');
        Route::post('/', [ProductController::class, 'store'])->name('seller.products.store');
        Route::get('/{product}/edit', [ProductController::class, 'edit'])->name('seller.products.edit');
        Route::put('/{product}', [ProductController::class, 'update'])->name('seller.products.update');
        Route::delete('/{product}', [ProductController::class, 'destroy'])->name('seller.products.destroy');
    });
    Route::middleware('verified.seller')->prefix('seller')->group(function (): void {
        Route::get('/inventory', [BusinessController::class, 'inventory'])->name('seller.inventory');
        Route::post('/inventory/{product}/adjust', [BusinessController::class, 'adjust'])->name('seller.inventory.adjust');
        Route::get('/pos', [BusinessController::class, 'pos'])->name('seller.pos');
        Route::post('/pos', [BusinessController::class, 'sale'])->name('seller.pos.sale');
        Route::get('/expenses', [BusinessController::class, 'expenses'])->name('seller.expenses');
        Route::post('/expenses', [BusinessController::class, 'expense'])->name('seller.expenses.store');
        Route::get('/reports', [BusinessController::class, 'reports'])->name('seller.reports');
    });
    Route::middleware('admin')->prefix('admin')->group(function (): void {
        Route::get('/', [MarketplaceController::class, 'dashboard'])->name('admin.dashboard');
        Route::get('/verifications', [RoleController::class, 'adminVerifications'])->name('admin.verifications');
        Route::post('/verifications/{verification}/review', [RoleController::class, 'reviewVerification'])->name('admin.verifications.review');
    });
});
