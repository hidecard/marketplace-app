<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Shop;
use App\Models\ShopFollower;
use App\Support\ProductImages;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ShopController extends Controller
{
    public function show(Request $request, Shop $shop): Response
    {
        abort_unless($shop->verified, 404);
        $shop->load(['owner:id,name,email,phone_number', 'products' => fn ($query) => $query->where('status', 'active')->latest()]);
        $userId = $request->user()?->id;

        return Inertia::render('Shops/Show', [
            'shop' => [
                'id' => $shop->id,
                'name' => $shop->name,
                'slug' => $shop->slug,
                'description' => $shop->description,
                'logo_url' => ProductImages::normalize($shop->logo_url)[0] ?? null,
                'cover_url' => ProductImages::normalize($shop->cover_url)[0] ?? null,
                'phone' => $shop->phone ?: $shop->owner?->phone_number,
                'email' => $shop->owner?->email,
                'address' => $shop->address,
                'facebook_url' => $shop->facebook_url,
                'instagram_url' => $shop->instagram_url,
                'tiktok_url' => $shop->tiktok_url,
                'website_url' => $shop->website_url,
                'verified' => $shop->verified,
                'products_count' => $shop->products->count(),
                'followers_count' => $shop->followers()->count(),
                'products' => $shop->products->map(fn ($product) => [
                    'id' => $product->id,
                    'title' => $product->title,
                    'price' => $product->price,
                    'stock' => $product->stock,
                    'condition' => $product->condition,
                    'images' => ProductImages::normalize($product->images),
                    'created_at' => $product->created_at?->toISOString(),
                ])->values()->all(),
            ],
            'isFollowing' => $userId ? ShopFollower::where('user_id', $userId)->where('shop_id', $shop->id)->exists() : false,
            'authUser' => $userId ? ['id' => $userId] : null,
        ]);
    }

    public function toggleFollow(Request $request, Shop $shop): RedirectResponse
    {
        abort_unless($shop->verified, 404);
        $follower = ShopFollower::where('user_id', $request->user()->id)->where('shop_id', $shop->id)->first();
        $follower ? $follower->delete() : ShopFollower::create(['user_id' => $request->user()->id, 'shop_id' => $shop->id]);
        return back()->with('success', $follower ? 'Shop unfollowed.' : 'Shop followed.');
    }

    public function startChat(Request $request, Shop $shop): RedirectResponse
    {
        abort_unless($shop->verified, 404);
        abort_unless((int) $shop->owner_id !== (int) $request->user()->id, 403);
        [$one, $two] = $request->user()->id < $shop->owner_id ? [$request->user()->id, $shop->owner_id] : [$shop->owner_id, $request->user()->id];
        $conversation = Conversation::firstOrCreate([
            'participant_one_id' => $one,
            'participant_two_id' => $two,
            'shop_id' => $shop->id,
            'product_id' => null,
            'order_id' => null,
        ], ['last_message_at' => now()]);
        return redirect()->route('chats.show', $conversation);
    }
}
