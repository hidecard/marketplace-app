<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeliveryFee extends Model
{
    protected $fillable = [
        'name',
        'amount',
        'free_shipping_threshold',
        'is_active',
        'regions',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'free_shipping_threshold' => 'decimal:2',
        'is_active' => 'boolean',
        'regions' => 'array',
    ];

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public static function getApplicableFee(float $subtotal): float
    {
        $fee = self::active()->orderBy('id')->first();
        if (! $fee) {
            return 0.0;
        }

        if ($fee->free_shipping_threshold && $subtotal >= $fee->free_shipping_threshold) {
            return 0.0;
        }

        return (float) $fee->amount;
    }
}
