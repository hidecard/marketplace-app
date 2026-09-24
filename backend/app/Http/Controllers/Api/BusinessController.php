<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\InventoryMovement;
use App\Models\PosSale;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BusinessController extends Controller
{
    public function inventory(Request $request): JsonResponse
    {
        $shop = $request->user()->shop;
        return response()->json($shop->products()->with('seller:id,name')->latest()->paginate(min($request->integer('per_page', 50), 100)));
    }

    public function adjustInventory(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'quantity_delta' => ['required', 'integer', 'between:-1000000,1000000', 'not_in:0'],
            'reason' => ['required', 'string', 'max:80'],
            'idempotency_key' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z0-9._:-]+$/'],
        ]);
        $shop = $request->user()->shop;
        $existing = InventoryMovement::where('idempotency_key', $data['idempotency_key'])->first();
        if ($existing) return response()->json(['movement' => $existing->load('product'), 'replayed' => true]);

        $movement = DB::transaction(function () use ($request, $shop, $data): InventoryMovement {
            $product = Product::query()->where('shop_id', $shop->id)->lockForUpdate()->findOrFail($data['product_id']);
            $newStock = $product->stock + $data['quantity_delta'];
            if ($newStock < 0) throw ValidationException::withMessages(['quantity_delta' => ['Stock cannot become negative.']]);
            $product->update(['stock' => $newStock]);
            return InventoryMovement::create([
                'shop_id' => $shop->id, 'product_id' => $product->id, 'actor_id' => $request->user()->id,
                'quantity_delta' => $data['quantity_delta'], 'reason' => $data['reason'], 'idempotency_key' => $data['idempotency_key'],
            ]);
        });
        return response()->json(['movement' => $movement->load('product'), 'replayed' => false], 201);
    }

    public function posSale(Request $request): JsonResponse
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.product_id' => ['required', 'integer', 'distinct', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:1000'],
            'discount' => ['sometimes', 'numeric', 'min:0'],
            'tax' => ['sometimes', 'numeric', 'min:0'],
            'payment_method' => ['required', 'in:cash,kbzpay,wavepay,bank_transfer'],
            'idempotency_key' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z0-9._:-]+$/'],
        ]);
        $shop = $request->user()->shop;
        $existing = PosSale::where('idempotency_key', $data['idempotency_key'])->first();
        if ($existing) return response()->json(['sale' => $existing, 'replayed' => true]);

        $sale = DB::transaction(function () use ($request, $shop, $data): PosSale {
            $lineItems = [];
            $subtotal = 0.0;
            $cogs = 0.0;
            foreach ($data['items'] as $item) {
                $product = Product::query()->where('shop_id', $shop->id)->lockForUpdate()->findOrFail($item['product_id']);
                if ($product->status !== 'active') throw ValidationException::withMessages(['items' => ['Inactive product cannot be sold.']]);
                if ($product->stock < $item['quantity']) throw ValidationException::withMessages(['items' => ['Insufficient stock.']]);
                $line = (float) $product->price * $item['quantity'];
                $cost = (float) $product->cost_price * $item['quantity'];
                $subtotal += $line; $cogs += $cost;
                $product->decrement('stock', $item['quantity']);
                $lineItems[] = ['product_id' => $product->id, 'name' => $product->name, 'quantity' => $item['quantity'], 'unit_price' => (float) $product->price, 'line_total' => $line];
            }
            $discount = min((float) ($data['discount'] ?? 0), $subtotal);
            $tax = (float) ($data['tax'] ?? 0);
            $total = $subtotal - $discount + $tax;
            return PosSale::create([
                'shop_id' => $shop->id, 'seller_id' => $request->user()->id, 'subtotal' => $subtotal,
                'discount' => $discount, 'tax' => $tax, 'total' => $total, 'cost_of_goods_sold' => $cogs,
                'gross_profit' => $total - $cogs, 'payment_method' => $data['payment_method'], 'items' => $lineItems,
                'idempotency_key' => $data['idempotency_key'],
            ]);
        });
        return response()->json(['sale' => $sale, 'replayed' => false], 201);
    }

    public function expenses(Request $request): JsonResponse
    {
        return response()->json($request->user()->shop->expenses()->latest('expense_date')->paginate(min($request->integer('per_page', 50), 100)));
    }

    public function createExpense(Request $request): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0'], 'category' => ['required', 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'], 'expense_date' => ['required', 'date'],
            'idempotency_key' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z0-9._:-]+$/'],
        ]);
        $shop = $request->user()->shop;
        $expense = Expense::firstOrCreate(['idempotency_key' => $data['idempotency_key']], [
            ...$data, 'shop_id' => $shop->id, 'actor_id' => $request->user()->id,
        ]);
        return response()->json(['expense' => $expense, 'replayed' => !$expense->wasRecentlyCreated], $expense->wasRecentlyCreated ? 201 : 200);
    }
}
