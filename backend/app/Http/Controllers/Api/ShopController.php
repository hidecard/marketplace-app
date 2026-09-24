<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ShopController extends Controller
{
    public function showMine(Request $request): JsonResponse
    {
        $shop = $request->user()->shop()->with('verificationRequests')->first();
        return response()->json(['shop' => $shop]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'description' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'phone' => ['required', 'string', 'max:30'],
            'address' => ['required', 'string', 'max:1000'],
            'logo_url' => ['sometimes', 'nullable', 'url', 'max:2048'],
            'cover_url' => ['sometimes', 'nullable', 'url', 'max:2048'],
        ]);

        $shop = DB::transaction(function () use ($request, $data): Shop {
            $owner = User::query()->lockForUpdate()->findOrFail($request->user()->id);
            if ($owner->shop()->exists()) {
                abort(409, 'This account already has a shop.');
            }

            $slug = $this->uniqueSlug($data['name']);
            $shop = Shop::create([
                ...$data,
                'owner_id' => $owner->id,
                'slug' => $slug,
                'verification_status' => 'pending',
                'verified' => false,
            ]);
            if (!$owner->isAdmin()) {
                $owner->update(['role' => User::ROLE_SELLER]);
            }

            return $shop;
        });

        return response()->json(['shop' => $shop->load('owner:id,name,email')], 201);
    }

    public function updateMine(Request $request): JsonResponse
    {
        $shop = $request->user()->shop;
        abort_unless($shop, 404, 'Create a shop before editing it.');

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:180'],
            'description' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'phone' => ['sometimes', 'required', 'string', 'max:30'],
            'address' => ['sometimes', 'required', 'string', 'max:1000'],
            'logo_url' => ['sometimes', 'nullable', 'url', 'max:2048'],
            'cover_url' => ['sometimes', 'nullable', 'url', 'max:2048'],
        ]);
        $shop->update($data);

        return response()->json(['shop' => $shop->fresh()]);
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'shop';
        $slug = $base;
        $counter = 2;
        while (Shop::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }
        return $slug;
    }
}
