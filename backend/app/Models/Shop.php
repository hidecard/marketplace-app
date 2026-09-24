<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shop extends Model
{
    protected $fillable = ['owner_id', 'name', 'slug', 'description', 'logo_url', 'cover_url', 'phone', 'address', 'verification_status', 'verified', 'rejection_note'];

    protected function casts(): array
    {
        return ['verified' => 'boolean'];
    }

    public function owner(): BelongsTo { return $this->belongsTo(User::class, 'owner_id'); }
    public function products(): HasMany { return $this->hasMany(Product::class); }
}
