<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\Banner;
use App\Models\Shop;
use App\Support\ProductImages;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ContentController extends Controller
{
    public function banners(): Response
    {
        return Inertia::render('Admin/Banners', ['banners' => Banner::orderBy('sort_order')->latest()->get()]);
    }

    public function storeBanner(Request $request): RedirectResponse
    {
        $data = $request->validate(['title' => ['required', 'string', 'max:160'], 'image_url' => ['required', 'url', 'max:2000'], 'target_url' => ['nullable', 'url', 'max:500'], 'sort_order' => ['nullable', 'integer', 'min:0']]);
        Banner::create(array_merge($data, ['is_active' => true]));
        return back()->with('success', 'Banner created.');
    }

    public function toggleBanner(Banner $banner): RedirectResponse
    {
        $banner->update(['is_active' => ! $banner->is_active]);
        return back()->with('success', 'Banner status updated.');
    }

    public function settings(): Response
    {
        return Inertia::render('Admin/Settings', ['settings' => AppSetting::orderBy('key')->get()]);
    }

    public function updateSetting(Request $request, AppSetting $setting): RedirectResponse
    {
        $data = $request->validate(['value' => ['nullable', 'string', 'max:10000'], 'is_public' => ['sometimes', 'boolean']]);
        $setting->update(['value' => $data['value'] === null ? null : [$data['value']], 'is_public' => $data['is_public'] ?? $setting->is_public]);
        return back()->with('success', 'Setting updated.');
    }

    public function sellerSettings(Request $request): Response
    {
        $shop = Shop::where('owner_id', $request->user()->id)->firstOrFail();
        return Inertia::render('Seller/Settings', ['shop' => array_merge($shop->toArray(), [
            'logo_url' => ProductImages::normalize($shop->logo_url)[0] ?? null,
            'cover_url' => ProductImages::normalize($shop->cover_url)[0] ?? null,
        ])]);
    }

    public function updateSellerSettings(Request $request): RedirectResponse
    {
        $shop = Shop::where('owner_id', $request->user()->id)->firstOrFail();
        $data = $request->validate(['name' => ['required', 'string', 'max:160'], 'description' => ['nullable', 'string', 'max:3000'], 'phone' => ['nullable', 'string', 'max:30'], 'address' => ['nullable', 'string', 'max:500'], 'facebook_url' => ['nullable', 'url', 'max:500'], 'instagram_url' => ['nullable', 'url', 'max:500'], 'website_url' => ['nullable', 'url', 'max:500'], 'cod_enabled' => ['boolean'], 'logo' => ['nullable', 'image', 'max:5120'], 'cover' => ['nullable', 'image', 'max:8192']]);
        foreach (['logo' => 'logo_url', 'cover' => 'cover_url'] as $input => $column) {
            if ($request->hasFile($input)) $data[$column] = '/media/'.$request->file($input)->store('shops', 'public');
        }
        unset($data['logo'], $data['cover']);
        $shop->update($data);
        return back()->with('success', 'Shop settings saved.');
    }
}
