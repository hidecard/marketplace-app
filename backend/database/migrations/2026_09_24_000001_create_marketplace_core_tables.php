<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shops', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('logo_url')->nullable();
            $table->string('cover_url')->nullable();
            $table->string('phone')->nullable();
            $table->string('address')->nullable();
            $table->enum('verification_status', ['pending', 'approved', 'rejected'])->default('pending')->index();
            $table->boolean('verified')->default(false)->index();
            $table->text('rejection_note')->nullable();
            $table->timestamps();
            $table->unique('owner_id');
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('shop_id')->nullable()->constrained('shops')->nullOnDelete();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->decimal('price', 15, 2);
            $table->decimal('cost_price', 15, 2)->default(0);
            $table->unsignedInteger('stock')->default(0);
            $table->enum('condition', ['new', 'used', 'refurbished'])->default('new');
            $table->enum('status', ['active', 'inactive', 'sold', 'hidden'])->default('active')->index();
            $table->json('images')->nullable();
            $table->string('category_id')->nullable()->index();
            $table->timestamps();
            $table->index(['shop_id', 'status']);
            $table->index(['seller_id', 'status']);
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('seller_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('shop_id')->nullable()->constrained('shops')->nullOnDelete();
            $table->decimal('subtotal', 15, 2);
            $table->decimal('delivery_fee', 15, 2)->default(0);
            $table->decimal('total', 15, 2);
            $table->enum('payment_method', ['cod'])->default('cod');
            $table->enum('status', ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'completed', 'cancelled'])->default('pending')->index();
            $table->json('delivery_address')->nullable();
            $table->string('idempotency_key')->nullable()->unique();
            $table->timestamps();
            $table->index(['buyer_id', 'status']);
            $table->index(['seller_id', 'status']);
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 15, 2);
            $table->decimal('line_total', 15, 2);
            $table->timestamps();
            $table->index(['order_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('products');
        Schema::dropIfExists('shops');
    }
};
