<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MarketplaceController extends Controller
{
    public function home(): Response { return Inertia::render('Home'); }

    public function products(Request $request): Response
    {
        $query = Product::query()->where('status', 'active')->with('shop:id,name,slug')->latest();
        if ($request->filled('q')) $query->where(fn ($q) => $q->where('name', 'like', '%'.$request->string('q').'%')->orWhere('description', 'like', '%'.$request->string('q').'%'));
        return Inertia::render('Products/Index', ['products' => $query->paginate(24)->withQueryString(), 'filters' => ['q' => $request->string('q')->toString()]]);
    }

    public function dashboard(Request $request): Response
    {
        $user = $request->user()->load('shop');
        return Inertia::render('Dashboard', ['user' => $user->only(['id', 'name', 'email', 'role', 'status', 'phone_verified']), 'shop' => $user->shop]);
    }
}
