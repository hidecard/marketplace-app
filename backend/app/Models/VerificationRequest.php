<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VerificationRequest extends Model
{
    protected $fillable = ['shop_id', 'submitted_by', 'status', 'evidence', 'note', 'reviewed_by', 'reviewed_at'];

    protected function casts(): array
    {
        return ['evidence' => 'array', 'reviewed_at' => 'datetime'];
    }

    public function shop(): BelongsTo { return $this->belongsTo(Shop::class); }
    public function submitter(): BelongsTo { return $this->belongsTo(User::class, 'submitted_by'); }
    public function reviewer(): BelongsTo { return $this->belongsTo(User::class, 'reviewed_by'); }
}
