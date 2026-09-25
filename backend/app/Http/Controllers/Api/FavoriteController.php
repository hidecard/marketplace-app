<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Favorite;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FavoriteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $favorites = Favorite::where('user_id', $request->user()->id)
            ->with('product:id,name,slug,price,images,condition,shop_id', 'product.shop:id,name,slug,verified')
            ->latest()
            ->paginate(min($request->integer('per_page', 20), 100));

        return response()->json($favorites);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
        ]);

        $product = Product::findOrFail($data['product_id']);
        if ($product->status !== 'active') {
            return response()->json(['message' => 'Cannot favorite inactive product.'], 422);
        }

        $favorite = DB::transaction(function () use ($request, $data) {
            $existing = Favorite::where('user_id', $request->user()->id)
                ->where('product_id', $data['product_id'])
                ->first();
            if ($existing) {
                return $existing;
            }

            return Favorite::create([
                'user_id' => $request->user()->id,
                'product_id' => $data['product_id'],
            ]);
        });

        return response()->json(['favorite' => $favorite->load('product:id,name,slug,price,images,condition')], 201);
    }

    public function destroy(Request $request, Favorite $favorite): JsonResponse
    {
        if ((int) $favorite->user_id !== (int) $request->user()->id) {
            abort(403, 'You can only remove your own favorites.');
        }

        $favorite->delete();

        return response()->json(['message' => 'Removed from favorites']);
    }

    public function check(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_ids' => ['required', 'array', 'max:100'],
            'product_ids.*' => ['integer', 'exists:products,id'],
        ]);

        $favorites = Favorite::where('user_id', $request->user()->id)
            ->whereIn('product_id', $data['product_ids'])
            ->pluck('product_id')
            ->toArray();

        return response()->json(['favorite_product_ids' => $favorites]);
    }
}
