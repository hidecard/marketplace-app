<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Orders: idempotency_key should be unique per buyer
        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique('orders_idempotency_key_unique');
            $table->unique(['buyer_id', 'idempotency_key'], 'orders_buyer_idempotency_key_unique');
        });

        // Inventory movements: idempotency_key should be unique per shop
        Schema::table('inventory_movements', function (Blueprint $table) {
            $table->dropUnique('inventory_movements_idempotency_key_unique');
            $table->unique(['shop_id', 'idempotency_key'], 'inventory_movements_shop_idempotency_key_unique');
        });

        // POS sales: idempotency_key should be unique per shop
        Schema::table('pos_sales', function (Blueprint $table) {
            $table->dropUnique('pos_sales_idempotency_key_unique');
            $table->unique(['shop_id', 'idempotency_key'], 'pos_sales_shop_idempotency_key_unique');
        });

        // Expenses: idempotency_key should be unique per shop
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropUnique('expenses_idempotency_key_unique');
            $table->unique(['shop_id', 'idempotency_key'], 'expenses_shop_idempotency_key_unique');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique('orders_buyer_idempotency_key_unique');
            $table->unique('idempotency_key');
        });

        Schema::table('inventory_movements', function (Blueprint $table) {
            $table->dropUnique('inventory_movements_shop_idempotency_key_unique');
            $table->unique('idempotency_key');
        });

        Schema::table('pos_sales', function (Blueprint $table) {
            $table->dropUnique('pos_sales_shop_idempotency_key_unique');
            $table->unique('idempotency_key');
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->dropUnique('expenses_shop_idempotency_key_unique');
            $table->unique('idempotency_key');
        });
    }
};
