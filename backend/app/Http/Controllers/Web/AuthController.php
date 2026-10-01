<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\PhoneOtpChallenge;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password as PasswordBroker;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    public function showLogin(): Response
    {
        return Inertia::render('Auth/Login');
    }

    public function showRegister(): Response
    {
        return Inertia::render('Auth/Register');
    }

    public function login(Request $request): RedirectResponse
    {
        $credentials = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string'], 'remember' => ['nullable', 'boolean']]);
        if (! Auth::attempt(['email' => $credentials['email'], 'password' => $credentials['password'], 'status' => User::STATUS_ACTIVE], (bool) ($credentials['remember'] ?? false))) {
            return back()->withErrors(['email' => 'These credentials do not match our records or the account is inactive.'])->onlyInput('email');
        }
        $request->session()->regenerate();

        return redirect()->intended('/dashboard');
    }

    public function register(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'], 'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::defaults()], 'phone_number' => ['required', 'string', 'max:30'],
            'account_type' => ['required', 'in:buyer,seller'], 'shop_name' => ['nullable', 'required_if:account_type,seller', 'string', 'max:180'],
        ]);
        $user = DB::transaction(function () use ($data): User {
            $role = $data['account_type'] === 'seller' ? User::ROLE_SELLER : User::ROLE_USER;
            $user = User::create(['name' => $data['name'], 'email' => $data['email'], 'password' => Hash::make($data['password']), 'phone_number' => $data['phone_number'], 'role' => $role, 'status' => User::STATUS_ACTIVE, 'phone_verified' => false]);
            if ($role === User::ROLE_SELLER) {
                $base = Str::slug($data['shop_name']) ?: 'shop'; $slug = $base; $suffix = 2;
                while (Shop::where('slug', $slug)->exists()) $slug = $base.'-'.($suffix++);
                Shop::create(['owner_id' => $user->id, 'name' => $data['shop_name'], 'slug' => $slug, 'phone' => $data['phone_number'], 'verification_status' => 'pending', 'verified' => false]);
            }
            return $user;
        });
        Auth::login($user);
        $request->session()->regenerate();

        return redirect($user->isSeller() ? '/seller/verification' : '/dashboard');
    }

    public function sendPasswordReset(Request $request): RedirectResponse
    {
        $data = $request->validate(['email' => ['required', 'email']]);
        $status = PasswordBroker::sendResetLink(['email' => $data['email']]);
        if ($status !== PasswordBroker::RESET_LINK_SENT) return back()->withErrors(['email' => __($status)]);
        return back()->with('success', 'Password reset link sent. Check your email.');
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }

    public function showProfileCompletion(): Response
    {
        return Inertia::render('Auth/ProfileComplete', ['user' => Auth::user()]);
    }

    public function showProfile(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Profile/Index', [
            'profile' => [
                'name' => $user->name,
                'email' => $user->email,
                'phone_number' => $user->phone_number,
                'phone_verified' => (bool) $user->phone_verified,
                'role' => $user->role,
                'shop_verified' => (bool) ($user->shop?->verified ?? false),
            ],
            'stats' => [
                'orders' => Order::where('buyer_id', $user->id)->count(),
                'favorites' => Schema::hasTable('favorites') ? DB::table('favorites')->where('user_id', $user->id)->count() : 0,
            ],
        ]);
    }

    public function requestPhoneOtp(Request $request): RedirectResponse
    {
        $data = $request->validate(['phone_number' => ['required', 'string', 'max:30']]);
        $phone = trim($data['phone_number']);
        if (PhoneOtpChallenge::where('phone_number', $phone)->where('created_at', '>=', now()->subSeconds(60))->exists()) {
            return back()->withErrors(['phone_number' => 'Please wait before requesting another code.']);
        }
        $code = (string) random_int(100000, 999999);
        $challenge = PhoneOtpChallenge::create([
            'user_id' => $request->user()->id,
            'phone_number' => $phone,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(10),
            'request_ip' => $request->ip(),
        ]);
        if (app()->environment('local', 'testing')) {
            Log::info('Phone OTP generated for local development', ['challenge_id' => $challenge->id, 'phone_number' => $phone, 'code' => $code]);
        }

        return back()->with('success', 'Verification code sent. Enter the code from your SMS or verification provider.')->with('otp_challenge_id', $challenge->id);
    }

    public function verifyPhoneOtp(Request $request): RedirectResponse
    {
        $data = $request->validate(['challenge_id' => ['required', 'integer', 'exists:phone_otp_challenges,id'], 'code' => ['required', 'digits:6']]);
        DB::transaction(function () use ($request, $data): void {
            $challenge = PhoneOtpChallenge::query()->lockForUpdate()->findOrFail($data['challenge_id']);
            abort_unless((int) $challenge->user_id === (int) $request->user()->id, 403);
            if (! $challenge->verifyCode($data['code'])) {
                throw ValidationException::withMessages(['code' => 'The code is invalid, expired, or has reached its attempt limit.']);
            }
            $request->user()->update(['phone_number' => $challenge->phone_number, 'phone_verified' => true]);
        });

        return back()->with('success', 'Phone number verified. You can now complete your profile.');
    }

    public function completeProfile(Request $request): RedirectResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:120'], 'region' => ['required', 'string', 'max:120']]);
        abort_unless($request->user()->phone_verified, 422, 'Verify your phone number first.');
        $request->user()->update([...$data, 'profile_completed_at' => now()]);

        return redirect()->intended('/dashboard')->with('success', 'Profile completed successfully.');
    }
}
