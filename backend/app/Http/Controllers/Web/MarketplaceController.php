<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Favorite;
use App\Models\MarketplaceNotification;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\Shop;
use App\Support\ProductImages;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Inertia\Inertia;
use Inertia\Response;

class MarketplaceController extends Controller
{
    public function home(): Response
    {
        if (! Schema::hasTable('categories') || ! Schema::hasTable('products') || ! Schema::hasTable('shops')) {
            return Inertia::render('Home', ['categories' => [], 'featuredProducts' => [], 'recentProducts' => [], 'verifiedShops' => []]);
        }

        return Inertia::render('Home', [
            'categories' => Category::where('is_active', true)->orderBy('sort_order')->orderBy('name')->limit(8)->get(['name', 'slug', 'icon_url']),
            'featuredProducts' => $this->withImageUrls(Product::where('status', 'active')->where('is_featured', true)->with('shop:id,name,slug,verified')->latest()->limit(10)->get()),
            'recentProducts' => $this->withImageUrls(Product::where('status', 'active')->with('shop:id,name,slug,verified')->latest()->limit(12)->get()),
            'verifiedShops' => Shop::where('verified', true)->latest()->limit(10)->get(['id', 'name', 'slug', 'logo_url', 'address'])->map(function (Shop $shop) {
                $shop->logo_url = ProductImages::normalize($shop->logo_url)[0] ?? null;
                return $shop;
            }),
        ]);
    }

    public function products(Request $request): Response
    {
        $query = Product::query()->where('status', 'active')->with(['shop:id,name,slug,verified,address', 'category:id,name,slug'])->latest();
        if ($request->filled('q')) {
            $query->where(fn ($q) => $q->where('title', 'like', '%'.$request->string('q').'%')->orWhere('brand', 'like', '%'.$request->string('q').'%')->orWhere('description', 'like', '%'.$request->string('q').'%'));
        }
        if ($request->filled('brand')) {
            $query->where('brand', 'like', '%'.$request->string('brand').'%');
        }
        if ($request->filled('category')) {
            $query->whereHas('category', fn ($q) => $q->where('slug', $request->string('category')));
        }
        if ($request->filled('shop')) {
            $query->whereHas('shop', fn ($q) => $q->where('name', 'like', '%'.$request->string('shop').'%')->orWhere('address', 'like', '%'.$request->string('shop').'%'));
        }
        if ($request->boolean('verified')) {
            $query->whereHas('shop', fn ($q) => $q->where('verified', true));
        }
        if ($request->filled('condition') && in_array($request->string('condition')->toString(), ['new', 'used', 'refurbished'], true)) {
            $query->where('condition', $request->string('condition'));
        }
        if ($request->filled('min_price')) {
            $query->where('price', '>=', $request->float('min_price'));
        }
        if ($request->filled('max_price')) {
            $query->where('price', '<=', $request->float('max_price'));
        }
        match ($request->string('sort')->toString()) {
            'price_asc' => $query->orderBy('price'),
            'price_desc' => $query->orderByDesc('price'),
            'newest' => $query->latest(),
            default => null,
        };

        $products = $query->paginate(24)->withQueryString();
        $products->getCollection()->each(fn (Product $product) => $this->normalizeProductImages($product));
        return Inertia::render('Products/Index', [
            'products' => $products,
            'categories' => Category::where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['name', 'slug']),
            'filters' => $request->only(['q', 'brand', 'category', 'shop', 'verified', 'condition', 'min_price', 'max_price', 'sort']),
        ]);
    }

    public function product(Request $request, Product $product): Response
    {
        abort_unless($product->status === 'active', 404);

        $product->load('shop:id,name,slug,verified', 'seller:id,name');
        $this->normalizeProductImages($product);
        $reviewQuery = Review::query()->where('product_id', $product->id)->where('is_visible', true);
        $reviewSummary = ['count' => (clone $reviewQuery)->count(), 'average' => round((float) (clone $reviewQuery)->avg('rating'), 1)];
        $reviews = $reviewQuery->with('user:id,name')->latest()->limit(12)->get()->map(fn (Review $review) => [
            'id' => $review->id,
            'rating' => $review->rating,
            'body' => $review->body,
            'user_name' => $review->user?->name ?: 'Customer',
            'created_at' => $review->created_at?->toDateString(),
        ]);
        return Inertia::render('Products/Show', [
            'product' => $product,
            'reviews' => $reviews,
            'reviewSummary' => $reviewSummary,
            'isFavorite' => $request->user() ? Favorite::query()->where('user_id', $request->user()->id)->where('product_id', $product->id)->exists() : false,
        ]);
    }

    public function media(string $path): BinaryFileResponse
    {
        abort_unless(Storage::disk('public')->exists($path), 404);
        return response()->file(Storage::disk('public')->path($path), ['Cache-Control' => 'public, max-age=31536000, immutable']);
    }

    private function normalizeProductImages(Product $product): Product
    {
        $product->setAttribute('images', ProductImages::normalize($product->images));
        return $product;
    }

    private function withImageUrls($products)
    {
        return $products->each(fn (Product $product) => $this->normalizeProductImages($product));
    }

    public function dashboard(Request $request): Response|RedirectResponse
    {
        $user = $request->user()->load('shop');
        if (! $user->profile_completed_at) {
            return redirect()->route('profile.complete');
        }

        return Inertia::render('Dashboard', [
            'user' => $user->only(['id', 'name', 'email', 'role', 'status', 'phone_verified']),
            'shop' => $user->shop,
            'stats' => [
                'orders' => Order::where('buyer_id', $user->id)->count(),
                'pending_orders' => Order::where('buyer_id', $user->id)->whereIn('status', ['pending', 'confirmed', 'preparing', 'shipped'])->count(),
                'favorites' => Favorite::where('user_id', $user->id)->count(),
                'unread_notifications' => MarketplaceNotification::where('user_id', $user->id)->whereNull('read_at')->count(),
            ],
        ]);
    }
}
