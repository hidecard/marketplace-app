<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Tests\TestCase;

class WebAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(PreventRequestForgery::class);
    }

    public function test_order_detail_is_visible_only_to_buyer_seller_or_admin(): void
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->create(['role' => User::ROLE_SELLER]);
        $otherBuyer = User::factory()->create();
        $otherSeller = User::factory()->create(['role' => User::ROLE_SELLER]);
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $order = $this->makeOrder($buyer, $seller);

        $this->actingAs($buyer)->get('/orders/'.$order->id)->assertOk();
        $this->actingAs($seller)->get('/orders/'.$order->id)->assertOk();
        $this->actingAs($admin)->get('/orders/'.$order->id)->assertOk();
        $this->actingAs($otherBuyer)->get('/orders/'.$order->id)->assertForbidden();
        $this->actingAs($otherSeller)->get('/orders/'.$order->id)->assertForbidden();
    }

    public function test_seller_can_change_only_its_own_order_status(): void
    {
        $seller = User::factory()->create(['role' => User::ROLE_SELLER]);
        Shop::create(['owner_id' => $seller->id, 'name' => 'Verified Shop', 'slug' => 'verified-shop', 'verification_status' => 'approved', 'verified' => true]);
        $otherSeller = User::factory()->create(['role' => User::ROLE_SELLER]);
        $buyer = User::factory()->create();
        $ownOrder = $this->makeOrder($buyer, $seller);
        $otherOrder = $this->makeOrder($buyer, $otherSeller, 'ORD-OTHER');

        $this->actingAs($seller)->post('/seller/orders/'.$ownOrder->id.'/status/confirmed')->assertRedirect();
        $this->assertDatabaseHas('orders', ['id' => $ownOrder->id, 'status' => 'confirmed']);
        $this->actingAs($seller)->post('/seller/orders/'.$otherOrder->id.'/status/confirmed')->assertForbidden();
        $this->actingAs($seller)->post('/seller/orders/'.$ownOrder->id.'/status/not-a-status')->assertUnprocessable();
    }

    public function test_admin_can_change_any_order_but_cannot_change_own_account_status(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $buyer = User::factory()->create();
        $seller = User::factory()->create(['role' => User::ROLE_SELLER]);
        $order = $this->makeOrder($buyer, $seller);
        $otherUser = User::factory()->create();

        $this->actingAs($admin)->post('/admin/orders/'.$order->id.'/status/confirmed')->assertRedirect();
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'confirmed']);
        $this->actingAs($admin)->post('/admin/users/'.$otherUser->id.'/status/suspended')->assertRedirect();
        $this->assertDatabaseHas('users', ['id' => $otherUser->id, 'status' => 'suspended']);
        $this->actingAs($admin)->post('/admin/users/'.$admin->id.'/status/suspended')->assertUnprocessable();
    }

    public function test_unverified_seller_and_regular_user_cannot_enter_protected_operations(): void
    {
        $seller = User::factory()->create(['role' => User::ROLE_SELLER]);
        $user = User::factory()->create();

        $this->actingAs($seller)->get('/seller/orders')->assertForbidden();
        $this->actingAs($user)->get('/admin/users')->assertForbidden();
    }

    private function makeOrder(User $buyer, User $seller, ?string $number = null): Order
    {
        $shop = $seller->shop()->first() ?: Shop::create(['owner_id' => $seller->id, 'name' => 'Shop '.$seller->id, 'slug' => 'shop-'.$seller->id, 'verification_status' => 'approved', 'verified' => true]);
        $product = Product::create(['seller_id' => $seller->id, 'shop_id' => $shop->id, 'name' => 'Test Product '.$seller->id, 'title' => 'Test Product '.$seller->id, 'slug' => 'test-product-'.$seller->id.'-'.uniqid(), 'description' => 'Test', 'price' => 100, 'cost_price' => 50, 'stock' => 5, 'condition' => 'new', 'status' => 'active']);
        $order = Order::create(['order_number' => $number ?: 'ORD-'.strtoupper(uniqid()), 'buyer_id' => $buyer->id, 'seller_id' => $seller->id, 'shop_id' => $shop->id, 'subtotal' => 100, 'delivery_fee' => 0, 'discount' => 0, 'total' => 100, 'payment_method' => 'cod', 'status' => 'pending', 'delivery_address' => ['name' => 'Test Buyer', 'phone' => '09999999999', 'address' => 'Test address'], 'idempotency_key' => 'web-test-'.uniqid()]);
        $order->items()->create(['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100, 'line_total' => 100]);

        return $order;
    }
}
