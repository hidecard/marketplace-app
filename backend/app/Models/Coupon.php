<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class Coupon extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'description',
        'type',
        'value',
        'min_order_amount',
        'max_discount_amount',
        'usage_limit',
        'per_user_limit',
        'used_count',
        'starts_at',
        'expires_at',
        'is_active',
    ];

    protected $casts = [
        'value' => 'decimal:2',
        'min_order_amount' => 'decimal:2',
        'max_discount_amount' => 'decimal:2',
        'usage_limit' => 'integer',
        'per_user_limit' => 'integer',
        'used_count' => 'integer',
        'starts_at' => 'datetime',
        'expires_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    public function scopeActive($query)
    {
        return $query->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', Carbon::now());
            })
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>=', Carbon::now());
            })
            ->where(function ($q) {
                $q->whereNull('usage_limit')->orWhere('used_count', '<', 'usage_limit');
            });
    }

    public function isValidForOrder(float $subtotal, int $userId): array
    {
        if (! $this->is_active) {
            return [false, 'Coupon is not active.'];
        }

        $now = Carbon::now();
        if ($this->starts_at && $this->starts_at->gt($now)) {
            return [false, 'Coupon has not started yet.'];
        }
        if ($this->expires_at && $this->expires_at->lt($now)) {
            return [false, 'Coupon has expired.'];
        }
        if ($this->usage_limit && $this->used_count >= $this->usage_limit) {
            return [false, 'Coupon usage limit reached.'];
        }
        if ($this->min_order_amount && $subtotal < $this->min_order_amount) {
            return [false, "Minimum order amount is {$this->min_order_amount}."];
        }

        // Check per-user usage
        $userUsage = $this->redemptions()->where('user_id', $userId)->count();
        if ($userUsage >= $this->per_user_limit) {
            return [false, 'You have already used this coupon the maximum number of times.'];
        }

        return [true, ''];
    }

    public function calculateDiscount(float $subtotal): float
    {
        if ($this->type === 'percentage') {
            $discount = $subtotal * ($this->value / 100);
            if ($this->max_discount_amount && $discount > $this->max_discount_amount) {
                $discount = $this->max_discount_amount;
            }

            return round($discount, 2);
        }

        // Fixed amount
        $discount = min($this->value, $subtotal);

        return round($discount, 2);
    }

    public function redemptions()
    {
        return $this->hasMany(CouponRedemption::class);
    }
}
