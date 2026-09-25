<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shop;
use App\Models\ShopFollower;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ShopFollowerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $followers = ShopFollower::where('user_id', $request->user()->id)
            ->with('shop:id,name,slug,logo_url,verified')
            ->latest()
            ->paginate(min($request->integer('per_page', 20), 100));

        return response()->json($followers);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'shop_id' => ['required', 'integer', 'exists:shops,id'],
        ]);

        $shop = Shop::findOrFail($data['shop_id']);

        $follower = DB::transaction(function () use ($request, $data) {
            $existing = ShopFollower::where('user_id', $request->user()->id)
                ->where('shop_id', $data['shop_id'])
                ->first();
            if ($existing) {
                return $existing;
            }

            return ShopFollower::create([
                'user_id' => $request->user()->id,
                'shop_id' => $data['shop_id'],
            ]);
        });

        return response()->json(['follower' => $follower->load('shop:id,name,slug,logo_url,verified')], 201);
    }

    public function destroy(Request $request, ShopFollower $follower): JsonResponse
    {
        if ((int) $follower->user_id !== (int) $request->user()->id) {
            abort(403, 'You can only unfollow shops you follow.');
        }

        $follower->delete();

        return response()->json(['message' => 'Unfollowed shop']);
    }

    public function check(Request $request): JsonResponse
    {
        $data = $request->validate([
            'shop_ids' => ['required', 'array', 'max:100'],
            'shop_ids.*' => ['integer', 'exists:shops,id'],
        ]);

        $followers = ShopFollower::where('user_id', $request->user()->id)
            ->whereIn('shop_id', $data['shop_ids'])
            ->pluck('shop_id')
            ->toArray();

        return response()->json(['followed_shop_ids' => $followers]);
    }

    public function followers(Request $request, Shop $shop): JsonResponse
    {
        $followers = ShopFollower::where('shop_id', $shop->id)
            ->with('user:id,name')
            ->latest()
            ->paginate(min($request->integer('per_page', 50), 100));

        return response()->json($followers);
    }
}
