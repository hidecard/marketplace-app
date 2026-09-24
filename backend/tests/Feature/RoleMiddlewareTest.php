<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RoleMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_defaults_to_an_active_user_role(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Buyer',
            'email' => 'buyer@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertCreated()->assertJsonPath('user.role', 'user')->assertJsonPath('user.status', 'active');
        $this->assertDatabaseHas('users', ['email' => 'buyer@example.com', 'role' => 'user', 'status' => 'active']);
    }

    public function test_user_cannot_access_seller_or_admin_routes(): void
    {
        $user = User::factory()->create(['role' => 'user', 'status' => 'active']);
        Sanctum::actingAs($user);

        $this->getJson('/api/seller/me')->assertForbidden();
        $this->getJson('/api/admin/me')->assertForbidden();
        $this->getJson('/api/user/me')->assertOk();
    }

    public function test_seller_can_access_seller_but_not_admin_routes(): void
    {
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        Sanctum::actingAs($seller);

        $this->getJson('/api/seller/me')->assertOk()->assertJsonPath('user.role', 'seller');
        $this->getJson('/api/admin/me')->assertForbidden();
    }

    public function test_only_an_active_admin_can_access_admin_routes(): void
    {
        $suspendedAdmin = User::factory()->create(['role' => 'admin', 'status' => 'suspended']);
        Sanctum::actingAs($suspendedAdmin);
        $this->getJson('/api/admin/me')->assertForbidden();

        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        Sanctum::actingAs($admin);
        $this->getJson('/api/admin/me')->assertOk()->assertJsonPath('user.role', 'admin');
    }
}
