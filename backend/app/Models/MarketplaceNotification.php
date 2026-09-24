<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketplaceNotification extends Model
{
    protected $table = 'notifications';
    protected $fillable = ['user_id', 'type', 'title', 'body', 'data', 'idempotency_key', 'read_at'];
    protected function casts(): array { return ['data' => 'array', 'read_at' => 'datetime']; }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
