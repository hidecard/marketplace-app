<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\Category;
use App\Models\Favorite;
use App\Models\MarketplaceNotification;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function categories(Request $request, ?string $category = null): Response
    {
        $categories = Category::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'name', 'slug', 'icon_url']);
        $selected = $category ? $categories->firstWhere('slug', $category) : $categories->first();
        $query = Product::query()->where('status', 'active')->with('shop:id,name,slug,verified');
        if ($selected) $query->where('category_id', $selected->id);
        if ($request->filled('q')) $query->where('title', 'like', '%'.$request->string('q').'%');
        return Inertia::render('User/Categories', ['categories' => $categories, 'selected' => $selected, 'products' => $query->latest()->limit(60)->get(['id', 'title', 'price', 'stock', 'images', 'condition', 'shop_id']), 'query' => $request->string('q')->toString()]);
    }

    public function favorites(Request $request): Response
    {
        $favorites = Favorite::query()->where('user_id', $request->user()->id)->latest()->with('product.shop:id,name,slug,verified')->limit(100)->get(['id', 'product_id'])->map(fn (Favorite $favorite) => ['favorite_id' => $favorite->id, 'product' => $favorite->product])->filter(fn ($item) => $item['product'])->values();
        return Inertia::render('User/Favorites', ['favorites' => $favorites]);
    }

    public function notifications(Request $request): Response
    {
        return Inertia::render('User/Notifications', ['notifications' => MarketplaceNotification::query()->where('user_id', $request->user()->id)->latest()->limit(80)->get(['id', 'type', 'title', 'body', 'read_at', 'created_at'])]);
    }

    public function markNotificationRead(Request $request, MarketplaceNotification $notification): RedirectResponse
    {
        abort_unless((int) $notification->user_id === (int) $request->user()->id, 403);
        $notification->update(['read_at' => now()]);
        return back();
    }

    public function addresses(Request $request): Response
    {
        return Inertia::render('User/Addresses', ['addresses' => Address::query()->where('user_id', $request->user()->id)->latest()->get()]);
    }

    public function updateAddress(Request $request, Address $address): RedirectResponse
    {
        abort_unless((int) $address->user_id === (int) $request->user()->id, 403);
        $data = $request->validate(['label' => ['required', 'string', 'max:80'], 'recipient_name' => ['required', 'string', 'max:120'], 'phone' => ['required', 'string', 'max:30'], 'address' => ['required', 'string', 'max:1000'], 'city' => ['nullable', 'string', 'max:120'], 'region' => ['nullable', 'string', 'max:120']]);
        $address->update($data);
        return back()->with('success', 'Address updated.');
    }

    public function setDefaultAddress(Request $request, Address $address): RedirectResponse
    {
        abort_unless((int) $address->user_id === (int) $request->user()->id, 403);
        DB::transaction(function () use ($request, $address): void {
            Address::query()->where('user_id', $request->user()->id)->update(['is_default' => false]);
            $address->update(['is_default' => true]);
        });
        return back()->with('success', 'Default address updated.');
    }
}
