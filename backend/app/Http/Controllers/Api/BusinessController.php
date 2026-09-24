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
            'shop_id' => ['sometimes', 'integer', 'exists:shops,id'],
        ]);
        $user = $request->user();
        $isAdmin = $user->isAdmin();
        $shop = $isAdmin ? null : $user->shop;
        if (! $isAdmin && (! $shop || ! $shop->verified)) {
            return response()->json(['message' => 'An active verified seller shop is required.'], 403);
        }

        $shopId = $isAdmin ? $data['shop_id'] ?? null : $shop->id;
        if ($isAdmin && ! $shopId) {
            return response()->json(['message' => 'Admin must provide shop_id.'], 422);
        }

        $existing = InventoryMovement::where('idempotency_key', $data['idempotency_key'])
            ->where('shop_id', $shopId)
            ->first();
        if ($existing) {
            return response()->json(['movement' => $existing->load('product'), 'replayed' => true]);
        }

        $movement = DB::transaction(function () use ($request, $shop, $data, $isAdmin): InventoryMovement {
            $productQuery = Product::query()->lockForUpdate();
            if (! $isAdmin) {
                $productQuery->where('shop_id', $shop->id);
            }
            $product = $productQuery->findOrFail($data['product_id']);
            if (! $isAdmin && (int) $product->shop_id !== (int) $shop->id) {
                abort(403, 'Product does not belong to your shop.');
            }
            $newStock = $product->stock + $data['quantity_delta'];
            if ($newStock < 0) {
                throw ValidationException::withMessages(['quantity_delta' => ['Stock cannot become negative.']]);
            }
            $product->update(['stock' => $newStock]);

            return InventoryMovement::create([
                'shop_id' => $product->shop_id, 'product_id' => $product->id, 'actor_id' => $request->user()->id,
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
            'shop_id' => ['sometimes', 'integer', 'exists:shops,id'],
        ]);
        $user = $request->user();
        $isAdmin = $user->isAdmin();
        $shop = $isAdmin ? null : $user->shop;
        if (! $isAdmin && (! $shop || ! $shop->verified)) {
            return response()->json(['message' => 'An active verified seller shop is required.'], 403);
        }

        $shopId = $isAdmin ? $data['shop_id'] ?? null : $shop->id;
        if ($isAdmin && ! $shopId) {
            return response()->json(['message' => 'Admin must provide shop_id.'], 422);
        }

        $existing = PosSale::where('idempotency_key', $data['idempotency_key'])
            ->where('shop_id', $shopId)
            ->first();
        if ($existing) {
            return response()->json(['sale' => $existing, 'replayed' => true]);
        }

        $sale = DB::transaction(function () use ($request, $shop, $data, $isAdmin): PosSale {
            $lineItems = [];
            $subtotal = 0.0;
            $cogs = 0.0;
            $saleShopId = null;
            foreach ($data['items'] as $item) {
                $productQuery = Product::query()->lockForUpdate();
                if (! $isAdmin) {
                    $productQuery->where('shop_id', $shop->id);
                }
                $product = $productQuery->findOrFail($item['product_id']);
                if (! $isAdmin && (int) $product->shop_id !== (int) $shop->id) {
                    abort(403, 'Product does not belong to your shop.');
                }
                if ($saleShopId === null) {
                    $saleShopId = $product->shop_id;
                } elseif ($saleShopId !== $product->shop_id) {
                    throw ValidationException::withMessages(['items' => ['All products must belong to the same shop.']]);
                }
                if ($product->status !== 'active') {
                    throw ValidationException::withMessages(['items' => ['Inactive product cannot be sold.']]);
                }
                if ($product->stock < $item['quantity']) {
                    throw ValidationException::withMessages(['items' => ['Insufficient stock.']]);
                }
                $line = (float) $product->price * $item['quantity'];
                $cost = (float) $product->cost_price * $item['quantity'];
                $subtotal += $line;
                $cogs += $cost;
                $product->decrement('stock', $item['quantity']);
                $lineItems[] = ['product_id' => $product->id, 'name' => $product->title, 'quantity' => $item['quantity'], 'unit_price' => (float) $product->price, 'line_total' => $line];
            }
            $discount = min((float) ($data['discount'] ?? 0), $subtotal);
            $tax = (float) ($data['tax'] ?? 0);
            $total = $subtotal - $discount + $tax;

            return PosSale::create([
                'shop_id' => $saleShopId, 'seller_id' => $request->user()->id, 'subtotal' => $subtotal,
                'discount' => $discount, 'tax' => $tax, 'total' => $total, 'cost_of_goods_sold' => $cogs,
                'gross_profit' => $total - $cogs, 'payment_method' => $data['payment_method'], 'items' => $lineItems,
                'idempotency_key' => $data['idempotency_key'],
            ]);
        });

        return response()->json(['sale' => $sale, 'replayed' => false], 201);
    }

    public function expenses(Request $request): JsonResponse
    {
        $user = $request->user();
        $isAdmin = $user->isAdmin();
        $shop = $isAdmin ? null : $user->shop;
        if (! $isAdmin && (! $shop || ! $shop->verified)) {
            return response()->json(['message' => 'An active verified seller shop is required.'], 403);
        }

        $query = Expense::query()->latest('expense_date');
        if (! $isAdmin) {
            $query->where('shop_id', $shop->id);
        }

        return response()->json($query->paginate(min($request->integer('per_page', 50), 100)));
    }

    public function createExpense(Request $request): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0'], 'category' => ['required', 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'], 'expense_date' => ['required', 'date'],
            'idempotency_key' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z0-9._:-]+$/'],
            'shop_id' => ['sometimes', 'integer', 'exists:shops,id'],
        ]);
        $user = $request->user();
        $isAdmin = $user->isAdmin();
        $shop = $isAdmin ? null : $user->shop;
        if (! $isAdmin && (! $shop || ! $shop->verified)) {
            return response()->json(['message' => 'An active verified seller shop is required.'], 403);
        }

        $shopId = $isAdmin ? $data['shop_id'] ?? null : $shop->id;
        if ($isAdmin && ! $shopId) {
            return response()->json(['message' => 'Admin must provide shop_id.'], 422);
        }

        $existing = Expense::where('idempotency_key', $data['idempotency_key'])
            ->where('shop_id', $shopId)
            ->first();
        if ($existing) {
            return response()->json(['expense' => $existing, 'replayed' => true]);
        }

        $expense = Expense::create([
            ...$data, 'shop_id' => $shopId, 'actor_id' => $request->user()->id,
        ]);

        return response()->json(['expense' => $expense, 'replayed' => false], 201);
    }

    public function deleteExpense(Request $request, Expense $expense): JsonResponse
    {
        $user = $request->user();
        $isAdmin = $user->isAdmin();
        $shop = $isAdmin ? null : $user->shop;

        if (! $isAdmin) {
            if (! $shop || ! $shop->verified || (int) $expense->shop_id !== (int) $shop->id) {
                abort(403, 'You do not have permission to delete this expense.');
            }
        }

        $expense->delete();

        return response()->json(['message' => 'Expense deleted']);
    }
}
