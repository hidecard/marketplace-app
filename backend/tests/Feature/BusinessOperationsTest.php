<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BusinessOperationsTest extends TestCase
{
    use RefreshDatabase;

    private function verifiedSeller(): array
    {
        $seller = User::factory()->create(['role' => User::ROLE_SELLER]);
        $shop = Shop::create(['owner_id' => $seller->id, 'name' => 'Verified Shop', 'slug' => 'verified-shop', 'phone' => '+9591', 'address' => 'Yangon', 'verified' => true, 'verification_status' => 'approved']);
        $product = Product::create(['seller_id' => $seller->id, 'shop_id' => $shop->id, 'name' => 'POS Product', 'slug' => 'pos-product', 'price' => 1000, 'cost_price' => 600, 'stock' => 10, 'condition' => 'new', 'status' => 'active']);

        return [$seller, $shop, $product];
    }

    public function test_unverified_seller_cannot_use_business_operations(): void
    {
        $seller = User::factory()->create(['role' => User::ROLE_SELLER]);
        Shop::create(['owner_id' => $seller->id, 'name' => 'Pending Shop', 'slug' => 'pending-business-shop', 'phone' => '+9591', 'address' => 'Yangon']);
        Sanctum::actingAs($seller);
        $this->getJson('/api/business/inventory')->assertForbidden();
    }

    public function test_inventory_adjustment_is_transactional_and_idempotent(): void
    {
        [$seller, $shop, $product] = $this->verifiedSeller();
        Sanctum::actingAs($seller);
        $payload = ['product_id' => $product->id, 'quantity_delta' => 5, 'reason' => 'restock', 'idempotency_key' => 'restock-1'];
        $this->postJson('/api/business/inventory/adjust', $payload)->assertCreated();
        $this->postJson('/api/business/inventory/adjust', $payload)->assertOk()->assertJsonPath('replayed', true);
        $this->assertSame(15, $product->fresh()->stock);
    }

    public function test_pos_sale_uses_server_prices_and_calculates_profit(): void
    {
        [$seller, $shop, $product] = $this->verifiedSeller();
        Sanctum::actingAs($seller);
        $this->postJson('/api/business/pos/sales', [
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
            'discount' => 100,
            'tax' => 50,
            'payment_method' => 'cash',
            'idempotency_key' => 'pos-1',
        ])->assertCreated()->assertJsonPath('sale.total', '1950.00')->assertJsonPath('sale.gross_profit', '750.00');
        $this->assertSame(8, $product->fresh()->stock);
    }

    public function test_expense_creation_is_idempotent(): void
    {
        [$seller] = $this->verifiedSeller();
        Sanctum::actingAs($seller);
        $payload = ['amount' => 5000, 'category' => 'transport', 'description' => 'Delivery', 'expense_date' => '2026-09-24', 'idempotency_key' => 'expense-1'];
        $this->postJson('/api/business/expenses', $payload)->assertCreated();
        $this->postJson('/api/business/expenses', $payload)->assertOk()->assertJsonPath('replayed', true);
        $this->assertDatabaseCount('expenses', 1);
    }
}
