<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MarketplaceNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = MarketplaceNotification::where('user_id', $request->user()->id)->latest()->paginate(min($request->integer('per_page', 30), 100));

        return response()->json(['notifications' => $notifications, 'unread_count' => MarketplaceNotification::where('user_id', $request->user()->id)->whereNull('read_at')->count()]);
    }

    public function markRead(Request $request, MarketplaceNotification $notification): JsonResponse
    {
        abort_unless((int) $notification->user_id === (int) $request->user()->id, 403);
        $notification->update(['read_at' => now()]);

        return response()->json(['notification' => $notification->fresh()]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        MarketplaceNotification::where('user_id', $request->user()->id)->whereNull('read_at')->update(['read_at' => now()]);

        return response()->json(['message' => 'Notifications marked as read']);
    }
}
