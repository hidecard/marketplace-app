<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ReviewController extends Controller
{
    public function index(Request $request): Response
    {
        $reviews = Review::query()->where('is_visible', true)->with(['product:id,name,title', 'user:id,name'])->latest()->limit(100)->get()->map(fn (Review $review) => [
            'id' => $review->id, 'rating' => $review->rating, 'body' => $review->body, 'product_id' => $review->product_id,
            'product_title' => $review->product?->title ?: $review->product?->name ?: 'Product', 'user_name' => $review->user?->name ?: 'Customer', 'created_at' => $review->created_at?->toDateString(),
        ]);
        $eligibleProducts = DB::table('order_items')->join('orders', 'orders.id', '=', 'order_items.order_id')->join('products', 'products.id', '=', 'order_items.product_id')->where('orders.buyer_id', $request->user()->id)->whereIn('orders.status', ['delivered', 'completed'])->whereNotExists(fn ($query) => $query->selectRaw('1')->from('reviews')->whereColumn('reviews.product_id', 'order_items.product_id')->where('reviews.user_id', $request->user()->id))->distinct()->get(['products.id', 'products.title', 'products.name']);

        return Inertia::render('Reviews/Index', ['reviews' => $reviews, 'eligibleProducts' => $eligibleProducts]);
    }

    public function store(Request $request, Product $product): RedirectResponse
    {
        $data = $request->validate(['rating' => ['required', 'integer', 'min:1', 'max:5'], 'body' => ['nullable', 'string', 'max:2000']]);
        abort_unless(DB::table('order_items')->join('orders', 'orders.id', '=', 'order_items.order_id')->where('orders.buyer_id', $request->user()->id)->where('order_items.product_id', $product->id)->whereIn('orders.status', ['delivered', 'completed'])->exists(), 403);
        abort_if(Review::where('user_id', $request->user()->id)->where('product_id', $product->id)->exists(), 422, 'You already reviewed this product.');
        Review::create(['user_id' => $request->user()->id, 'product_id' => $product->id, 'shop_id' => $product->shop_id, 'rating' => $data['rating'], 'body' => $data['body'] ?? null, 'is_visible' => true]);

        return back()->with('success', 'Review submitted.');
    }
}
