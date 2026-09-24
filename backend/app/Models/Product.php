<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    protected $fillable = ['seller_id', 'shop_id', 'name', 'slug', 'description', 'price', 'cost_price', 'stock', 'condition', 'status', 'images', 'category_id'];

    protected function casts(): array
    {
        return ['price' => 'decimal:2', 'cost_price' => 'decimal:2', 'images' => 'array'];
    }

    public function seller(): BelongsTo { return $this->belongsTo(User::class, 'seller_id'); }
    public function shop(): BelongsTo { return $this->belongsTo(Shop::class); }
}
