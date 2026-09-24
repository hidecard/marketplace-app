<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductOrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_a_seller_can_create_a_product(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_USER]);
        Sanctum::actingAs($user);
        $this->postJson('/api/seller/products', [
            'title' => 'Blocked Product', 'price' => 100, 'stock' => 1, 'condition' => 'new',
        ])->assertForbidden();

        $seller = User::factory()->create(['role' => User::ROLE_SELLER]);
        Sanctum::actingAs($seller);
        $this->postJson('/api/seller/products', [
            'title' => 'Seller Product', 'price' => 100, 'stock' => 3, 'condition' => 'new',
        ])->assertCreated()->assertJsonPath('product.seller_id', $seller->id);
    }

    public function test_order_uses_server_price_decrements_stock_and_replays_idempotently(): void
    {
        $seller = User::factory()->create(['role' => User::ROLE_SELLER]);
        $buyer = User::factory()->create(['role' => User::ROLE_USER]);
        $product = Product::create([
            'seller_id' => $seller->id,
            'title' => 'Authoritative Product',
            'slug' => 'authoritative-product',
            'price' => 1250,
            'stock' => 4,
            'condition' => 'new',
            'status' => 'active',
        ]);
        Sanctum::actingAs($buyer);

        $payload = [
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
            'delivery_address' => ['name' => 'Buyer', 'phone' => '+959123456789', 'address' => 'Yangon'],
            'payment_method' => 'cod',
            'idempotency_key' => 'checkout-test-1',
        ];

        $first = $this->postJson('/api/orders', $payload)
            ->assertCreated()->assertJsonPath('order.total', '2500.00');
        $orderId = $first->json('order.id');
        $this->assertEquals(2, $product->fresh()->stock);

        $this->postJson('/api/orders', $payload)
            ->assertOk()->assertJsonPath('replayed', true)->assertJsonPath('order.id', $orderId);
        $this->assertEquals(2, $product->fresh()->stock);
    }

    public function test_shop_product_requires_approved_owner(): void
    {
        $seller = User::factory()->create(['role' => User::ROLE_SELLER]);
        $shop = Shop::create(['owner_id' => $seller->id, 'name' => 'Pending', 'slug' => 'pending-shop', 'verified' => false, 'verification_status' => 'pending']);
        Sanctum::actingAs($seller);

        $this->postJson('/api/seller/products', [
            'title' => 'Shop Product', 'price' => 100, 'stock' => 1, 'condition' => 'new', 'shop_id' => $shop->id,
        ])->assertForbidden();
    }
}
