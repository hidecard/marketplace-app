<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('name', 120);
            $table->string('slug', 140)->unique();
            $table->string('icon_url')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::table('products', function (Blueprint $table) {
            // Keep the legacy string category_id during the migration period.
            $table->foreignId('category_ref_id')->nullable()->after('category_id')->constrained('categories')->nullOnDelete();
            $table->string('brand', 120)->nullable()->after('title');
            $table->boolean('is_individual_listing')->default(false)->after('status');
            $table->boolean('is_featured')->default(false)->after('is_individual_listing');
            $table->index(['category_ref_id', 'status']);
        });

        Schema::create('favorites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'product_id']);
        });

        Schema::create('shop_followers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'shop_id']);
        });

        Schema::create('addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('label', 80)->nullable();
            $table->string('recipient_name', 120);
            $table->string('phone', 30);
            $table->text('address');
            $table->string('city', 120)->nullable();
            $table->string('region', 120)->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();
            $table->index(['user_id', 'is_default']);
        });

        Schema::create('offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('seller_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('conversation_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedBigInteger('amount');
            $table->enum('status', ['pending', 'accepted', 'rejected', 'countered', 'expired'])->default('pending')->index();
            $table->text('note')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->foreignId('parent_offer_id')->nullable()->constrained('offers')->nullOnDelete();
            $table->timestamps();
            $table->index(['product_id', 'buyer_id', 'status']);
        });

        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('shop_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->text('body')->nullable();
            $table->boolean('is_visible')->default(true)->index();
            $table->timestamps();
            $table->unique(['user_id', 'product_id', 'order_id']);
        });

        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reporter_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('review_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('shop_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('reported_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reason', 120);
            $table->text('description')->nullable();
            $table->enum('status', ['open', 'under_review', 'resolved', 'dismissed'])->default('open')->index();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('resolution_note')->nullable();
            $table->timestamps();
            $table->index(['reporter_id', 'status']);
        });

        Schema::create('blocked_users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('blocked_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'blocked_user_id']);
        });

        Schema::create('banners', function (Blueprint $table) {
            $table->id();
            $table->string('title', 180);
            $table->string('image_url');
            $table->string('target_url')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('platform_stats', function (Blueprint $table) {
            $table->id();
            $table->date('stat_date')->unique();
            $table->unsignedBigInteger('user_count')->default(0);
            $table->unsignedBigInteger('shop_count')->default(0);
            $table->unsignedBigInteger('order_count')->default(0);
            $table->unsignedBigInteger('gross_revenue')->default(0);
            $table->timestamps();
        });

        Schema::create('app_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 120)->unique();
            $table->text('value')->nullable();
            $table->string('type', 30)->default('string');
            $table->boolean('is_public')->default(false)->index();
            $table->timestamps();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedInteger('cod_rejection_count')->default(0)->after('status');
            $table->unsignedInteger('cancel_count')->default(0)->after('cod_rejection_count');
            $table->timestamp('cancelled_at')->nullable()->after('cancel_count');
            $table->timestamp('delivered_at')->nullable()->after('cancelled_at');
            $table->timestamp('completed_at')->nullable()->after('delivered_at');
            $table->index(['seller_id', 'cod_rejection_count']);
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE orders MODIFY status ENUM('pending','confirmed','preparing','shipped','out_for_delivery','delivered','completed','cancelled') NOT NULL DEFAULT 'pending'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE orders MODIFY status ENUM('pending','confirmed','preparing','shipped','delivered','completed','cancelled') NOT NULL DEFAULT 'pending'");
        }

        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['seller_id', 'cod_rejection_count']);
            $table->dropColumn(['cod_rejection_count', 'cancel_count', 'cancelled_at', 'delivered_at', 'completed_at']);
        });
        Schema::dropIfExists('app_settings');
        Schema::dropIfExists('platform_stats');
        Schema::dropIfExists('banners');
        Schema::dropIfExists('blocked_users');
        Schema::dropIfExists('reports');
        Schema::dropIfExists('reviews');
        Schema::dropIfExists('offers');
        Schema::dropIfExists('addresses');
        Schema::dropIfExists('shop_followers');
        Schema::dropIfExists('favorites');
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['category_ref_id']);
            $table->dropIndex(['category_ref_id', 'status']);
            $table->dropColumn(['category_ref_id', 'brand', 'is_individual_listing', 'is_featured']);
        });
        Schema::dropIfExists('categories');
    }
};
