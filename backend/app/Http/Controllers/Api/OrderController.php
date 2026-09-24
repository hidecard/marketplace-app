<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Order::with('items.product')->latest();
        if ($user->isSeller()) {
            $query->where('seller_id', $user->id);
        } elseif (!$user->isAdmin()) {
            $query->where('buyer_id', $user->id);
        }

        return response()->json($query->paginate(min($request->integer('per_page', 20), 100)));
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        $this->authorizeOrder($request, $order);
        return response()->json(['order' => $order->load('items.product', 'shop')]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.product_id' => ['required', 'integer', 'distinct', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:1000'],
            'delivery_address' => ['required', 'array'],
            'delivery_address.name' => ['required', 'string', 'max:120'],
            'delivery_address.phone' => ['required', 'string', 'max:30'],
            'delivery_address.address' => ['required', 'string', 'max:1000'],
            'payment_method' => ['required', 'in:cod'],
            'idempotency_key' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z0-9._:-]+$/'],
        ]);

        $existing = Order::where('idempotency_key', $data['idempotency_key'])->first();
        if ($existing) {
            if ((int) $existing->buyer_id !== (int) $request->user()->id) {
                throw ValidationException::withMessages(['idempotency_key' => ['This idempotency key belongs to another buyer.']]);
            }
            return response()->json(['order' => $existing->load('items.product', 'shop'), 'replayed' => true]);
        }

        $order = DB::transaction(function () use ($data, $request): Order {
            $products = [];
            foreach ($data['items'] as $item) {
                $product = Product::query()->lockForUpdate()->findOrFail($item['product_id']);
                if ($product->status !== 'active') {
                    throw ValidationException::withMessages(['items' => ["Product {$product->id} is not active."]]);
                }
                if ($product->stock < $item['quantity']) {
                    throw ValidationException::withMessages(['items' => ["Product {$product->id} does not have enough stock."]]);
                }
                $products[] = [$product, $item['quantity']];
            }

            $sellerIds = collect($products)->map(fn ($pair) => $pair[0]->seller_id)->unique();
            if ($sellerIds->count() !== 1) {
                throw ValidationException::withMessages(['items' => ['An order must contain products from one seller.']]);
            }

            $subtotal = 0;
            $sellerId = $sellerIds->first();
            $shopIds = collect($products)->map(fn ($pair) => $pair[0]->shop_id)->filter()->unique();
            $shopId = $shopIds->count() === 1 ? $shopIds->first() : null;
            foreach ($products as [$product, $quantity]) {
                $lineTotal = (float) $product->price * $quantity;
                $subtotal += $lineTotal;
                $product->decrement('stock', $quantity);
            }

            $order = Order::create([
                'order_number' => 'ORD-'.strtoupper(Str::random(10)),
                'buyer_id' => $request->user()->id,
                'seller_id' => $sellerId,
                'shop_id' => $shopId,
                'subtotal' => $subtotal,
                'delivery_fee' => 0,
                'total' => $subtotal,
                'payment_method' => 'cod',
                'status' => 'pending',
                'delivery_address' => $data['delivery_address'],
                'idempotency_key' => $data['idempotency_key'],
            ]);

            foreach ($products as [$product, $quantity]) {
                $order->items()->create([
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'unit_price' => $product->price,
                    'line_total' => (float) $product->price * $quantity,
                ]);
            }

            return $order;
        });

        return response()->json(['order' => $order->load('items.product', 'shop'), 'replayed' => false], 201);
    }

    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        $user = $request->user();
        if (!$user->isAdmin() && ((int) $order->seller_id !== (int) $user->id)) {
            abort(403, 'Only the order seller or an admin can update status.');
        }

        $data = $request->validate(['status' => ['required', 'in:confirmed,preparing,shipped,delivered,completed,cancelled']]);
        $allowed = [
            'pending' => ['confirmed', 'cancelled'],
            'confirmed' => ['preparing', 'cancelled'],
            'preparing' => ['shipped', 'cancelled'],
            'shipped' => ['delivered'],
            'delivered' => ['completed'],
            'completed' => [],
            'cancelled' => [],
        ];
        if (!in_array($data['status'], $allowed[$order->status] ?? [], true)) {
            throw ValidationException::withMessages(['status' => ["Cannot move order from {$order->status} to {$data['status']}."]]);
        }

        $order->update(['status' => $data['status']]);
        return response()->json(['order' => $order->fresh()->load('items.product', 'shop')]);
    }

    private function authorizeOrder(Request $request, Order $order): void
    {
        $user = $request->user();
        if (!$user->isAdmin() && (int) $order->buyer_id !== (int) $user->id && (int) $order->seller_id !== (int) $user->id) {
            abort(403, 'You do not have access to this order.');
        }
    }
}
