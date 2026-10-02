<?php

namespace App\Http\Middleware;

use App\Models\MarketplaceNotification;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user()?->only(['id', 'name', 'email', 'role', 'status', 'phone_number', 'phone_verified']),
            ],
            'cart_count' => fn () => collect($request->session()->get('cart', []))->sum(),
            'unread_notifications' => fn () => $request->user() ? MarketplaceNotification::where('user_id', $request->user()->id)->whereNull('read_at')->count() : 0,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'otp_challenge_id' => fn () => $request->session()->get('otp_challenge_id'),
            ],
        ];
    }
}
