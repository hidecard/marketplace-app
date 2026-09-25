<?php

namespace Tests\Feature;

use App\Models\Expense;
use App\Models\Product;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminBypassTest extends TestCase
{
    use RefreshDatabase;

    private function setupSellerAndAdmin(): array
    {
        $seller = User::factory()->create(['role' => User::ROLE_SELLER]);
        $shop = Shop::create([
            'owner_id' => $seller->id,
            'name' => 'Verified Shop',
            'slug' => 'verified-shop',
            'phone' => '+9591',
            'address' => 'Yangon',
            'verified' => true,
            'verification_status' => 'approved',
        ]);
        $product = Product::create([
            'seller_id' => $seller->id,
            'shop_id' => $shop->id,
            'name' => 'Test Product',
            'slug' => 'test-product',
            'price' => 1000,
            'cost_price' => 600,
            'stock' => 10,
            'condition' => 'new',
            'status' => 'active',
        ]);
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        return [$seller, $shop, $product, $admin];
    }

    public function test_admin_can_adjust_inventory(): void
    {
        [$seller, $shop, $product, $admin] = $this->setupSellerAndAdmin();
        Sanctum::actingAs($admin);

        $payload = [
            'product_id' => $product->id,
            'quantity_delta' => 5,
            'reason' => 'admin restock',
            'idempotency_key' => 'admin-restock-1',
            'shop_id' => $shop->id,
        ];
        $this->postJson('/api/business/inventory/adjust', $payload)->assertCreated();
        $this->assertSame(15, $product->fresh()->stock);
    }

    public function test_admin_can_create_pos_sale(): void
    {
        [$seller, $shop, $product, $admin] = $this->setupSellerAndAdmin();
        Sanctum::actingAs($admin);

        $payload = [
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
            'discount' => 100,
            'tax' => 50,
            'payment_method' => 'cash',
            'idempotency_key' => 'admin-pos-1',
            'shop_id' => $shop->id,
        ];
        $this->postJson('/api/business/pos/sales', $payload)->assertCreated()
            ->assertJsonPath('sale.total', '1950.00')
            ->assertJsonPath('sale.gross_profit', '750.00');
        $this->assertSame(8, $product->fresh()->stock);
    }

    public function test_admin_can_create_expense(): void
    {
        [$seller, $shop, $product, $admin] = $this->setupSellerAndAdmin();
        Sanctum::actingAs($admin);

        $payload = [
            'amount' => 5000,
            'category' => 'transport',
            'description' => 'Admin delivery',
            'expense_date' => '2026-09-24',
            'idempotency_key' => 'admin-expense-1',
            'shop_id' => $shop->id,
        ];
        $this->postJson('/api/business/expenses', $payload)->assertCreated();
        $this->assertDatabaseCount('expenses', 1);
    }

    public function test_admin_can_delete_expense(): void
    {
        [$seller, $shop, $product, $admin] = $this->setupSellerAndAdmin();

        $expense = Expense::create([
            'shop_id' => $shop->id,
            'actor_id' => $seller->id,
            'amount' => 3000,
            'category' => 'supplies',
            'description' => 'Test expense',
            'expense_date' => '2026-09-24',
            'idempotency_key' => 'expense-to-delete',
        ]);

        Sanctum::actingAs($admin);
        $this->deleteJson("/api/business/expenses/{$expense->id}")->assertOk()
            ->assertJsonPath('message', 'Expense deleted');
        $this->assertDatabaseMissing('expenses', ['id' => $expense->id]);
    }

    public function test_seller_can_delete_own_expense(): void
    {
        [$seller, $shop, $product] = $this->setupSellerAndAdmin();

        $expense = Expense::create([
            'shop_id' => $shop->id,
            'actor_id' => $seller->id,
            'amount' => 3000,
            'category' => 'supplies',
            'description' => 'Test expense',
            'expense_date' => '2026-09-24',
            'idempotency_key' => 'seller-expense-to-delete',
        ]);

        Sanctum::actingAs($seller);
        $this->deleteJson("/api/business/expenses/{$expense->id}")->assertOk()
            ->assertJsonPath('message', 'Expense deleted');
        $this->assertDatabaseMissing('expenses', ['id' => $expense->id]);
    }

    public function test_seller_cannot_delete_other_shop_expense(): void
    {
        [$seller, $shop, $product, $admin] = $this->setupSellerAndAdmin();
        $otherSeller = User::factory()->create(['role' => User::ROLE_SELLER]);
        $otherShop = Shop::create([
            'owner_id' => $otherSeller->id,
            'name' => 'Other Shop',
            'slug' => 'other-shop',
            'phone' => '+9592',
            'address' => 'Mandalay',
            'verified' => true,
            'verification_status' => 'approved',
        ]);

        $expense = Expense::create([
            'shop_id' => $otherShop->id,
            'actor_id' => $otherSeller->id,
            'amount' => 3000,
            'category' => 'supplies',
            'description' => 'Other shop expense',
            'expense_date' => '2026-09-24',
            'idempotency_key' => 'other-shop-expense',
        ]);

        Sanctum::actingAs($seller);
        $this->deleteJson("/api/business/expenses/{$expense->id}")->assertForbidden();
        $this->assertDatabaseHas('expenses', ['id' => $expense->id]);
    }

    public function test_admin_can_delete_product(): void
    {
        [$seller, $shop, $product, $admin] = $this->setupSellerAndAdmin();
        Sanctum::actingAs($admin);

        $this->deleteJson("/api/seller/products/{$product->id}")->assertOk()
            ->assertJsonPath('message', 'Product hidden');
        $this->assertSame('hidden', $product->fresh()->status);
    }

    public function test_inventory_idempotency_is_shop_scoped(): void
    {
        [$seller, $shop, $product, $admin] = $this->setupSellerAndAdmin();
        $otherSeller = User::factory()->create(['role' => User::ROLE_SELLER]);
        $otherShop = Shop::create([
            'owner_id' => $otherSeller->id,
            'name' => 'Other Shop',
            'slug' => 'other-shop',
            'phone' => '+9592',
            'address' => 'Mandalay',
            'verified' => true,
            'verification_status' => 'approved',
        ]);
        $otherProduct = Product::create([
            'seller_id' => $otherSeller->id,
            'shop_id' => $otherShop->id,
            'name' => 'Other Product',
            'slug' => 'other-product',
            'price' => 2000,
            'cost_price' => 1000,
            'stock' => 5,
            'condition' => 'new',
            'status' => 'active',
        ]);

        // Same idempotency key, different shops - both should succeed
        Sanctum::actingAs($seller);
        $this->postJson('/api/business/inventory/adjust', [
            'product_id' => $product->id,
            'quantity_delta' => 5,
            'reason' => 'restock',
            'idempotency_key' => 'same-key',
        ])->assertCreated();

        Sanctum::actingAs($otherSeller);
        $this->postJson('/api/business/inventory/adjust', [
            'product_id' => $otherProduct->id,
            'quantity_delta' => 3,
            'reason' => 'restock',
            'idempotency_key' => 'same-key',
        ])->assertCreated();

        $this->assertSame(15, $product->fresh()->stock);
        $this->assertSame(8, $otherProduct->fresh()->stock);
    }

    public function test_pos_sale_idempotency_is_shop_scoped(): void
    {
        [$seller, $shop, $product, $admin] = $this->setupSellerAndAdmin();
        $otherSeller = User::factory()->create(['role' => User::ROLE_SELLER]);
        $otherShop = Shop::create([
            'owner_id' => $otherSeller->id,
            'name' => 'Other Shop',
            'slug' => 'other-shop',
            'phone' => '+9592',
            'address' => 'Mandalay',
            'verified' => true,
            'verification_status' => 'approved',
        ]);
        $otherProduct = Product::create([
            'seller_id' => $otherSeller->id,
            'shop_id' => $otherShop->id,
            'name' => 'Other Product',
            'slug' => 'other-product',
            'price' => 2000,
            'cost_price' => 1000,
            'stock' => 5,
            'condition' => 'new',
            'status' => 'active',
        ]);

        // Same idempotency key, different shops - both should succeed
        Sanctum::actingAs($seller);
        $this->postJson('/api/business/pos/sales', [
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'payment_method' => 'cash',
            'idempotency_key' => 'same-pos-key',
        ])->assertCreated();

        Sanctum::actingAs($otherSeller);
        $this->postJson('/api/business/pos/sales', [
            'items' => [['product_id' => $otherProduct->id, 'quantity' => 1]],
            'payment_method' => 'cash',
            'idempotency_key' => 'same-pos-key',
        ])->assertCreated();

        $this->assertSame(9, $product->fresh()->stock);
        $this->assertSame(4, $otherProduct->fresh()->stock);
    }

    public function test_expense_idempotency_is_shop_scoped(): void
    {
        [$seller, $shop, $product, $admin] = $this->setupSellerAndAdmin();
        $otherSeller = User::factory()->create(['role' => User::ROLE_SELLER]);
        $otherShop = Shop::create([
            'owner_id' => $otherSeller->id,
            'name' => 'Other Shop',
            'slug' => 'other-shop',
            'phone' => '+9592',
            'address' => 'Mandalay',
            'verified' => true,
            'verification_status' => 'approved',
        ]);

        // Same idempotency key, different shops - both should succeed
        Sanctum::actingAs($seller);
        $this->postJson('/api/business/expenses', [
            'amount' => 1000,
            'category' => 'transport',
            'expense_date' => '2026-09-24',
            'idempotency_key' => 'same-expense-key',
        ])->assertCreated();

        Sanctum::actingAs($otherSeller);
        $this->postJson('/api/business/expenses', [
            'amount' => 2000,
            'category' => 'supplies',
            'expense_date' => '2026-09-24',
            'idempotency_key' => 'same-expense-key',
        ])->assertCreated();

        $this->assertDatabaseCount('expenses', 2);
    }

    public function test_order_idempotency_is_buyer_scoped(): void
    {
        $seller = User::factory()->create(['role' => User::ROLE_SELLER]);
        $buyer1 = User::factory()->create(['role' => User::ROLE_USER]);
        $buyer2 = User::factory()->create(['role' => User::ROLE_USER]);
        $product = Product::create([
            'seller_id' => $seller->id,
            'name' => 'Order Product',
            'slug' => 'order-product',
            'price' => 1000,
            'stock' => 10,
            'condition' => 'new',
            'status' => 'active',
        ]);

        // Same idempotency key, different buyers - both should succeed
        Sanctum::actingAs($buyer1);
        $this->postJson('/api/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'delivery_address' => ['name' => 'Buyer1', 'phone' => '+9591', 'address' => 'Yangon'],
            'payment_method' => 'cod',
            'idempotency_key' => 'same-order-key',
        ])->assertCreated();

        Sanctum::actingAs($buyer2);
        $this->postJson('/api/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'delivery_address' => ['name' => 'Buyer2', 'phone' => '+9592', 'address' => 'Mandalay'],
            'payment_method' => 'cod',
            'idempotency_key' => 'same-order-key',
        ])->assertCreated();

        $this->assertDatabaseCount('orders', 2);
    }
}
