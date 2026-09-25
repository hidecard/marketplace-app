<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    public function showLogin(): Response { return Inertia::render('Auth/Login'); }
    public function showRegister(): Response { return Inertia::render('Auth/Register'); }

    public function login(Request $request): RedirectResponse
    {
        $credentials = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string'], 'remember' => ['nullable', 'boolean']]);
        if (!Auth::attempt(['email' => $credentials['email'], 'password' => $credentials['password'], 'status' => User::STATUS_ACTIVE], (bool) ($credentials['remember'] ?? false))) {
            return back()->withErrors(['email' => 'These credentials do not match our records or the account is inactive.'])->onlyInput('email');
        }
        $request->session()->regenerate();
        return redirect()->intended('/dashboard');
    }

    public function register(Request $request): RedirectResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:120'], 'email' => ['required', 'email', 'max:255', 'unique:users,email'], 'password' => ['required', 'confirmed', Password::defaults()]]);
        $user = User::create(['name' => $data['name'], 'email' => $data['email'], 'password' => Hash::make($data['password']), 'role' => User::ROLE_USER, 'status' => User::STATUS_ACTIVE, 'phone_verified' => false]);
        Auth::login($user);
        $request->session()->regenerate();
        return redirect('/dashboard');
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect('/');
    }
}
