<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('reviews')) {
            Schema::table('reviews', function (Blueprint $table): void {
                if (! Schema::hasColumn('reviews', 'order_id')) $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
                if (! Schema::hasColumn('reviews', 'product_id')) $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
                if (! Schema::hasColumn('reviews', 'shop_id')) $table->foreignId('shop_id')->nullable()->constrained()->nullOnDelete();
                if (! Schema::hasColumn('reviews', 'user_id')) $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
                if (! Schema::hasColumn('reviews', 'rating')) $table->unsignedTinyInteger('rating')->default(5);
                if (! Schema::hasColumn('reviews', 'body')) $table->text('body')->nullable();
                if (! Schema::hasColumn('reviews', 'is_visible')) $table->boolean('is_visible')->default(true)->index();
                if (! Schema::hasColumn('reviews', 'created_at')) $table->timestamps();
            });
        }

        if (Schema::hasTable('banners')) {
            Schema::table('banners', function (Blueprint $table): void {
                if (! Schema::hasColumn('banners', 'title')) $table->string('title', 160);
                if (! Schema::hasColumn('banners', 'image_url')) $table->text('image_url');
                if (! Schema::hasColumn('banners', 'target_url')) $table->string('target_url')->nullable();
                if (! Schema::hasColumn('banners', 'is_active')) $table->boolean('is_active')->default(true)->index();
                if (! Schema::hasColumn('banners', 'starts_at')) $table->timestamp('starts_at')->nullable();
                if (! Schema::hasColumn('banners', 'ends_at')) $table->timestamp('ends_at')->nullable();
                if (! Schema::hasColumn('banners', 'sort_order')) $table->unsignedInteger('sort_order')->default(0)->index();
                if (! Schema::hasColumn('banners', 'created_at')) $table->timestamps();
            });
        }

        if (Schema::hasTable('app_settings')) {
            Schema::table('app_settings', function (Blueprint $table): void {
                if (! Schema::hasColumn('app_settings', 'key')) $table->string('key', 120)->unique();
                if (! Schema::hasColumn('app_settings', 'value')) $table->json('value')->nullable();
                if (! Schema::hasColumn('app_settings', 'type')) $table->string('type', 30)->default('text');
                if (! Schema::hasColumn('app_settings', 'is_public')) $table->boolean('is_public')->default(false)->index();
                if (! Schema::hasColumn('app_settings', 'created_at')) $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        // Deliberately forward-only: the preceding compatibility migration may have preserved legacy records.
    }
};
