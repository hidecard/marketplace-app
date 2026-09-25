<?php

use App\Http\Middleware\EnsureActiveUser;
use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\EnsureSeller;
use App\Http\Middleware\EnsureSellerOrAdmin;
use App\Http\Middleware\EnsureVerifiedSeller;
use App\Http\Middleware\EnsureVerifiedSellerOrAdmin;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [HandleInertiaRequests::class]);
        $middleware->alias([
            'role' => EnsureRole::class,
            'active.user' => EnsureActiveUser::class,
            'seller' => EnsureSeller::class,
            'seller.or.admin' => EnsureSellerOrAdmin::class,
            'verified.seller' => EnsureVerifiedSeller::class,
            'verified.seller.or.admin' => EnsureVerifiedSellerOrAdmin::class,
            'admin' => EnsureAdmin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
