<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformStat extends Model
{
    protected $fillable = ['stat_date', 'user_count', 'shop_count', 'order_count', 'gross_revenue'];

    protected function casts(): array
    {
        return [
            'stat_date' => 'date',
            'user_count' => 'integer',
            'shop_count' => 'integer',
            'order_count' => 'integer',
            'gross_revenue' => 'integer',
        ];
    }
}
