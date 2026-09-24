<?php

namespace Tests\Feature;

use App\Models\Expense;
use App\Models\PosSale;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_verified_seller_can_read_sales_and_expense_summary(): void
    {
        $seller = User::factory()->create(['role' => User::ROLE_SELLER]);
        $shop = Shop::create(['owner_id' => $seller->id, 'name' => 'Report Shop', 'slug' => 'report-shop', 'verified' => true, 'verification_status' => 'approved']);
        PosSale::create(['shop_id' => $shop->id, 'seller_id' => $seller->id, 'subtotal' => 1000, 'discount' => 0, 'tax' => 0, 'total' => 1000, 'cost_of_goods_sold' => 600, 'gross_profit' => 400, 'payment_method' => 'cash', 'items' => [], 'idempotency_key' => 'report-pos-1']);
        Expense::create(['shop_id' => $shop->id, 'actor_id' => $seller->id, 'amount' => 100, 'category' => 'delivery', 'expense_date' => now()->toDateString(), 'idempotency_key' => 'report-expense-1']);
        Sanctum::actingAs($seller);

        $this->getJson('/api/business/reports/summary')->assertOk()
            ->assertJsonPath('pos.count', 1)
            ->assertJsonPath('pos.revenue', 1000)
            ->assertJsonPath('pos.gross_profit', 400)
            ->assertJsonPath('expenses.total', 100)
            ->assertJsonPath('net_profit', 300);
    }

    public function test_admin_can_read_an_all_shop_summary(): void
    {
        $seller = User::factory()->create(['role' => User::ROLE_SELLER]);
        $shop = Shop::create(['owner_id' => $seller->id, 'name' => 'Admin Report Shop', 'slug' => 'admin-report-shop', 'verified' => true, 'verification_status' => 'approved']);
        PosSale::create(['shop_id' => $shop->id, 'seller_id' => $seller->id, 'subtotal' => 2000, 'discount' => 0, 'tax' => 0, 'total' => 2000, 'cost_of_goods_sold' => 1200, 'gross_profit' => 800, 'payment_method' => 'cash', 'items' => [], 'idempotency_key' => 'admin-report-pos-1']);
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/reports/summary')->assertOk()->assertJsonPath('pos.count', 1)->assertJsonPath('pos.revenue', 2000);
    }
}
