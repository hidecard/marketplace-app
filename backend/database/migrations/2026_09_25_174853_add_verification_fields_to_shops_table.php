<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            $table->string('facebook_url')->nullable()->after('cover_url');
            $table->string('instagram_url')->nullable()->after('facebook_url');
            $table->string('tiktok_url')->nullable()->after('instagram_url');
            $table->string('website_url')->nullable()->after('tiktok_url');
            $table->decimal('latitude', 10, 7)->nullable()->after('address');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            $table->json('opening_hours')->nullable()->after('longitude');
            $table->string('business_license_url')->nullable()->after('rejection_note');
            $table->string('nrc_front_url')->nullable()->after('business_license_url');
            $table->string('nrc_back_url')->nullable()->after('nrc_front_url');
            $table->string('selfie_url')->nullable()->after('nrc_back_url');
            $table->boolean('cod_enabled')->default(true)->after('selfie_url');
        });
    }

    public function down(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            $table->dropColumn([
                'facebook_url', 'instagram_url', 'tiktok_url', 'website_url',
                'latitude', 'longitude', 'opening_hours',
                'business_license_url', 'nrc_front_url', 'nrc_back_url', 'selfie_url',
                'cod_enabled',
            ]);
        });
    }
};
