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
        if (!$user || !$user->isActive() || !$user->isSeller() || !$shop || !$shop->verified) {
            return response()->json(['message' => 'An active verified seller shop is required.'], 403);
        }
        return $next($request);
    }
}
