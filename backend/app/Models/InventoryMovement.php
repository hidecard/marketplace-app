<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryMovement extends Model
{
    protected $fillable = ['shop_id', 'product_id', 'actor_id', 'quantity_delta', 'reason', 'idempotency_key'];
    public function shop(): BelongsTo { return $this->belongsTo(Shop::class); }
    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
}
