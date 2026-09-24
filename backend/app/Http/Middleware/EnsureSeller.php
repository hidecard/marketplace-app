<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSeller extends EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$ignored): Response
    {
        return parent::handle($request, $next, 'seller');
    }
}
