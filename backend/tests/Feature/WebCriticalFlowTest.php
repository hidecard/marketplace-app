<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WebCriticalFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(PreventRequestForgery::class);
    }

    public function test_buyer_can_register_through_the_web_flow(): void
    {
        $this->post('/register', [
            'name' => 'Web Buyer',
            'email' => 'web-buyer@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'phone_number' => '+959123456789',
            'account_type' => 'buyer',
        ])->assertRedirect('/dashboard');

        $this->assertAuthenticated();
        $this->assertDatabaseHas('users', [
            'email' => 'web-buyer@example.com',
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
            'phone_verified' => 0,
        ]);
    }

    public function test_seller_registration_creates_pending_shop_and_routes_to_verification(): void
    {
        $this->post('/register', [
            'name' => 'Web Seller',
            'email' => 'web-seller@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'phone_number' => '+959111111111',
            'account_type' => 'seller',
            'shop_name' => 'Web Seller Shop',
        ])->assertRedirect('/seller/verification');

        $seller = User::where('email', 'web-seller@example.com')->firstOrFail();
        $this->assertAuthenticatedAs($seller);
        $this->assertDatabaseHas('shops', [
            'owner_id' => $seller->id,
            'slug' => 'web-seller-shop',
            'verification_status' => 'pending',
            'verified' => 0,
        ]);
    }

    public function test_seller_can_submit_verification_through_the_web_flow(): void
    {
        $seller = User::factory()->create(['role' => User::ROLE_SELLER]);
        $shop = Shop::create([
            'owner_id' => $seller->id,
            'name' => 'Web Verification Shop',
            'slug' => 'web-verification-shop',
            'phone' => '+959122222222',
            'address' => 'Yangon',
            'verification_status' => 'pending',
            'verified' => false,
        ]);

        $this->actingAs($seller)->post('/seller/verification', [
            'evidence' => [
                'https://example.com/license.jpg',
                'https://example.com/nrc-front.jpg',
                'https://example.com/nrc-back.jpg',
                'https://example.com/selfie.jpg',
            ],
            'note' => 'Please review this application.',
        ])->assertRedirect('/');

        $this->assertDatabaseHas('verification_requests', [
            'shop_id' => $shop->id,
            'submitted_by' => $seller->id,
            'status' => 'pending',
        ]);
    }

    public function test_public_product_listing_is_available_without_authentication(): void
    {
        $seller = User::factory()->create(['role' => User::ROLE_SELLER]);
        $shop = Shop::create([
            'owner_id' => $seller->id,
            'name' => 'Public Listing Shop',
            'slug' => 'public-listing-shop',
            'phone' => '+959133333333',
            'address' => 'Mandalay',
            'verification_status' => 'approved',
            'verified' => true,
        ]);
        Product::create([
            'seller_id' => $seller->id,
            'shop_id' => $shop->id,
            'name' => 'Public Listing Product',
            'title' => 'Public Listing Product',
            'slug' => 'public-listing-product',
            'price' => 1500,
            'stock' => 5,
            'condition' => 'new',
            'status' => 'active',
        ]);

        $this->get('/products?q=Public+Listing')->assertOk();
    }
}
