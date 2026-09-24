<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeliveryFee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeliveryFeeController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['delivery_fees' => DeliveryFee::orderBy('id')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'amount' => ['required', 'numeric', 'min:0'],
            'free_shipping_threshold' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['boolean'],
            'regions' => ['nullable', 'array'],
        ]);

        // Deactivate others if this is set as active
        if ($data['is_active'] ?? false) {
            DeliveryFee::where('is_active', true)->update(['is_active' => false]);
        }

        $fee = DeliveryFee::create($data);

        return response()->json(['delivery_fee' => $fee], 201);
    }

    public function update(Request $request, DeliveryFee $deliveryFee): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'amount' => ['sometimes', 'required', 'numeric', 'min:0'],
            'free_shipping_threshold' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'regions' => ['nullable', 'array'],
        ]);

        // Deactivate others if this is set as active
        if ($data['is_active'] ?? false) {
            DeliveryFee::where('is_active', true)->where('id', '!=', $deliveryFee->id)->update(['is_active' => false]);
        }

        $deliveryFee->update($data);

        return response()->json(['delivery_fee' => $deliveryFee->fresh()]);
    }

    public function destroy(DeliveryFee $deliveryFee): JsonResponse
    {
        $deliveryFee->delete();

        return response()->json(['message' => 'Delivery fee deleted']);
    }
}
