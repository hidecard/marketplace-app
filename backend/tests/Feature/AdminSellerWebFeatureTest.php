<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Tests\TestCase;

class AdminSellerWebFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(PreventRequestForgery::class);
    }

    public function test_verified_seller_can_use_web_pos_and_expense_forms(): void
    {
        [$seller, $shop, $product] = $this->sellerShopProduct();

        $this->actingAs($seller)->post('/seller/pos', [
            'product_id' => $product->id,
            'quantity' => 2,
            'payment_method' => 'cash',
        ])->assertRedirect();

        $this->assertSame(8, $product->fresh()->stock);
        $this->assertDatabaseHas('pos_sales', ['shop_id' => $shop->id, 'seller_id' => $seller->id]);

        $this->actingAs($seller)->post('/seller/expenses', [
            'amount' => 2500,
            'category' => 'transport',
            'description' => 'Web form expense',
            'expense_date' => '2026-10-02',
        ])->assertRedirect();

        $this->assertDatabaseHas('expenses', [
            'shop_id' => $shop->id,
            'actor_id' => $seller->id,
            'amount' => 2500,
            'category' => 'transport',
        ]);
    }

    public function test_seller_inventory_and_product_mutations_are_owner_scoped(): void
    {
        [$seller, $shop, $product] = $this->sellerShopProduct();
        [$otherSeller, $otherShop, $otherProduct] = $this->sellerShopProduct('Other Shop', 'other-shop');

        $this->actingAs($seller)->post("/seller/inventory/{$product->id}/adjust", [
            'quantity_delta' => 4,
            'reason' => 'restock',
        ])->assertRedirect();
        $this->assertSame(14, $product->fresh()->stock);

        $this->actingAs($seller)->post("/seller/inventory/{$otherProduct->id}/adjust", [
            'quantity_delta' => 4,
            'reason' => 'unauthorized',
        ])->assertForbidden();
        $this->assertSame(10, $otherProduct->fresh()->stock);

        $this->actingAs($seller)->put("/seller/products/{$otherProduct->id}", [
            'title' => 'Unauthorized edit',
            'price' => 99,
            'stock' => 1,
            'condition' => 'new',
        ])->assertForbidden();
    }

    public function test_admin_can_moderate_shop_product_and_category_from_web(): void
    {
        [$seller, $shop, $product] = $this->sellerShopProduct('Pending Shop', 'pending-shop', false);
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $this->actingAs($admin)->post("/admin/shops/{$shop->id}/status/approved")
            ->assertRedirect();
        $this->assertDatabaseHas('shops', [
            'id' => $shop->id,
            'verification_status' => 'approved',
            'verified' => 1,
        ]);

        $this->actingAs($admin)->post("/admin/products/{$product->id}/status/hidden")
            ->assertRedirect();
        $this->assertDatabaseHas('products', ['id' => $product->id, 'status' => 'hidden']);

        $category = Category::create(['name' => 'Electronics', 'slug' => 'electronics', 'sort_order' => 1, 'is_active' => true]);
        $this->actingAs($admin)->post('/admin/categories', [
            'name' => 'Home Goods',
            'slug' => 'home-goods',
            'sort_order' => 2,
        ])->assertRedirect();
        $this->assertDatabaseHas('categories', ['slug' => 'home-goods', 'is_active' => 1]);

        $this->actingAs($admin)->post("/admin/categories/{$category->id}/toggle")
            ->assertRedirect();
        $this->assertDatabaseHas('categories', ['id' => $category->id, 'is_active' => 0]);

        $this->actingAs($admin)->delete("/admin/categories/{$category->id}")
            ->assertRedirect();
        $this->assertDatabaseMissing('categories', ['id' => $category->id]);
    }

    public function test_regular_user_cannot_reach_admin_web_moderation(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_USER]);
        $category = Category::create(['name' => 'Blocked', 'slug' => 'blocked', 'sort_order' => 0, 'is_active' => true]);

        $this->actingAs($user)->get('/admin/products')->assertForbidden();
        $this->actingAs($user)->post('/admin/categories', ['name' => 'Nope'])->assertForbidden();
        $this->actingAs($user)->delete("/admin/categories/{$category->id}")->assertForbidden();
    }

    /** @return array{0: User, 1: Shop, 2: Product} */
    private function sellerShopProduct(string $name = 'Verified Shop', string $slug = 'verified-shop', bool $verified = true): array
    {
        $seller = User::factory()->create(['role' => User::ROLE_SELLER]);
        $shop = Shop::create([
            'owner_id' => $seller->id,
            'name' => $name,
            'slug' => $slug.'-'.$seller->id,
            'phone' => '+9591',
            'address' => 'Yangon',
            'verified' => $verified,
            'verification_status' => $verified ? 'approved' : 'pending',
        ]);
        $product = Product::create([
            'seller_id' => $seller->id,
            'shop_id' => $shop->id,
            'title' => 'Web Product',
            'name' => 'Web Product',
            'slug' => 'web-product-'.$seller->id,
            'price' => 1000,
            'cost_price' => 600,
            'stock' => 10,
            'condition' => 'new',
            'status' => 'active',
        ]);

        return [$seller, $shop, $product];
    }
}
