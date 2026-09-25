<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use App\Http\Controllers\Web\AuthController;
use App\Http\Controllers\Web\MarketplaceController;
use App\Http\Controllers\Web\RoleController;
use App\Http\Controllers\Web\ProductController;
use App\Http\Controllers\Web\CartController;
use App\Http\Controllers\Web\BusinessController;
use App\Http\Controllers\Web\AdminController;
use App\Http\Controllers\Web\ParityController;

Route::get('/', [MarketplaceController::class, 'home'])->name('home');
Route::get('/products', [MarketplaceController::class, 'products'])->name('products.index');
Route::get('/products/{product}', [MarketplaceController::class, 'product'])->name('products.show');
Route::get('/categories', fn (ParityController $controller, Request $request) => $controller->screen($request, 'user', 'categories'))->name('categories.index');
Route::get('/shops', fn (ParityController $controller, Request $request) => $controller->screen($request, 'user', 'shops'))->name('shops.index');
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
    Route::get('/profile/complete', [AuthController::class, 'showProfileCompletion'])->name('profile.complete');
    Route::post('/profile/phone/request', [AuthController::class, 'requestPhoneOtp'])->name('profile.phone.request')->middleware('throttle:5,1');
    Route::post('/profile/phone/verify', [AuthController::class, 'verifyPhoneOtp'])->name('profile.phone.verify')->middleware('throttle:10,1');
    Route::post('/profile/complete', [AuthController::class, 'completeProfile'])->name('profile.complete.store');
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::get('/checkout', [CartController::class, 'checkout'])->name('checkout')->middleware('throttle:30,1');
    Route::post('/checkout', [CartController::class, 'placeOrder'])->name('checkout.place')->middleware('throttle:10,1');
    Route::get('/orders', [CartController::class, 'orders'])->name('orders.index');
    Route::get('/orders/{order}', [CartController::class, 'order'])->name('orders.show');
    Route::get('/favorites', fn (ParityController $controller, Request $request) => $controller->screen($request, 'user', 'favorites'))->name('favorites.index');
    Route::get('/notifications', fn (ParityController $controller, Request $request) => $controller->screen($request, 'user', 'notifications'))->name('notifications.index');
    Route::get('/chats', fn (ParityController $controller, Request $request) => $controller->screen($request, 'user', 'chats'))->name('chats.index');
    Route::get('/offers', fn (ParityController $controller, Request $request) => $controller->screen($request, 'user', 'offers'))->name('offers.index');
    Route::get('/profile', fn (ParityController $controller, Request $request) => $controller->screen($request, 'user', 'profile'))->name('profile.index');
    Route::get('/addresses', fn (ParityController $controller, Request $request) => $controller->screen($request, 'user', 'addresses'))->name('addresses.index');
    Route::get('/help', fn (ParityController $controller, Request $request) => $controller->screen($request, 'user', 'help'))->name('help.index');
    Route::post('/favorites/{product}/toggle', [ParityController::class, 'toggleFavorite'])->name('favorites.toggle');
    Route::post('/addresses', [ParityController::class, 'storeAddress'])->name('addresses.store');
    Route::delete('/addresses/{address}', [ParityController::class, 'deleteAddress'])->name('addresses.destroy');
    Route::post('/notifications/read-all', [ParityController::class, 'markNotificationsRead'])->name('notifications.read-all');
    Route::post('/offers', [ParityController::class, 'storeOffer'])->name('offers.store');
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
        Route::get('/', fn (ParityController $controller, Request $request) => $controller->screen($request, 'seller', 'dashboard'))->name('seller.dashboard');
        Route::get('/inventory', [BusinessController::class, 'inventory'])->name('seller.inventory');
        Route::post('/inventory/{product}/adjust', [BusinessController::class, 'adjust'])->name('seller.inventory.adjust');
        Route::get('/pos', [BusinessController::class, 'pos'])->name('seller.pos');
        Route::post('/pos', [BusinessController::class, 'sale'])->name('seller.pos.sale');
        Route::get('/expenses', [BusinessController::class, 'expenses'])->name('seller.expenses');
        Route::post('/expenses', [BusinessController::class, 'expense'])->name('seller.expenses.store');
        Route::get('/reports', [BusinessController::class, 'reports'])->name('seller.reports');
        Route::get('/orders', fn (ParityController $controller, Request $request) => $controller->screen($request, 'seller', 'orders'))->name('seller.orders');
        Route::get('/customers', fn (ParityController $controller, Request $request) => $controller->screen($request, 'seller', 'customers'))->name('seller.customers');
        Route::get('/analytics', fn (ParityController $controller, Request $request) => $controller->screen($request, 'seller', 'analytics'))->name('seller.analytics');
        Route::get('/settings', fn (ParityController $controller, Request $request) => $controller->screen($request, 'seller', 'settings'))->name('seller.settings');
        Route::get('/categories', fn (ParityController $controller, Request $request) => $controller->screen($request, 'seller', 'categories'))->name('seller.categories');
    });
    Route::middleware('admin')->prefix('admin')->group(function (): void {
        Route::get('/', [AdminController::class, 'dashboard'])->name('admin.dashboard');
        Route::get('/verifications', [RoleController::class, 'adminVerifications'])->name('admin.verifications');
        Route::post('/verifications/{verification}/review', [RoleController::class, 'reviewVerification'])->name('admin.verifications.review');
        Route::get('/users', fn (ParityController $controller, Request $request) => $controller->screen($request, 'admin', 'users'))->name('admin.users');
        Route::get('/shops', fn (ParityController $controller, Request $request) => $controller->screen($request, 'admin', 'shops'))->name('admin.shops');
        Route::get('/products', fn (ParityController $controller, Request $request) => $controller->screen($request, 'admin', 'products'))->name('admin.products');
        Route::get('/orders', fn (ParityController $controller, Request $request) => $controller->screen($request, 'admin', 'orders'))->name('admin.orders');
        Route::get('/reports', fn (ParityController $controller, Request $request) => $controller->screen($request, 'admin', 'reports'))->name('admin.reports');
        Route::get('/categories', fn (ParityController $controller, Request $request) => $controller->screen($request, 'admin', 'categories'))->name('admin.categories');
        Route::get('/banners', fn (ParityController $controller, Request $request) => $controller->screen($request, 'admin', 'banners'))->name('admin.banners');
        Route::get('/settings', fn (ParityController $controller, Request $request) => $controller->screen($request, 'admin', 'settings'))->name('admin.settings');
    });
});
