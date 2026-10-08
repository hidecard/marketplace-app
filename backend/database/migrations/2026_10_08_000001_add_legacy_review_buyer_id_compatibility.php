<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('reviews') && ! Schema::hasColumn('reviews', 'buyer_id')) {
            Schema::table('reviews', function (Blueprint $table): void {
                $table->foreignId('buyer_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('reviews') && Schema::hasColumn('reviews', 'buyer_id')) {
            Schema::table('reviews', function (Blueprint $table): void {
                $table->dropForeign(['buyer_id']);
                $table->dropColumn('buyer_id');
            });
        }
    }
};
