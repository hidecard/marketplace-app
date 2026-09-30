<?php

namespace App\Support;

use Illuminate\Support\Str;

final class ProductImages
{
    /** @return array<int, string> */
    public static function normalize(mixed $images): array
    {
        if (is_string($images)) {
            $decoded = json_decode($images, true);
            $images = is_array($decoded) ? $decoded : [$images];
        }

        return collect(is_array($images) ? $images : [])
            ->filter(fn ($image) => is_string($image) && trim($image) !== '')
            ->map(function (string $image): string {
                $image = trim($image);
                if (Str::startsWith($image, ['http://', 'https://'])) {
                    $parsed = parse_url($image);
                    $host = $parsed['host'] ?? '';
                    $path = $parsed['path'] ?? '';
                    if ($host === (parse_url(config('app.url'), PHP_URL_HOST) ?: 'easyzaymm.com') && Str::startsWith($path, '/storage/')) {
                        return '/media/'.ltrim(Str::after($path, '/storage/'), '/');
                    }
                    return $image;
                }
                $image = ltrim($image, '/');
                if (Str::startsWith($image, 'storage/')) $image = Str::after($image, 'storage/');
                if (! Str::startsWith($image, 'media/')) return '/media/'.$image;
                return '/'. $image;
            })
            ->values()
            ->all();
    }
}
