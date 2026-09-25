<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(Request $request): Response
    {
        $products = Product::where('seller_id', $request->user()->id)->latest()->paginate(20)->withQueryString();
        return Inertia::render('Seller/Products/Index', ['products' => $products, 'shop' => $request->user()->shop]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('Seller/Products/Form', ['product' => null, 'shop' => $request->user()->shop]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        $data['seller_id'] = $request->user()->id;
        $data['shop_id'] = $request->user()->shop?->id;
        $data['slug'] = $this->slug($data['title']);
        Product::create($data);
        return redirect('/seller/products')->with('success', 'Product created successfully.');
    }

    public function edit(Request $request, Product $product): Response
    {
        abort_unless((int) $product->seller_id === (int) $request->user()->id, 403);
        return Inertia::render('Seller/Products/Form', ['product' => $product, 'shop' => $request->user()->shop]);
    }

    public function update(Request $request, Product $product): RedirectResponse
    {
        abort_unless((int) $product->seller_id === (int) $request->user()->id, 403);
        $data = $this->validated($request, true);
        if (isset($data['title']) && $data['title'] !== $product->title) $data['slug'] = $this->slug($data['title'], $product->id);
        unset($data['shop_id'], $data['seller_id']);
        $product->update($data);
        return redirect('/seller/products')->with('success', 'Product updated successfully.');
    }

    public function destroy(Request $request, Product $product): RedirectResponse
    {
        abort_unless((int) $product->seller_id === (int) $request->user()->id, 403);
        $product->update(['status' => 'hidden']);
        return back()->with('success', 'Product hidden.');
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';
        return $request->validate(['title' => [$required, 'string', 'max:180'], 'description' => ['nullable', 'string', 'max:10000'], 'price' => [$required, 'numeric', 'min:0'], 'cost_price' => ['nullable', 'numeric', 'min:0'], 'stock' => [$required, 'integer', 'min:0', 'max:1000000'], 'condition' => [$required, 'in:new,used,refurbished'], 'status' => ['nullable', 'in:active,inactive,sold,hidden'], 'images' => ['nullable', 'array', 'max:10'], 'images.*' => ['url', 'max:2048'], 'category_id' => ['nullable', 'string', 'max:100']]);
    }

    private function slug(string $title, ?int $ignore = null): string
    {
        $base = Str::slug($title) ?: 'product'; $slug = $base; $number = 2;
        while (Product::where('slug', $slug)->when($ignore, fn ($query) => $query->whereKeyNot($ignore))->exists()) $slug = $base.'-'.($number++);
        return $slug;
    }
}
