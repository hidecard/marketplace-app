<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin' || $user->status !== 'active') {
            return response()->json(['message' => 'Active admin access is required.'], 403);
        }
        return $next($request);
    }
}
