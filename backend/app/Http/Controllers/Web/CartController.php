<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CartController extends Controller
{
    public function index(Request $request): Response { return Inertia::render('Cart/Index', $this->cartProps($request)); }
    public function add(Request $request, Product $product): RedirectResponse { abort_unless($product->status === 'active', 404); $qty = max(1, $request->integer('quantity', 1)); $cart = $request->session()->get('cart', []); $next = ($cart[$product->id] ?? 0) + $qty; abort_if($next > $product->stock, 422, 'Not enough stock available.'); $cart[$product->id] = $next; $request->session()->put('cart', $cart); return back()->with('success', 'Added to cart.'); }
    public function update(Request $request): RedirectResponse { $data = $request->validate(['items' => ['required', 'array'], 'items.*' => ['integer', 'min:1', 'max:1000']]); $ids = array_map('intval', array_keys($data['items'])); $products = Product::whereIn('id', $ids)->get()->keyBy('id'); $cart = []; foreach ($data['items'] as $id => $qty) { $id = (int) $id; abort_unless(isset($products[$id]) && $products[$id]->status === 'active' && $qty <= $products[$id]->stock, 422, 'Cart quantity is unavailable.'); $cart[$id] = (int) $qty; } $request->session()->put('cart', $cart); return back(); }
    public function remove(Request $request, int $product): RedirectResponse { $cart = $request->session()->get('cart', []); unset($cart[$product]); $request->session()->put('cart', $cart); return back(); }
    public function checkout(Request $request): Response { return Inertia::render('Cart/Checkout', $this->cartProps($request)); }
    public function placeOrder(Request $request): RedirectResponse { $data = $request->validate(['name' => ['required', 'string', 'max:120'], 'phone' => ['required', 'string', 'max:30'], 'address' => ['required', 'string', 'max:1000']]); $cart = $request->session()->get('cart', []); abort_if(empty($cart), 422, 'Your cart is empty.'); $order = DB::transaction(function () use ($cart, $data, $request): Order { $products = []; foreach ($cart as $id => $qty) { $product = Product::query()->lockForUpdate()->findOrFail($id); if ($product->status !== 'active' || $product->stock < $qty) throw ValidationException::withMessages(['cart' => ['A product is no longer available in the requested quantity.']]); $products[] = [$product, (int) $qty]; } $sellerIds = collect($products)->map(fn ($pair) => $pair[0]->seller_id)->unique(); if ($sellerIds->count() !== 1) throw ValidationException::withMessages(['cart' => ['Please checkout products from one seller at a time.']]); $subtotal = 0; foreach ($products as [$product, $qty]) { $subtotal += (float) $product->price * $qty; $product->decrement('stock', $qty); } $order = Order::create(['order_number' => 'ORD-'.strtoupper(Str::random(10)), 'buyer_id' => $request->user()->id, 'seller_id' => $sellerIds->first(), 'shop_id' => $products[0][0]->shop_id, 'subtotal' => $subtotal, 'delivery_fee' => 0, 'discount' => 0, 'total' => $subtotal, 'payment_method' => 'cod', 'status' => 'pending', 'delivery_address' => $data, 'idempotency_key' => 'web-'.Str::uuid()]); foreach ($products as [$product, $qty]) $order->items()->create(['product_id' => $product->id, 'quantity' => $qty, 'unit_price' => $product->price, 'line_total' => (float) $product->price * $qty]); return $order; }); $request->session()->forget('cart'); return redirect('/orders/'.$order->id)->with('success', 'Order placed successfully.'); }
    public function orders(Request $request): Response { return Inertia::render('Orders/Index', ['orders' => Order::with('shop')->where('buyer_id', $request->user()->id)->latest()->paginate(20)]); }
    public function order(Request $request, Order $order): Response { abort_unless((int) $order->buyer_id === (int) $request->user()->id, 403); return Inertia::render('Orders/Show', ['order' => $order->load('items.product', 'shop')]); }
    private function cartProps(Request $request): array { $cart = $request->session()->get('cart', []); $products = Product::whereIn('id', array_keys($cart))->where('status', 'active')->get()->keyBy('id'); $items = collect($cart)->map(fn ($qty, $id) => isset($products[$id]) ? ['product' => $products[$id], 'quantity' => $qty, 'line_total' => (float) $products[$id]->price * $qty] : null)->filter()->values(); return ['items' => $items, 'subtotal' => $items->sum('line_total')]; }
}
