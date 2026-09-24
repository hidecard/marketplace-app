<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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
        if (!$user || !Hash::check($credentials['password'], $user->password)) {
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
        ]);

        $request->user()->fill($data)->save();

        return response()->json(['user' => $request->user()->fresh()]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $request->user();
        if (!Hash::check($data['current_password'], $user->password)) {
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
}
