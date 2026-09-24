<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PosSale extends Model
{
    protected $fillable = ['shop_id', 'seller_id', 'subtotal', 'discount', 'tax', 'total', 'cost_of_goods_sold', 'gross_profit', 'payment_method', 'items', 'idempotency_key'];

    protected function casts(): array
    {
        return ['subtotal' => 'decimal:2', 'discount' => 'decimal:2', 'tax' => 'decimal:2', 'total' => 'decimal:2', 'cost_of_goods_sold' => 'decimal:2', 'gross_profit' => 'decimal:2', 'items' => 'array'];
    }

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }
}
