<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('region', 120)->nullable()->after('phone_verified');
            $table->timestamp('profile_completed_at')->nullable()->after('region');
        });

        Schema::create('phone_otp_challenges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('phone_number', 30)->index();
            $table->string('code_hash');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at')->index();
            $table->timestamp('verified_at')->nullable();
            $table->string('request_ip', 45)->nullable();
            $table->timestamps();
            $table->index(['phone_number', 'verified_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('phone_otp_challenges');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['region', 'profile_completed_at']);
        });
    }
};
