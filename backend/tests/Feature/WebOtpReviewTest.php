<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\PhoneOtpChallenge;
use App\Models\Product;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class WebOtpReviewTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(PreventRequestForgery::class);
    }

    public function test_profile_otp_request_returns_a_usable_demo_code_and_verification_completes(): void
    {
        config(['services.phone_otp.driver' => 'log', 'services.phone_otp.expose_code' => true]);
        $user = User::factory()->create(['phone_verified' => false]);

        $response = $this->actingAs($user)->post('/profile/phone/request', ['phone_number' => '09123456789']);
        $response->assertRedirect()->assertSessionHas('otp_challenge_id')->assertSessionHas('otp_code');

        $challengeId = (int) $response->getSession()->get('otp_challenge_id');
        $code = (string) $response->getSession()->get('otp_code');
        $challenge = PhoneOtpChallenge::findOrFail($challengeId);
        $this->assertTrue(Hash::check($code, $challenge->code_hash));

        $this->actingAs($user)->post('/profile/phone/verify', ['challenge_id' => $challengeId, 'code' => $code])
            ->assertRedirect()->assertSessionHas('success');
        $this->assertTrue((bool) $user->fresh()->phone_verified);
        $this->assertSame('09123456789', $user->fresh()->phone_number);
    }

    public function test_completed_buyer_can_open_selected_review_page_and_submit_review(): void
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->create(['role' => User::ROLE_SELLER]);
        $shop = Shop::create(['owner_id' => $seller->id, 'name' => 'Review Shop', 'slug' => 'review-shop', 'verified' => true, 'verification_status' => 'approved']);
        $product = Product::create(['seller_id' => $seller->id, 'shop_id' => $shop->id, 'name' => 'Reviewed Product', 'slug' => 'reviewed-product', 'price' => 1000, 'stock' => 1, 'condition' => 'new', 'status' => 'active']);
        $order = Order::create(['order_number' => 'ORD-REVIEW-'.uniqid(), 'buyer_id' => $buyer->id, 'seller_id' => $seller->id, 'shop_id' => $shop->id, 'subtotal' => 1000, 'delivery_fee' => 0, 'discount' => 0, 'total' => 1000, 'payment_method' => 'cod', 'status' => 'completed', 'delivery_address' => ['name' => 'Buyer', 'phone' => '09123456789', 'address' => 'Yangon'], 'idempotency_key' => 'review-'.uniqid()]);
        $order->items()->create(['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 1000, 'line_total' => 1000]);

        $this->actingAs($buyer)->get('/reviews?product_id='.$product->id)->assertOk();
        $this->actingAs($buyer)->post('/products/'.$product->id.'/reviews', ['rating' => 5, 'body' => 'Excellent product'])->assertRedirect();
        $this->assertDatabaseHas('reviews', ['order_id' => $order->id, 'user_id' => $buyer->id, 'product_id' => $product->id, 'rating' => 5]);
    }
}
