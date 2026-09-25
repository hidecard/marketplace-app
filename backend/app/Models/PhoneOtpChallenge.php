<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

class PhoneOtpChallenge extends Model
{
    protected $fillable = [
        'user_id', 'phone_number', 'code_hash', 'attempts', 'expires_at', 'verified_at', 'request_ip',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'verified_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function verifyCode(string $code): bool
    {
        if ($this->verified_at || $this->isExpired() || $this->attempts >= 5) {
            return false;
        }

        $this->increment('attempts');
        if (! Hash::check($code, $this->code_hash)) {
            return false;
        }

        $this->update(['verified_at' => Carbon::now()]);
        return true;
    }
}
