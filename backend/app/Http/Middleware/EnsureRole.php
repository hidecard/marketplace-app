<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! $user->isActive()) {
            return $this->deny($request, 'An active authenticated account is required.');
        }

        if (! in_array($user->role, $roles, true)) {
            return $this->deny($request, 'You do not have permission to access this resource.', [
                'required_roles' => $roles,
                'current_role' => $user->role,
            ]);
        }

        return $next($request);
    }

    protected function deny(Request $request, string $message, array $extra = []): Response
    {
        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json(['message' => $message, ...$extra], 403);
        }

        return redirect()->route('dashboard')->with('error', $message);
    }
}
