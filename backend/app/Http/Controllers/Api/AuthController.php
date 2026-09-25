<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PhoneOtpChallenge;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'phone_number' => ['nullable', 'string', 'max:30'],
        ]);

        $user = User::create([
            ...$data,
            'password' => Hash::make($data['password']),
            'role' => 'user',
            'status' => 'active',
            'phone_verified' => false,
        ]);

        return $this->tokenResponse($user, 'web', 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();
        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => ['The provided credentials are incorrect.']]);
        }
        if ($user->status !== 'active') {
            return response()->json(['message' => 'This account is not active.', 'status' => $user->status], 403);
        }

        return $this->tokenResponse($user, 'web');
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out']);
    }

    public function logoutAll(Request $request): JsonResponse
    {
        $request->user()?->tokens()->delete();

        return response()->json(['message' => 'All sessions were logged out']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $request->user()]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'phone_number' => ['sometimes', 'nullable', 'string', 'max:30'],
            'region' => ['sometimes', 'nullable', 'string', 'max:120'],
        ]);

        $user = $request->user();
        if (array_key_exists('phone_number', $data) && $data['phone_number'] !== $user->phone_number) {
            $data['phone_verified'] = false;
            $data['profile_completed_at'] = null;
        }
        $user->fill($data)->save();

        return response()->json(['user' => $user->fresh()]);
    }

    public function requestPhoneOtp(Request $request): JsonResponse
    {
        $data = $request->validate(['phone_number' => ['required', 'string', 'max:30']]);
        $phone = trim($data['phone_number']);
        $user = $request->user();
        $existingUser = $user ?: User::where('phone_number', $phone)->first();

        $recent = PhoneOtpChallenge::where('phone_number', $phone)
            ->where('created_at', '>=', now()->subSeconds(60))
            ->exists();
        if ($recent) {
            return response()->json(['message' => 'Please wait before requesting another code.'], 429);
        }

        $code = (string) random_int(100000, 999999);
        $challenge = PhoneOtpChallenge::create([
            'user_id' => $existingUser?->id,
            'phone_number' => $phone,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(10),
            'request_ip' => $request->ip(),
        ]);

        // SMS credentials are intentionally not hard-coded. In local mode this is
        // available in the log for development; production must configure a provider.
        if (app()->environment('local', 'testing')) {
            Log::info('Phone OTP generated for local development', ['challenge_id' => $challenge->id, 'phone_number' => $phone, 'code' => $code]);
        }

        return response()->json([
            'message' => 'If this phone number is eligible, a verification code has been sent.',
            'challenge_id' => $challenge->id,
            'expires_in' => 600,
            'delivery' => app()->environment('local', 'testing') ? 'log' : 'provider_pending',
        ], 202);
    }

    public function verifyPhoneOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'challenge_id' => ['required', 'integer', 'exists:phone_otp_challenges,id'],
            'code' => ['required', 'digits:6'],
        ]);

        $result = DB::transaction(function () use ($request, $data): User {
            $challenge = PhoneOtpChallenge::query()->lockForUpdate()->findOrFail($data['challenge_id']);
            if ($request->user() && $challenge->user_id && $challenge->user_id !== $request->user()->id) {
                abort(403, 'This OTP challenge belongs to another account.');
            }
            if (! $challenge->verifyCode($data['code'])) {
                throw ValidationException::withMessages(['code' => ['The code is invalid, expired, or has reached its attempt limit.']]);
            }

            $user = $request->user() ?: User::where('phone_number', $challenge->phone_number)->first();
            if (! $user) {
                throw ValidationException::withMessages(['phone_number' => ['Complete registration before verifying this phone number.']]);
            }
            $user->update(['phone_number' => $challenge->phone_number, 'phone_verified' => true]);
            return $user->fresh();
        });

        return response()->json(['user' => $result]);
    }

    public function completeProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone_number' => ['required', 'string', 'max:30'],
            'region' => ['required', 'string', 'max:120'],
        ]);
        $user = $request->user();
        if (! $user->phone_verified || $user->phone_number !== $data['phone_number']) {
            throw ValidationException::withMessages(['phone_number' => ['Verify this phone number before completing your profile.']]);
        }
        $user->update([...$data, 'profile_completed_at' => Carbon::now()]);
        return response()->json(['user' => $user->fresh()]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $request->user();
        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages(['current_password' => ['The current password is incorrect.']]);
        }

        $user->update(['password' => Hash::make($data['password'])]);
        $user->tokens()->delete();

        return $this->tokenResponse($user->fresh(), 'web');
    }

    private function tokenResponse(User $user, string $device, int $status = 200): JsonResponse
    {
        $ability = match ($user->role) {
            User::ROLE_ADMIN => 'admin',
            User::ROLE_SELLER => 'seller',
            default => 'user',
        };

        return response()->json([
            'user' => $user,
            'token' => $user->createToken($device, [$ability])->plainTextToken,
            'ability' => $ability,
        ], $status);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        $status = Password::sendResetLink($request->only('email'));

        return $status === Password::RESET_LINK_SENT
            ? response()->json(['message' => __($status)])
            : response()->json(['message' => __($status)], 400);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill(['password' => Hash::make($password)])->save();
                $user->tokens()->delete();
            }
        );

        return $status === Password::PASSWORD_RESET
            ? response()->json(['message' => __($status)])
            : response()->json(['message' => __($status)], 400);
    }
}
