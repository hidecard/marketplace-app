<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureVerifiedSeller
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $shop = $user?->shop;
        if (! $user || ! $user->isActive() || ! $user->isSeller() || ! $shop || ! $shop->verified) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'An active verified seller shop is required.'], 403);
            }

            return redirect()->route($user?->isSeller() ? 'seller.verification' : 'dashboard')->with('error', 'A verified seller shop is required for this page.');
        }

        return $next($request);
    }
}
