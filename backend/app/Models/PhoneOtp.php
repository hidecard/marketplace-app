<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

class PhoneOtp extends Model
{
    protected $fillable = ['phone_number', 'code', 'purpose', 'attempts', 'expires_at', 'verified_at'];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'verified_at' => 'datetime',
        ];
    }

    public static function generateCode(): string
    {
        return (string) random_int(100000, 999999);
    }

    public static function createOtp(string $phoneNumber, string $purpose = 'verification', int $ttlMinutes = 10): self
    {
        // Invalidate any existing unexpired OTPs for this phone/purpose
        self::where('phone_number', $phoneNumber)
            ->where('purpose', $purpose)
            ->where('verified_at', null)
            ->where('expires_at', '>', now())
            ->delete();

        return self::create([
            'phone_number' => $phoneNumber,
            'code' => self::generateCode(),
            'purpose' => $purpose,
            'expires_at' => now()->addMinutes($ttlMinutes),
        ]);
    }

    public function verify(string $code): bool
    {
        if ($this->verified_at !== null) {
            return false;
        }

        if ($this->expires_at->isPast()) {
            return false;
        }

        if ($this->attempts >= 5) {
            return false;
        }

        $this->increment('attempts');

        if ($this->code !== $code) {
            return false;
        }

        $this->update(['verified_at' => now()]);

        return true;
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    protected function code(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value,
            set: fn ($value) => $value,
        );
    }
}
