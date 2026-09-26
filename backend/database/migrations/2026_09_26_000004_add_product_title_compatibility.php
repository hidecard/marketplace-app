<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('products', 'title')) {
            Schema::table('products', function (Blueprint $table): void {
                $table->string('title')->nullable()->after('name');
                $table->index('title');
            });
        }

        if (Schema::hasColumn('products', 'name') && Schema::hasColumn('products', 'title')) {
            DB::table('products')->whereNull('title')->update(['title' => DB::raw('name')]);
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('products', 'title')) {
            Schema::table('products', function (Blueprint $table): void {
                $table->dropIndex(['title']);
                $table->dropColumn('title');
            });
        }
    }
};
