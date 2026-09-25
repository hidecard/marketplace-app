<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Shop;
use App\Models\User;
use App\Models\VerificationRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class RoleController extends Controller
{
    public function createShop(): Response { return Inertia::render('Seller/CreateShop'); }

    public function storeShop(Request $request): RedirectResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:180'], 'description' => ['nullable', 'string', 'max:10000'], 'phone' => ['required', 'string', 'max:30'], 'address' => ['required', 'string', 'max:1000']]);
        DB::transaction(function () use ($request, $data): void {
            $owner = User::query()->lockForUpdate()->findOrFail($request->user()->id);
            abort_if($owner->shop()->exists(), 409, 'This account already has a shop.');
            $base = Str::slug($data['name']) ?: 'shop'; $slug = $base; $n = 2;
            while (Shop::where('slug', $slug)->exists()) $slug = $base.'-'.($n++);
            Shop::create([...$data, 'owner_id' => $owner->id, 'slug' => $slug, 'verification_status' => 'pending', 'verified' => false]);
            if (!$owner->isAdmin()) $owner->update(['role' => User::ROLE_SELLER]);
        });
        return redirect('/seller/verification')->with('success', 'Shop created. Submit your verification documents to continue.');
    }

    public function verification(Request $request): Response
    {
        $shop = $request->user()->shop()->with('verificationRequests')->firstOrFail();
        return Inertia::render('Seller/Verification', ['shop' => $shop, 'requests' => $shop->verificationRequests()->latest()->get()]);
    }

    public function submitVerification(Request $request): RedirectResponse
    {
        $data = $request->validate(['evidence' => ['required', 'array', 'min:1', 'max:5'], 'evidence.*' => ['required', 'url', 'max:2048'], 'note' => ['nullable', 'string', 'max:5000']]);
        $shop = $request->user()->shop;
        abort_unless($shop, 404);
        DB::transaction(function () use ($request, $shop, $data): void {
            $locked = Shop::query()->lockForUpdate()->findOrFail($shop->id);
            abort_if($locked->verified, 422, 'This shop is already verified.');
            abort_if($locked->verificationRequests()->where('status', 'pending')->exists(), 422, 'A verification request is already pending.');
            $locked->update(['verification_status' => 'pending', 'rejection_note' => null]);
            VerificationRequest::create(['shop_id' => $locked->id, 'submitted_by' => $request->user()->id, 'status' => 'pending', 'evidence' => $data['evidence'], 'note' => $data['note'] ?? null]);
        });
        return back()->with('success', 'Verification request submitted.');
    }

    public function adminVerifications(Request $request): Response
    {
        return Inertia::render('Admin/Verifications', ['requests' => VerificationRequest::with(['shop:id,name,owner_id,verification_status', 'submitter:id,name,email'])->latest()->paginate(20)->withQueryString()]);
    }

    public function reviewVerification(Request $request, VerificationRequest $verification): RedirectResponse
    {
        $data = $request->validate(['decision' => ['required', 'in:approved,rejected'], 'note' => ['nullable', 'string', 'max:5000']]);
        DB::transaction(function () use ($request, $verification, $data): void {
            $locked = VerificationRequest::query()->lockForUpdate()->findOrFail($verification->id);
            abort_if($locked->status !== 'pending', 422, 'Only pending requests can be reviewed.');
            $shop = Shop::query()->lockForUpdate()->findOrFail($locked->shop_id); $approved = $data['decision'] === 'approved';
            $shop->update(['verification_status' => $approved ? 'approved' : 'rejected', 'verified' => $approved, 'rejection_note' => $approved ? null : ($data['note'] ?? 'Verification request rejected.')]);
            $locked->update(['status' => $data['decision'], 'note' => $data['note'] ?? $locked->note, 'reviewed_by' => $request->user()->id, 'reviewed_at' => now()]);
        });
        return back()->with('success', 'Verification request reviewed.');
    }
}
