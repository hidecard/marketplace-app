<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\DeliveryFee;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Tests\TestCase;

class WebCheckoutPaymentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(PreventRequestForgery::class);
    }

    public function test_buyer_can_place_cod_order_with_server_delivery_fee_and_stock_decrement(): void
    {
        $buyer = User::factory()->create(['role' => User::ROLE_USER]);
        $seller = User::factory()->create(['role' => User::ROLE_SELLER]);
        $product = Product::create([
            'seller_id' => $seller->id,
            'name' => 'Checkout Product',
            'slug' => 'checkout-product',
            'price' => 1000,
            'stock' => 4,
            'condition' => 'new',
            'status' => 'active',
        ]);
        DeliveryFee::create(['name' => 'Standard', 'amount' => 1500, 'free_shipping_threshold' => 5000, 'is_active' => true]);

        $response = $this->actingAs($buyer)->withSession(['cart' => [$product->id => 2]])->post('/checkout', [
            'name' => 'Buyer',
            'phone' => '09123456789',
            'address' => 'Yangon',
            'payment_method' => 'cod',
        ]);
        $order = Order::query()->latest('id')->first();
        $response->assertRedirect('/orders/'.$order->id);
        $this->assertSame(2, $product->fresh()->stock);
        $this->assertSame('cod', $order->payment_method);
        $this->assertSame('1500.00', $order->delivery_fee);
        $this->assertSame('3500.00', $order->total);
        $this->assertSame([], session('cart', []));
    }

    public function test_checkout_rejects_another_users_saved_address_and_non_cod_payment(): void
    {
        $buyer = User::factory()->create(['role' => User::ROLE_USER]);
        $other = User::factory()->create(['role' => User::ROLE_USER]);
        $seller = User::factory()->create(['role' => User::ROLE_SELLER]);
        $product = Product::create([
            'seller_id' => $seller->id,
            'name' => 'Address Product',
            'slug' => 'address-product',
            'price' => 500,
            'stock' => 2,
            'condition' => 'new',
            'status' => 'active',
        ]);
        $address = Address::create(['user_id' => $other->id, 'label' => 'Other', 'recipient_name' => 'Other', 'phone' => '09000000000', 'address' => 'Other address']);

        $this->actingAs($buyer)->withSession(['cart' => [$product->id => 1]])->post('/checkout', [
            'address_id' => $address->id,
            'payment_method' => 'cod',
        ])->assertSessionHasErrors('address_id');

        $this->actingAs($buyer)->withSession(['cart' => [$product->id => 1]])->post('/checkout', [
            'name' => 'Buyer', 'phone' => '09123456789', 'address' => 'Yangon', 'payment_method' => 'kbzpay',
        ])->assertSessionHasErrors('payment_method');

        $this->assertSame(2, $product->fresh()->stock);
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_checkout_rejects_products_from_multiple_sellers_without_changing_stock(): void
    {
        $buyer = User::factory()->create(['role' => User::ROLE_USER]);
        $sellerA = User::factory()->create(['role' => User::ROLE_SELLER]);
        $sellerB = User::factory()->create(['role' => User::ROLE_SELLER]);
        $productA = Product::create(['seller_id' => $sellerA->id, 'name' => 'A', 'slug' => 'a', 'price' => 100, 'stock' => 3, 'condition' => 'new', 'status' => 'active']);
        $productB = Product::create(['seller_id' => $sellerB->id, 'name' => 'B', 'slug' => 'b', 'price' => 200, 'stock' => 3, 'condition' => 'new', 'status' => 'active']);

        $this->actingAs($buyer)->withSession(['cart' => [$productA->id => 1, $productB->id => 1]])->post('/checkout', [
            'name' => 'Buyer', 'phone' => '09123456789', 'address' => 'Yangon', 'payment_method' => 'cod',
        ])->assertSessionHasErrors('cart');

        $this->assertSame(3, $productA->fresh()->stock);
        $this->assertSame(3, $productB->fresh()->stock);
        $this->assertDatabaseCount('orders', 0);
    }
}
