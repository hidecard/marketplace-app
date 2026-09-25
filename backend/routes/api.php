<?php

use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BusinessController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\CouponController;
use App\Http\Controllers\Api\DeliveryFeeController;
use App\Http\Controllers\Api\FavoriteController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ShopController;
use App\Http\Controllers\Api\ShopFollowerController;
use App\Http\Controllers\Api\VerificationController;
use Illuminate\Http\Request;
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
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:3,1');
    Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:3,1');
    Route::post('/send-otp', [AuthController::class, 'sendOtp'])->middleware('throttle:5,1');
    Route::post('/verify-otp', [AuthController::class, 'verifyOtp'])->middleware('throttle:10,1');
    Route::middleware(['auth:sanctum', 'active.user'])->group(function (): void {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/logout-all', [AuthController::class, 'logoutAll']);
        Route::patch('/profile', [AuthController::class, 'updateProfile']);
        Route::post('/change-password', [AuthController::class, 'changePassword']);
        Route::post('/link-phone', [AuthController::class, 'linkPhone'])->middleware('throttle:5,1');
    });
});

Route::middleware(['auth:sanctum', 'active.user'])->get('/user/me', fn (Request $request) => response()->json(['user' => $request->user()]));

Route::middleware(['auth:sanctum', 'active.user'])->group(function (): void {
    Route::get('/conversations', [ChatController::class, 'index']);
    Route::post('/conversations', [ChatController::class, 'store'])->middleware('throttle:10,1');
    Route::get('/conversations/{conversation}/messages', [ChatController::class, 'messages']);
    Route::post('/conversations/{conversation}/messages', [ChatController::class, 'send'])->middleware('throttle:60,1');
    Route::post('/conversations/{conversation}/read', [ChatController::class, 'markRead'])->middleware('throttle:30,1');
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::post('/analytics/track', [AnalyticsController::class, 'track'])->middleware('throttle:100,1');

    // Favorites
    Route::get('/favorites', [FavoriteController::class, 'index']);
    Route::post('/favorites', [FavoriteController::class, 'store'])->middleware('throttle:30,1');
    Route::post('/favorites/check', [FavoriteController::class, 'check'])->middleware('throttle:60,1');
    Route::delete('/favorites/{favorite}', [FavoriteController::class, 'destroy']);

    // Shop Followers
    Route::get('/shops/followed', [ShopFollowerController::class, 'index']);
    Route::post('/shops/follow', [ShopFollowerController::class, 'store'])->middleware('throttle:30,1');
    Route::post('/shops/follow/check', [ShopFollowerController::class, 'check'])->middleware('throttle:60,1');
    Route::delete('/shops/follow/{follower}', [ShopFollowerController::class, 'destroy']);
    Route::get('/shops/{shop}/followers', [ShopFollowerController::class, 'followers']);

    // Addresses
    Route::get('/addresses', [AddressController::class, 'index']);
    Route::post('/addresses', [AddressController::class, 'store'])->middleware('throttle:20,1');
    Route::put('/addresses/{address}', [AddressController::class, 'update']);
    Route::delete('/addresses/{address}', [AddressController::class, 'destroy']);
    Route::post('/addresses/{address}/default', [AddressController::class, 'setDefault']);
});

Route::middleware(['auth:sanctum', 'active.user'])->prefix('shop')->group(function (): void {
    Route::get('/me', [ShopController::class, 'showMine']);
    Route::post('/', [ShopController::class, 'store']);
    Route::patch('/me', [ShopController::class, 'updateMine']);
});

Route::middleware(['auth:sanctum', 'seller.or.admin'])->prefix('seller')->group(function (): void {
    Route::get('/me', fn (Request $request) => response()->json(['user' => $request->user(), 'shop' => $request->user()->shop]));
    Route::get('/verification', [VerificationController::class, 'mine']);
    Route::post('/verification', [VerificationController::class, 'submit'])->middleware('throttle:5,1');
    Route::post('/products', [ProductController::class, 'store'])->middleware('throttle:20,1');
    Route::patch('/products/{product}', [ProductController::class, 'update'])->middleware('throttle:30,1');
    Route::delete('/products/{product}', [ProductController::class, 'destroy'])->middleware('throttle:10,1');
});

Route::middleware(['auth:sanctum', 'verified.seller.or.admin'])->prefix('business')->group(function (): void {
    Route::get('/inventory', [BusinessController::class, 'inventory']);
    Route::post('/inventory/adjust', [BusinessController::class, 'adjustInventory'])->middleware('throttle:30,1');
    Route::post('/pos/sales', [BusinessController::class, 'posSale'])->middleware('throttle:60,1');
    Route::get('/expenses', [BusinessController::class, 'expenses']);
    Route::post('/expenses', [BusinessController::class, 'createExpense'])->middleware('throttle:20,1');
    Route::delete('/expenses/{expense}', [BusinessController::class, 'deleteExpense'])->middleware('throttle:20,1');
    Route::get('/reports/summary', [ReportController::class, 'summary']);
});

Route::middleware(['auth:sanctum', 'active.user'])->group(function (): void {
    Route::get('/orders', [OrderController::class, 'index']);
    Route::post('/orders', [OrderController::class, 'store'])->middleware('throttle:10,1');
    Route::get('/orders/{order}', [OrderController::class, 'show']);
});

Route::middleware(['auth:sanctum', 'role:seller,admin'])->group(function (): void {
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
});

Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function (): void {
    Route::get('/me', fn (Request $request) => response()->json(['user' => $request->user()]));
    Route::get('/verifications', [VerificationController::class, 'index']);
    Route::post('/verifications/{verification}/review', [VerificationController::class, 'review'])->middleware('throttle:30,1');
    Route::get('/reports/summary', [ReportController::class, 'summary']);
    Route::apiResource('/delivery-fees', DeliveryFeeController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::apiResource('/coupons', CouponController::class)->only(['index', 'store', 'update', 'destroy']);
});

Route::middleware(['auth:sanctum', 'active.user'])->prefix('coupons')->group(function (): void {
    Route::post('/validate', [CouponController::class, 'validateCoupon'])->middleware('throttle:10,1');
});
