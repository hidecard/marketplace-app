<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

#[Signature('firebase:migrate {json-file}')]
#[Description('Migrate Firebase data to MySQL from JSON export')]
class MigrateFirebaseToMySQL extends Command
{
    /**
     * Execute the console command.
     */
    public function handle()
    {
        $jsonFile = $this->argument('json-file');

        if (! file_exists($jsonFile)) {
            $this->error("JSON file not found: {$jsonFile}");

            return 1;
        }

        $this->info("Loading Firebase data from {$jsonFile}...");
        $firebaseData = json_decode(file_get_contents($jsonFile), true);

        if (! $firebaseData) {
            $this->error('Invalid JSON file');

            return 1;
        }

        $this->info('Starting migration...');

        DB::beginTransaction();

        try {
            $this->migrateUsers($firebaseData['users'] ?? []);
            $this->migrateShops($firebaseData['shops'] ?? []);
            $this->migrateProducts($firebaseData['products'] ?? []);
            $this->migrateOrders($firebaseData['orders'] ?? []);

            DB::commit();
            $this->info('Migration completed successfully!');

            return 0;
        } catch (\Exception $e) {
            DB::rollBack();
            $this->error('Migration failed: '.$e->getMessage());

            return 1;
        }
    }

    private function migrateUsers(array $firebaseUsers): void
    {
        $this->info('Migrating users...');
        $count = 0;

        foreach ($firebaseUsers as $firebaseUser) {
            $existingUser = User::where('email', $firebaseUser['email'] ?? null)->first();

            if ($existingUser) {
                $this->warn("User with email {$firebaseUser['email']} already exists, skipping...");

                continue;
            }

            User::create([
                'name' => $firebaseUser['displayName'] ?? $firebaseUser['name'] ?? 'Unknown',
                'email' => $firebaseUser['email'] ?? null,
                'password' => Hash::make('password123'), // Default password, should be changed
                'phone_number' => $firebaseUser['phoneNumber'] ?? $firebaseUser['phone'] ?? null,
                'phone_verified' => $firebaseUser['phoneVerified'] ?? false,
                'role' => $firebaseUser['role'] ?? 'user',
                'status' => $firebaseUser['status'] ?? 'active',
            ]);

            $count++;
        }

        $this->info("Migrated {$count} users");
    }

    private function migrateShops(array $firebaseShops): void
    {
        $this->info('Migrating shops...');
        $count = 0;

        foreach ($firebaseShops as $firebaseShop) {
            $owner = User::where('email', $firebaseShop['ownerEmail'] ?? null)->first();

            if (! $owner) {
                $this->warn("Owner not found for shop {$firebaseShop['name']}, skipping...");

                continue;
            }

            $existingShop = Shop::where('owner_id', $owner->id)->first();

            if ($existingShop) {
                $this->warn("Shop already exists for owner {$owner->email}, skipping...");

                continue;
            }

            Shop::create([
                'owner_id' => $owner->id,
                'name' => $firebaseShop['name'] ?? 'Unknown Shop',
                'slug' => Str::slug($firebaseShop['name'] ?? 'unknown-shop').'-'.Str::random(6),
                'description' => $firebaseShop['description'] ?? null,
                'logo_url' => $firebaseShop['logo'] ?? null,
                'cover_url' => $firebaseShop['coverImage'] ?? null,
                'phone' => $firebaseShop['phone'] ?? null,
                'address' => $firebaseShop['address'] ?? null,
                'verification_status' => $firebaseShop['verificationStatus'] ?? 'pending',
                'verified' => $firebaseShop['verified'] ?? false,
                'rejection_note' => $firebaseShop['rejectionNote'] ?? null,
            ]);

            $count++;
        }

        $this->info("Migrated {$count} shops");
    }

    private function migrateProducts(array $firebaseProducts): void
    {
        $this->info('Migrating products...');
        $count = 0;

        foreach ($firebaseProducts as $firebaseProduct) {
            $seller = User::where('email', $firebaseProduct['sellerEmail'] ?? null)->first();

            if (! $seller) {
                $this->warn("Seller not found for product {$firebaseProduct['title']}, skipping...");

                continue;
            }

            $shop = null;
            if (! empty($firebaseProduct['shopId'])) {
                $shop = Shop::find($firebaseProduct['shopId']);
            }

            Product::create([
                'seller_id' => $seller->id,
                'shop_id' => $shop?->id,
                'title' => $firebaseProduct['title'] ?? 'Unknown Product',
                'slug' => Str::slug($firebaseProduct['title'] ?? 'unknown-product').'-'.Str::random(6),
                'description' => $firebaseProduct['description'] ?? null,
                'price' => $firebaseProduct['price'] ?? 0,
                'cost_price' => $firebaseProduct['costPrice'] ?? 0,
                'stock' => $firebaseProduct['stock'] ?? 0,
                'condition' => $firebaseProduct['condition'] ?? 'new',
                'status' => $firebaseProduct['status'] ?? 'active',
                'images' => $firebaseProduct['images'] ?? [],
                'category_id' => $firebaseProduct['categoryId'] ?? null,
            ]);

            $count++;
        }

        $this->info("Migrated {$count} products");
    }

    private function migrateOrders(array $firebaseOrders): void
    {
        $this->info('Migrating orders...');
        $count = 0;

        foreach ($firebaseOrders as $firebaseOrder) {
            $buyer = User::where('email', $firebaseOrder['buyerEmail'] ?? null)->first();

            if (! $buyer) {
                $this->warn("Buyer not found for order {$firebaseOrder['orderNumber']}, skipping...");

                continue;
            }

            $seller = null;
            if (! empty($firebaseOrder['sellerEmail'])) {
                $seller = User::where('email', $firebaseOrder['sellerEmail'])->first();
            }

            $shop = null;
            if (! empty($firebaseOrder['shopId'])) {
                $shop = Shop::find($firebaseOrder['shopId']);
            }

            $order = Order::create([
                'order_number' => $firebaseOrder['orderNumber'] ?? 'ORD-'.Str::random(10),
                'buyer_id' => $buyer->id,
                'seller_id' => $seller?->id,
                'shop_id' => $shop?->id,
                'subtotal' => $firebaseOrder['subtotal'] ?? 0,
                'delivery_fee' => $firebaseOrder['deliveryFee'] ?? 0,
                'total' => $firebaseOrder['total'] ?? 0,
                'payment_method' => $firebaseOrder['paymentMethod'] ?? 'cod',
                'status' => $firebaseOrder['status'] ?? 'pending',
                'delivery_address' => $firebaseOrder['shippingAddress'] ?? null,
                'idempotency_key' => 'migration-'.Str::random(20),
            ]);

            // Migrate order items
            if (! empty($firebaseOrder['items'])) {
                foreach ($firebaseOrder['items'] as $item) {
                    $product = Product::where('title', 'like', '%'.$item['title'].'%')->first();

                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $product?->id,
                        'quantity' => $item['quantity'] ?? 1,
                        'unit_price' => $item['price'] ?? 0,
                        'line_total' => $item['subtotal'] ?? 0,
                    ]);
                }
            }

            $count++;
        }

        $this->info("Migrated {$count} orders");
    }
}
