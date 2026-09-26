<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
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
        $data = $request->validate(['title' => [$required, 'string', 'max:180'], 'description' => ['nullable', 'string', 'max:10000'], 'price' => [$required, 'numeric', 'min:0'], 'cost_price' => ['nullable', 'numeric', 'min:0'], 'stock' => [$required, 'integer', 'min:0', 'max:1000000'], 'condition' => [$required, 'in:new,used,refurbished'], 'status' => ['nullable', 'in:active,inactive,sold,hidden'], 'images' => ['nullable', 'array', 'max:10'], 'images.*' => ['file', 'image', 'max:5120'], 'image_urls' => ['nullable', 'string', 'max:20000'], 'category_id' => ['nullable', 'string', 'max:100']]);
        $urls = collect(preg_split('/\s*,\s*|\r?\n/', (string) ($data['image_urls'] ?? '')))->filter()->filter(fn ($url) => filter_var($url, FILTER_VALIDATE_URL))->values()->all();
        $uploaded = collect($request->file('images', []))->map(fn ($file) => Storage::disk('public')->url($file->store('products', 'public')))->all();
        unset($data['image_urls']);
        if ($urls || $uploaded || ! $partial) $data['images'] = array_values(array_slice(array_merge($urls, $uploaded), 0, 10));
        else unset($data['images']);
        return $data;
    }

    private function slug(string $title, ?int $ignore = null): string
    {
        $base = Str::slug($title) ?: 'product'; $slug = $base; $number = 2;
        while (Product::where('slug', $slug)->when($ignore, fn ($query) => $query->whereKeyNot($ignore))->exists()) $slug = $base.'-'.($number++);
        return $slug;
    }
}
