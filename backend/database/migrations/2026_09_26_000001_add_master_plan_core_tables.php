<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('categories')) {
            Schema::create('categories', function (Blueprint $table) {
                $table->id(); $table->foreignId('parent_id')->nullable()->constrained('categories')->nullOnDelete(); $table->string('name', 120); $table->string('slug', 140)->unique(); $table->string('icon_url')->nullable(); $table->boolean('is_active')->default(true)->index(); $table->unsignedInteger('sort_order')->default(0); $table->timestamps();
            });
        } else {
            Schema::table('categories', function (Blueprint $table) {
                if (! Schema::hasColumn('categories', 'icon_url')) $table->string('icon_url')->nullable();
                if (! Schema::hasColumn('categories', 'is_active')) $table->boolean('is_active')->default(true)->index();
                if (! Schema::hasColumn('categories', 'sort_order')) $table->unsignedInteger('sort_order')->default(0)->index();
            });
            if (Schema::hasColumn('categories', 'icon') && Schema::hasColumn('categories', 'icon_url')) DB::statement('UPDATE categories SET icon_url = icon WHERE icon_url IS NULL');
            if (Schema::hasColumn('categories', 'order') && Schema::hasColumn('categories', 'sort_order')) DB::statement('UPDATE categories SET sort_order = `order` WHERE sort_order = 0');
        }

        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'category_ref_id')) $table->foreignId('category_ref_id')->nullable()->constrained('categories')->nullOnDelete();
            if (! Schema::hasColumn('products', 'brand')) $table->string('brand', 120)->nullable();
            if (! Schema::hasColumn('products', 'is_individual_listing')) $table->boolean('is_individual_listing')->default(false);
            if (! Schema::hasColumn('products', 'is_featured')) $table->boolean('is_featured')->default(false);
        });

        if (! Schema::hasTable('favorites')) Schema::create('favorites', fn (Blueprint $table) => $table->id());
        if (! Schema::hasTable('shop_followers')) Schema::create('shop_followers', fn (Blueprint $table) => $table->id());
        if (! Schema::hasTable('addresses')) Schema::create('addresses', function (Blueprint $table) { $table->id(); $table->foreignId('user_id')->constrained()->cascadeOnDelete(); $table->string('label', 80)->nullable(); $table->string('recipient_name', 120); $table->string('phone', 30); $table->text('address'); $table->string('city', 120)->nullable(); $table->string('region', 120)->nullable(); $table->decimal('latitude', 10, 7)->nullable(); $table->decimal('longitude', 10, 7)->nullable(); $table->boolean('is_default')->default(false); $table->timestamps(); });
        if (! Schema::hasTable('offers')) Schema::create('offers', function (Blueprint $table) { $table->id(); $table->foreignId('product_id')->constrained()->cascadeOnDelete(); $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete(); $table->foreignId('seller_id')->constrained('users')->cascadeOnDelete(); $table->foreignId('conversation_id')->nullable()->constrained()->nullOnDelete(); $table->unsignedBigInteger('amount'); $table->enum('status', ['pending', 'accepted', 'rejected', 'countered', 'expired'])->default('pending')->index(); $table->text('note')->nullable(); $table->timestamp('expires_at')->nullable(); $table->timestamps(); });
        else Schema::table('offers', function (Blueprint $table) { if (! Schema::hasColumn('offers', 'amount')) $table->unsignedBigInteger('amount')->nullable(); if (! Schema::hasColumn('offers', 'note')) $table->text('note')->nullable(); });
        if (Schema::hasColumn('offers', 'offered_price') && Schema::hasColumn('offers', 'amount')) DB::statement('UPDATE offers SET amount = offered_price WHERE amount IS NULL');
        if (! Schema::hasTable('reviews')) Schema::create('reviews', fn (Blueprint $table) => $table->id());
        if (! Schema::hasTable('reports')) Schema::create('reports', fn (Blueprint $table) => $table->id());
        if (! Schema::hasTable('blocked_users')) Schema::create('blocked_users', function (Blueprint $table) { $table->id(); $table->foreignId('user_id')->constrained()->cascadeOnDelete(); $table->foreignId('blocked_user_id')->constrained('users')->cascadeOnDelete(); $table->timestamps(); $table->unique(['user_id', 'blocked_user_id']); });
        if (! Schema::hasTable('banners')) Schema::create('banners', fn (Blueprint $table) => $table->id());
        if (! Schema::hasTable('platform_stats')) Schema::create('platform_stats', fn (Blueprint $table) => $table->id());
        if (! Schema::hasTable('app_settings')) Schema::create('app_settings', fn (Blueprint $table) => $table->id());

        Schema::table('orders', function (Blueprint $table) {
            if (! Schema::hasColumn('orders', 'cod_rejection_count')) $table->unsignedInteger('cod_rejection_count')->default(0);
            if (! Schema::hasColumn('orders', 'cancel_count')) $table->unsignedInteger('cancel_count')->default(0);
            if (! Schema::hasColumn('orders', 'cancelled_at')) $table->timestamp('cancelled_at')->nullable();
            if (! Schema::hasColumn('orders', 'delivered_at')) $table->timestamp('delivered_at')->nullable();
            if (! Schema::hasColumn('orders', 'completed_at')) $table->timestamp('completed_at')->nullable();
        });
        if (DB::getDriverName() === 'mysql') DB::statement("ALTER TABLE orders MODIFY status ENUM('pending','confirmed','preparing','shipped','out_for_delivery','delivered','completed','cancelled') NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        // Compatibility migration: preserve pre-existing Firebase tables and records on rollback.
    }
};
