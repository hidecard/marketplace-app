<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::query()
            ->with(['shop:id,name,slug,verified'])
            ->where('status', 'active');

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(fn ($builder) => $builder
                ->where('title', 'like', "%{$search}%")
                ->orWhere('description', 'like', "%{$search}%"));
        }
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->string('category_id')->toString());
        }
        if ($request->boolean('verified_shop')) {
            $query->whereHas('shop', fn ($shop) => $shop->where('verified', true));
        }

        return response()->json($query->latest()->paginate(min($request->integer('per_page', 20), 100)));
    }

    public function show(Product $product): JsonResponse
    {
        if ($product->status !== 'active') {
            abort(404);
        }

        return response()->json(['product' => $product->load(['shop:id,name,slug,verified', 'seller:id,name'])]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatedProduct($request);
        $data['seller_id'] = $request->user()->id;
        $data['slug'] = $this->uniqueSlug($data['title']);

        if (! empty($data['shop_id'])) {
            $shop = $request->user()->shop;
            if (! $shop || (int) $shop->id !== (int) $data['shop_id'] || ! $shop->verified) {
                return response()->json(['message' => 'Only an approved shop owner can create shop products.'], 403);
            }
        }

        $product = Product::create($data);

        return response()->json(['product' => $product], 201);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $this->authorizeProduct($request, $product);
        $data = $this->validatedProduct($request, true);
        if (isset($data['title']) && $data['title'] !== $product->title) {
            $data['slug'] = $this->uniqueSlug($data['title'], $product->id);
        }
        unset($data['seller_id'], $data['shop_id']);
        $product->update($data);

        return response()->json(['product' => $product->fresh()]);
    }

    public function destroy(Request $request, Product $product): JsonResponse
    {
        $user = $request->user();
        if (! $user->isAdmin() && (int) $product->seller_id !== (int) $user->id) {
            abort(403, 'You do not own this product.');
        }
        $product->update(['status' => 'hidden']);

        return response()->json(['message' => 'Product hidden']);
    }

    private function authorizeProduct(Request $request, Product $product): void
    {
        if (! $request->user()->isAdmin() && (int) $product->seller_id !== (int) $request->user()->id) {
            abort(403, 'You do not own this product.');
        }
    }

    private function validatedProduct(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'title' => [$required, 'string', 'max:180'],
            'description' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'price' => [$required, 'numeric', 'min:0'],
            'cost_price' => ['sometimes', 'numeric', 'min:0'],
            'stock' => [$required, 'integer', 'min:0', 'max:1000000'],
            'condition' => [$required, 'in:new,used,refurbished'],
            'status' => ['sometimes', 'in:active,inactive,sold,hidden'],
            'images' => ['sometimes', 'array', 'max:10'],
            'images.*' => ['string', 'url', 'max:2048'],
            'category_id' => ['sometimes', 'nullable', 'string', 'max:100'],
            'shop_id' => [$partial ? 'prohibited' : 'nullable', 'integer', 'exists:shops,id'],
        ]);
    }

    private function uniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name) ?: 'product';
        $slug = $base;
        $counter = 2;
        while (Product::where('slug', $slug)->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))->exists()) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }
}
