<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shop;
use App\Models\User;
use App\Models\VerificationRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VerificationController extends Controller
{
    public function mine(Request $request): JsonResponse
    {
        $shop = $request->user()->shop;
        abort_unless($shop, 404, 'Create a shop before submitting verification.');

        return response()->json(['requests' => $shop->verificationRequests()->latest()->get()]);
    }

    public function submit(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_license_url' => ['required', 'url', 'max:2048'],
            'nrc_front_url' => ['required', 'url', 'max:2048'],
            'nrc_back_url' => ['required', 'url', 'max:2048'],
            'selfie_url' => ['required', 'url', 'max:2048'],
            'evidence' => ['sometimes', 'array', 'max:5'],
            'evidence.*' => ['url', 'max:2048'],
            'note' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ]);

        $shop = $request->user()->shop;
        abort_unless($shop, 404, 'Create a shop before submitting verification.');
        if ($shop->verified) {
            throw ValidationException::withMessages(['shop' => ['This shop is already verified.']]);
        }

        $verification = DB::transaction(function () use ($request, $shop, $data): VerificationRequest {
            $lockedShop = Shop::query()->lockForUpdate()->findOrFail($shop->id);
            $pending = $lockedShop->verificationRequests()->where('status', 'pending')->first();
            if ($pending) {
                throw ValidationException::withMessages(['verification' => ['A verification request is already pending.']]);
            }

            $lockedShop->update([
                'verification_status' => 'pending',
                'rejection_note' => null,
                'business_license_url' => $data['business_license_url'],
                'nrc_front_url' => $data['nrc_front_url'],
                'nrc_back_url' => $data['nrc_back_url'],
                'selfie_url' => $data['selfie_url'],
            ]);

            return VerificationRequest::create([
                'shop_id' => $lockedShop->id,
                'submitted_by' => $request->user()->id,
                'status' => 'pending',
                'evidence' => $data['evidence'] ?? [
                    'business_license' => $data['business_license_url'],
                    'nrc_front' => $data['nrc_front_url'],
                    'nrc_back' => $data['nrc_back_url'],
                    'selfie' => $data['selfie_url'],
                ],
                'note' => $data['note'] ?? null,
            ]);
        });

        return response()->json(['verification' => $verification], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $query = VerificationRequest::with(['shop:id,name,owner_id,verification_status', 'submitter:id,name,email'])->latest();
        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return response()->json($query->paginate(min($request->integer('per_page', 20), 100)));
    }

    public function review(Request $request, VerificationRequest $verification): JsonResponse
    {
        $data = $request->validate([
            'decision' => ['required', 'in:approved,rejected'],
            'note' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ]);

        $result = DB::transaction(function () use ($request, $verification, $data): VerificationRequest {
            $locked = VerificationRequest::query()->lockForUpdate()->findOrFail($verification->id);
            if ($locked->status !== 'pending') {
                throw ValidationException::withMessages(['verification' => ['Only pending requests can be reviewed.']]);
            }

            $shop = Shop::query()->lockForUpdate()->findOrFail($locked->shop_id);
            $approved = $data['decision'] === 'approved';
            $shop->update([
                'verification_status' => $approved ? 'approved' : 'rejected',
                'verified' => $approved,
                'rejection_note' => $approved ? null : ($data['note'] ?? 'Verification request rejected.'),
            ]);
            $shop->owner()->update([
                'role' => User::ROLE_SELLER,
            ]);
            $locked->update([
                'status' => $data['decision'],
                'note' => $data['note'] ?? $locked->note,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ]);

            return $locked->fresh()->load('shop');
        });

        return response()->json(['verification' => $result]);
    }
}
