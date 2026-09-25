<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\Shop;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
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
            'featuredProducts' => Product::where('status', 'active')->where('is_featured', true)->with('shop:id,name,slug,verified')->latest()->limit(10)->get(),
            'recentProducts' => Product::where('status', 'active')->with('shop:id,name,slug,verified')->latest()->limit(12)->get(),
            'verifiedShops' => Shop::where('verified', true)->latest()->limit(10)->get(['id', 'name', 'slug', 'logo_url', 'address']),
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

        return Inertia::render('Products/Index', [
            'products' => $query->paginate(24)->withQueryString(),
            'categories' => Category::where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['name', 'slug']),
            'filters' => $request->only(['q', 'brand', 'category', 'shop', 'verified', 'condition', 'min_price', 'max_price', 'sort']),
        ]);
    }

    public function product(Product $product): Response
    {
        abort_unless($product->status === 'active', 404);

        return Inertia::render('Products/Show', ['product' => $product->load('shop:id,name,slug,verified', 'seller:id,name')]);
    }

    public function dashboard(Request $request): Response|RedirectResponse
    {
        $user = $request->user()->load('shop');
        if (! $user->profile_completed_at) {
            return redirect()->route('profile.complete');
        }

        return Inertia::render('Dashboard', ['user' => $user->only(['id', 'name', 'email', 'role', 'status', 'phone_verified']), 'shop' => $user->shop]);
    }
}
