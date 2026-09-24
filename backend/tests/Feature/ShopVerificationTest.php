<?php

namespace Tests\Feature;

use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ShopVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_one_shop_and_become_a_seller(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_USER]);
        Sanctum::actingAs($user);

        $this->postJson('/api/shop', [
            'name' => 'Example Shop',
            'description' => 'A test shop',
            'phone' => '+959123456789',
            'address' => 'Yangon',
        ])->assertCreated()->assertJsonPath('shop.verification_status', 'pending');

        $this->assertSame(User::ROLE_SELLER, $user->fresh()->role);
        $this->assertDatabaseHas('shops', ['owner_id' => $user->id, 'verified' => false]);
        $this->postJson('/api/shop', [
            'name' => 'Second Shop', 'phone' => '+959111111111', 'address' => 'Mandalay',
        ])->assertStatus(409);
    }

    public function test_seller_can_submit_one_pending_verification_and_resubmit_after_rejection(): void
    {
        $seller = User::factory()->create(['role' => User::ROLE_SELLER]);
        Shop::create(['owner_id' => $seller->id, 'name' => 'Seller Shop', 'slug' => 'seller-shop', 'phone' => '+9591', 'address' => 'Yangon']);
        Sanctum::actingAs($seller);

        $payload = ['evidence' => ['https://example.com/license.jpg'], 'note' => 'Please review.'];
        $this->postJson('/api/seller/verification', $payload)->assertCreated();
        $this->postJson('/api/seller/verification', $payload)->assertStatus(422);

        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        Sanctum::actingAs($admin);
        $verificationId = $seller->shop->verificationRequests()->first()->id;
        $this->postJson("/api/admin/verifications/{$verificationId}/review", ['decision' => 'rejected', 'note' => 'Use a clearer document.'])->assertOk();

        Sanctum::actingAs($seller);
        $this->postJson('/api/seller/verification', $payload)->assertCreated();
    }

    public function test_admin_approval_unlocks_verified_shop_state(): void
    {
        $seller = User::factory()->create(['role' => User::ROLE_SELLER]);
        $shop = Shop::create(['owner_id' => $seller->id, 'name' => 'Approval Shop', 'slug' => 'approval-shop', 'phone' => '+9592', 'address' => 'Yangon']);
        Sanctum::actingAs($seller);
        $this->postJson('/api/seller/verification', ['evidence' => ['https://example.com/document.png']])->assertCreated();
        $verification = $shop->verificationRequests()->first();

        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        Sanctum::actingAs($admin);
        $this->postJson("/api/admin/verifications/{$verification->id}/review", ['decision' => 'approved'])->assertOk();

        $this->assertDatabaseHas('shops', ['id' => $shop->id, 'verified' => true, 'verification_status' => 'approved']);
        $this->assertSame(User::ROLE_SELLER, $seller->fresh()->role);
    }
}
