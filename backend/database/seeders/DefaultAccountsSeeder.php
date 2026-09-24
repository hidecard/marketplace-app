<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class DefaultAccountsSeeder extends Seeder
{
    public function run(): void
    {
        $credentials = [
            'admin' => [
                'email' => env('SEED_ADMIN_EMAIL', 'admin@example.com'),
                'password' => env('SEED_ADMIN_PASSWORD'),
                'name' => env('SEED_ADMIN_NAME', 'Platform Admin'),
                'role' => User::ROLE_ADMIN,
                'phone_verified' => true,
            ],
            'seller' => [
                'email' => env('SEED_SELLER_EMAIL', 'seller@example.com'),
                'password' => env('SEED_SELLER_PASSWORD'),
                'name' => env('SEED_SELLER_NAME', 'Demo Seller'),
                'role' => User::ROLE_SELLER,
                'phone_verified' => true,
            ],
            'user' => [
                'email' => env('SEED_USER_EMAIL', 'user@example.com'),
                'password' => env('SEED_USER_PASSWORD'),
                'name' => env('SEED_USER_NAME', 'Demo User'),
                'role' => User::ROLE_USER,
                'phone_verified' => false,
            ],
        ];

        foreach ($credentials as $type => $account) {
            if (! $account['password']) {
                if (app()->environment('production')) {
                    throw new RuntimeException('SEED_'.strtoupper($type).'_PASSWORD must be set before seeding production data.');
                }
                $account['password'] = "Local-{$type}-ChangeMe-123!";
            }

            User::updateOrCreate(
                ['email' => $account['email']],
                [
                    'name' => $account['name'],
                    'password' => Hash::make($account['password']),
                    'role' => $account['role'],
                    'status' => User::STATUS_ACTIVE,
                    'phone_verified' => $account['phone_verified'],
                    'email_verified_at' => now(),
                ],
            );
        }

        $seller = User::where('email', $credentials['seller']['email'])->firstOrFail();
        $shop = Shop::updateOrCreate(
            ['owner_id' => $seller->id],
            [
                'name' => 'Demo Seller Shop',
                'slug' => 'demo-seller-shop',
                'description' => 'Seeded shop for local development and API testing.',
                'phone' => '+959000000000',
                'address' => 'Yangon, Myanmar',
                'verification_status' => 'approved',
                'verified' => true,
            ],
        );

        Product::updateOrCreate(
            ['slug' => 'demo-marketplace-product'],
            [
                'seller_id' => $seller->id,
                'shop_id' => $shop->id,
                'name' => 'Demo Marketplace Product',
                'description' => 'Seeded product for local development and checkout testing.',
                'price' => 10000,
                'stock' => 25,
                'condition' => 'new',
                'status' => 'active',
                'images' => [],
                'category_id' => 'demo',
            ],
        );
    }
}
