<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Support\ProductImages;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(Request $request): Response
    {
        $products = Product::where('seller_id', $request->user()->id)->latest()->paginate(20)->withQueryString();
        $products->getCollection()->each(fn (Product $product) => $product->setAttribute('images', ProductImages::normalize($product->images)));

        return Inertia::render('Seller/Products/Index', ['products' => $products, 'shop' => $request->user()->shop, 'categories' => Category::where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'name'])]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('Seller/Products/Form', ['product' => null, 'shop' => $request->user()->shop, 'categories' => Category::where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'name'])]);
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

        return Inertia::render('Seller/Products/Form', ['product' => $product, 'shop' => $request->user()->shop, 'categories' => Category::where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'name'])]);
    }

    public function update(Request $request, Product $product): RedirectResponse
    {
        abort_unless((int) $product->seller_id === (int) $request->user()->id, 403);
        $data = $this->validated($request, true);
        if (isset($data['title']) && $data['title'] !== $product->title) {
            $data['slug'] = $this->slug($data['title'], $product->id);
        }
        unset($data['shop_id'], $data['seller_id']);
        $product->update($data);

        return redirect('/seller/products')->with('success', 'Product updated successfully.');
    }

    public function destroy(Request $request, Product $product): RedirectResponse
    {
        abort_unless((int) $product->seller_id === (int) $request->user()->id, 403);

        return $this->removeProduct($product);
    }

    public function adminCreate(): Response
    {
        return Inertia::render('Admin/Products/Form', $this->adminFormProps(null));
    }

    public function adminEdit(Product $product): Response
    {
        return Inertia::render('Admin/Products/Form', $this->adminFormProps($product));
    }

    public function adminStore(Request $request): RedirectResponse
    {
        $data = $this->adminValidated($request);
        $data['slug'] = $this->slug($data['title']);
        Product::create($data);

        return redirect('/admin/products')->with('success', 'Product created successfully.');
    }

    public function adminUpdate(Request $request, Product $product): RedirectResponse
    {
        $data = $this->adminValidated($request, true);
        if (isset($data['title']) && $data['title'] !== $product->title) {
            $data['slug'] = $this->slug($data['title'], $product->id);
        }
        $product->update($data);

        return redirect('/admin/products')->with('success', 'Product updated successfully.');
    }

    public function adminDestroy(Product $product): RedirectResponse
    {
        return $this->removeProduct($product);
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';
        $data = $request->validate(['title' => [$required, 'string', 'max:180'], 'description' => ['nullable', 'string', 'max:10000'], 'price' => [$required, 'numeric', 'min:0'], 'cost_price' => ['nullable', 'numeric', 'min:0'], 'stock' => [$required, 'integer', 'min:0', 'max:1000000'], 'condition' => [$required, 'in:new,used,refurbished'], 'status' => ['nullable', 'in:active,inactive,sold,hidden'], 'images' => ['nullable', 'array', 'max:10'], 'images.*' => ['file', 'image', 'max:5120'], 'image_urls' => ['nullable', 'string', 'max:20000'], 'category_id' => ['nullable', 'integer', 'exists:categories,id']]);
        $urls = collect(preg_split('/\s*,\s*|\r?\n/', (string) ($data['image_urls'] ?? '')))->filter()->filter(fn ($url) => filter_var($url, FILTER_VALIDATE_URL))->values()->all();
        $uploaded = collect($request->file('images', []))->map(fn ($file) => '/media/'.ltrim($file->store('products', 'public'), '/'))->all();
        unset($data['image_urls']);
        if ($urls || $uploaded || ! $partial) {
            $data['images'] = array_values(array_slice(array_merge($urls, $uploaded), 0, 10));
        } else {
            unset($data['images']);
        }
        if (array_key_exists('category_id', $data)) {
            $data['category_ref_id'] = $data['category_id'];
        }
        if (array_key_exists('title', $data)) {
            $data['name'] = $data['title'];
        }

        return $data;
    }

    private function adminValidated(Request $request, bool $partial = false): array
    {
        $data = $this->validated($request, $partial);
        $required = $partial ? 'sometimes' : 'required';
        $owner = $request->validate(['seller_id' => [$required, 'integer', 'exists:users,id'], 'shop_id' => ['nullable', 'integer', 'exists:shops,id']]);

        return array_merge($data, $owner);
    }

    private function adminFormProps(?Product $product): array
    {
        return ['product' => $product?->load('category'), 'categories' => Category::orderBy('sort_order')->orderBy('name')->get(['id', 'name']), 'sellers' => User::whereIn('role', [User::ROLE_SELLER, User::ROLE_ADMIN])->orderBy('name')->get(['id', 'name', 'role']), 'shops' => Shop::orderBy('name')->get(['id', 'name', 'owner_id'])];
    }

    private function removeProduct(Product $product): RedirectResponse
    {
        $hasHistory = DB::table('order_items')->where('product_id', $product->id)->exists()
            || DB::table('pos_sale_items')->where('product_id', $product->id)->exists();
        if ($hasHistory) {
            $product->update(['status' => 'hidden']);

            return back()->with('success', 'Product has transaction history, so it was hidden instead of deleted.');
        }
        $product->delete();

        return back()->with('success', 'Product deleted.');
    }

    private function slug(string $title, ?int $ignore = null): string
    {
        $base = Str::slug($title) ?: 'product';
        $slug = $base;
        $number = 2;
        while (Product::where('slug', $slug)->when($ignore, fn ($query) => $query->whereKeyNot($ignore))->exists()) {
            $slug = $base.'-'.($number++);
        }

        return $slug;
    }
}
