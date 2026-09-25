<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_stats', function (Blueprint $table) {
            $table->id();
            $table->date('stat_date')->unique();
            $table->unsignedInteger('total_users')->default(0);
            $table->unsignedInteger('new_users')->default(0);
            $table->unsignedInteger('total_shops')->default(0);
            $table->unsignedInteger('verified_shops')->default(0);
            $table->unsignedInteger('total_products')->default(0);
            $table->unsignedInteger('active_products')->default(0);
            $table->unsignedInteger('total_orders')->default(0);
            $table->unsignedInteger('completed_orders')->default(0);
            $table->decimal('total_revenue', 20, 2)->default(0);
            $table->unsignedInteger('total_pos_sales')->default(0);
            $table->decimal('total_pos_revenue', 20, 2)->default(0);
            $table->unsignedInteger('total_chats')->default(0);
            $table->unsignedInteger('total_offers')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_stats');
    }
};
