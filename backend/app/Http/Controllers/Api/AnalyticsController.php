<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AnalyticsController extends Controller
{
    /**
     * Track analytics events with rate limiting
     */
    public function track(Request $request): JsonResponse
    {
        $data = $request->validate([
            'event_name' => ['required', 'string', 'max:100'],
            'event_data' => ['sometimes', 'array'],
            'timestamp' => ['sometimes', 'date'],
        ]);

        // Define allowed event types for security
        $allowedEvents = [
            'product_view',
            'search',
            'category_view',
            'shop_view',
            'checkout_started',
            'order_placed',
            'chat_started',
            'favorite_added',
            'offer_created',
            'review_submitted',
        ];

        $eventName = $data['event_name'];
        if (!in_array($eventName, $allowedEvents)) {
            return response()->json(['message' => 'Invalid event type'], 400);
        }

        // Log the analytics event (in production, this would go to a proper analytics service)
        Log::info('Analytics event', [
            'event' => $eventName,
            'user_id' => $request->user()?->id,
            'data' => $data['event_data'] ?? [],
            'timestamp' => $data['timestamp'] ?? now(),
        ]);

        return response()->json(['message' => 'Event tracked']);
    }
}
