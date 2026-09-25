<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = [
        'seller_id', 'shop_id', 'title', 'name', 'slug', 'description', 'price',
        'cost_price', 'stock', 'condition', 'status', 'is_individual_listing',
        'is_featured', 'brand', 'images', 'category_id', 'category_ref_id',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'cost_price' => 'decimal:2',
            'images' => 'array',
            'is_individual_listing' => 'boolean',
            'is_featured' => 'boolean',
        ];
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_ref_id');
    }

    public function favorites(): HasMany
    {
        return $this->hasMany(Favorite::class);
    }
}
