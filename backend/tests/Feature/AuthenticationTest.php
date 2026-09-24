<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_receive_a_user_ability_token(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'New User',
            'email' => 'new@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertCreated()
            ->assertJsonPath('user.role', 'user')
            ->assertJsonPath('user.status', 'active')
            ->assertJsonPath('ability', 'user')
            ->assertJsonStructure(['token', 'user']);
    }

    public function test_active_user_can_login_and_inactive_user_is_rejected(): void
    {
        $user = User::factory()->create([
            'email' => 'login@example.com',
            'password' => Hash::make('password123'),
            'status' => 'active',
        ]);

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertOk()->assertJsonPath('ability', 'user');

        $user->update(['status' => 'suspended']);
        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertForbidden()->assertJsonPath('status', 'suspended');
    }

    public function test_authenticated_user_can_update_profile_and_change_password(): void
    {
        $user = User::factory()->create(['password' => Hash::make('old-password')]);
        Sanctum::actingAs($user);

        $this->patchJson('/api/auth/profile', ['name' => 'Updated Name', 'phone_number' => '+959123456789'])
            ->assertOk()
            ->assertJsonPath('user.name', 'Updated Name');

        $this->postJson('/api/auth/change-password', [
            'current_password' => 'old-password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertOk()->assertJsonStructure(['token', 'user']);

        $this->assertTrue(Hash::check('new-password', $user->fresh()->password));
    }

    public function test_authenticated_user_can_revoke_all_tokens(): void
    {
        $user = User::factory()->create();
        $user->createToken('one');
        $user->createToken('two');
        Sanctum::actingAs($user);

        $this->postJson('/api/auth/logout-all')->assertOk();
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}
