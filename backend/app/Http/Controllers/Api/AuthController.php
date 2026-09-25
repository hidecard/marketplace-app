<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PhoneOtp;
use App\Models\PhoneOtpChallenge;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
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

    public function sendOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone_number' => ['required', 'string', 'max:30', 'regex:/^[\d\s\-\+\(\)]+$/'],
            'purpose' => ['required', 'in:verification,login,password_reset'],
        ]);

        $phoneNumber = $this->normalizePhoneNumber($data['phone_number']);
        $purpose = $data['purpose'];

        if ($purpose === 'verification') {
            $existingUser = User::where('phone_number', $phoneNumber)->first();
            if ($existingUser && $existingUser->phone_verified) {
                return response()->json(['message' => 'This phone number is already verified.'], 422);
            }
        }

        if ($purpose === 'login') {
            $user = User::where('phone_number', $phoneNumber)->first();
            if (! $user) {
                return response()->json(['message' => 'No account found with this phone number.'], 404);
            }
        }

        if ($purpose === 'password_reset') {
            $user = User::where('phone_number', $phoneNumber)->first();
            if (! $user) {
                return response()->json(['message' => 'No account found with this phone number.'], 404);
            }
        }

        $otp = PhoneOtp::createOtp($phoneNumber, $purpose);

        // TODO: Integrate with SMS provider (e.g., Twilio, Vonage, or local Myanmar SMS gateway)
        // For now, return the code in development mode
        $isDevelopment = config('app.env') === 'local' || config('app.debug');

        return response()->json([
            'message' => 'OTP sent successfully.',
            'expires_in' => 600, // 10 minutes in seconds
            'dev_code' => $isDevelopment ? $otp->code : null,
        ]);
    }

    public function verifyOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone_number' => ['required', 'string', 'max:30', 'regex:/^[\d\s\-\+\(\)]+$/'],
            'code' => ['required', 'string', 'size:6'],
            'purpose' => ['required', 'in:verification,login,password_reset'],
        ]);

        $phoneNumber = $this->normalizePhoneNumber($data['phone_number']);
        $code = $data['code'];
        $purpose = $data['purpose'];

        $otp = PhoneOtp::where('phone_number', $phoneNumber)
            ->where('purpose', $purpose)
            ->where('verified_at', null)
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if (! $otp) {
            return response()->json(['message' => 'Invalid or expired OTP.'], 422);
        }

        if (! $otp->verify($code)) {
            return response()->json(['message' => 'Invalid or expired OTP.'], 422);
        }

        if ($purpose === 'verification') {
            $user = User::where('phone_number', $phoneNumber)->first();
            if ($user) {
                $user->update(['phone_verified' => true, 'phone_number' => $phoneNumber]);
            }
        }

        if ($purpose === 'login') {
            $user = User::where('phone_number', $phoneNumber)->first();
            if (! $user || $user->status !== 'active') {
                return response()->json(['message' => 'Account not found or inactive.'], 404);
            }

            return $this->tokenResponse($user, 'mobile');
        }

        if ($purpose === 'password_reset') {
            $user = User::where('phone_number', $phoneNumber)->first();
            if (! $user) {
                return response()->json(['message' => 'Account not found.'], 404);
            }
            // Generate a temporary reset token (valid for 15 minutes)
            $resetToken = $user->createToken('password-reset', ['password_reset'], now()->addMinutes(15))->plainTextToken;

            return response()->json([
                'message' => 'OTP verified. Use the reset token to change password.',
                'reset_token' => $resetToken,
            ]);
        }

        return response()->json(['message' => 'OTP verified successfully.']);
    }

    public function linkPhone(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone_number' => ['required', 'string', 'max:30', 'regex:/^[\d\s\-\+\(\)]+$/'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        $phoneNumber = $this->normalizePhoneNumber($data['phone_number']);
        $code = $data['code'];

        $otp = PhoneOtp::where('phone_number', $phoneNumber)
            ->where('purpose', 'verification')
            ->where('verified_at', null)
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if (! $otp || ! $otp->verify($code)) {
            return response()->json(['message' => 'Invalid or expired OTP.'], 422);
        }

        $existingUser = User::where('phone_number', $phoneNumber)->first();
        if ($existingUser && $existingUser->id !== $request->user()->id) {
            return response()->json(['message' => 'This phone number is already linked to another account.'], 422);
        }

        $request->user()->update(['phone_number' => $phoneNumber, 'phone_verified' => true]);

        return response()->json(['user' => $request->user()->fresh()]);
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

    private function normalizePhoneNumber(string $phoneNumber): string
    {
        // Remove all non-digit characters except +
        $cleaned = preg_replace('/[^\d+]/', '', $phoneNumber);

        // Handle Myanmar numbers: +959xxxxxxxxx or 09xxxxxxxxx
        if (str_starts_with($cleaned, '+959')) {
            return $cleaned;
        }
        if (str_starts_with($cleaned, '959')) {
            return '+'.$cleaned;
        }
        if (str_starts_with($cleaned, '09')) {
            return '+95'.substr($cleaned, 1);
        }
        if (str_starts_with($cleaned, '9') && strlen($cleaned) === 9) {
            return '+959'.$cleaned;
        }

        return $cleaned;
    }
}
