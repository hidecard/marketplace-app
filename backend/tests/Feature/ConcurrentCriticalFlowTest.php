<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Tests\TestCase;

class ConcurrentCriticalFlowTest extends TestCase
{
    use DatabaseMigrations;

    protected function setUp(): void
    {
        if (getenv('DB_CONNECTION') !== 'mysql') {
            $this->markTestSkipped('Process-level concurrency tests require a shared MySQL connection; SQLite in-memory cannot be shared by child processes.');
        }

        parent::setUp();
    }

    public function test_concurrent_last_stock_orders_allow_only_one_success(): void
    {
        $seller = User::factory()->create(['role' => User::ROLE_SELLER]);
        $buyerOne = User::factory()->create(['role' => User::ROLE_USER]);
        $buyerTwo = User::factory()->create(['role' => User::ROLE_USER]);
        $product = Product::create([
            'seller_id' => $seller->id,
            'name' => 'Last Stock Product',
            'slug' => 'last-stock-product',
            'price' => 1000,
            'stock' => 1,
            'condition' => 'new',
            'status' => 'active',
        ]);

        $payloads = [
            [
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
                'delivery_address' => ['name' => 'Buyer One', 'phone' => '+959111111111', 'address' => 'Yangon'],
                'payment_method' => 'cod',
                'idempotency_key' => 'concurrent-order-one',
            ],
            [
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
                'delivery_address' => ['name' => 'Buyer Two', 'phone' => '+959222222222', 'address' => 'Mandalay'],
                'payment_method' => 'cod',
                'idempotency_key' => 'concurrent-order-two',
            ],
        ];

        $results = $this->runConcurrent('order', [$buyerOne->id, $buyerTwo->id], $payloads);
        $statuses = array_map(fn (array $result): int => $result['status'], $results);

        $this->assertSame(1, count(array_filter($statuses, fn (int $status): bool => $status === 201)), 'Exactly one concurrent order should succeed.');
        $this->assertSame(1, count(array_filter($statuses, fn (int $status): bool => $status === 422)), 'Exactly one concurrent order should be rejected for insufficient stock.');
        $this->assertSame(0, $product->fresh()->stock);
        $this->assertDatabaseCount('orders', 1);
    }

    public function test_concurrent_shop_creation_for_one_user_allows_only_one_shop(): void
    {
        $owner = User::factory()->create(['role' => User::ROLE_USER]);
        $payload = [
            'name' => 'Concurrent Shop',
            'phone' => '+959123456789',
            'address' => 'Yangon',
        ];

        $results = $this->runConcurrent('shop', [$owner->id, $owner->id], [$payload, $payload]);
        $statuses = array_map(fn (array $result): int => $result['status'], $results);

        $this->assertSame(1, count(array_filter($statuses, fn (int $status): bool => $status === 201)), 'Exactly one concurrent shop creation should succeed.');
        $this->assertSame(1, count(array_filter($statuses, fn (int $status): bool => $status === 409)), 'The second concurrent shop creation should be rejected.');
        $this->assertDatabaseCount('shops', 1);
        $this->assertSame(User::ROLE_SELLER, $owner->fresh()->role);
    }

    /** @return list<array{status:int,body:array<string,mixed>}> */
    private function runConcurrent(string $operation, array $userIds, array $payloads): array
    {
        $worker = base_path('tests/Support/concurrent_api_worker.php');
        $directory = sys_get_temp_dir().'/marketplace-concurrency-'.bin2hex(random_bytes(6));
        mkdir($directory, 0700, true);
        $barrier = $directory.'/go';
        $processes = [];

        try {
            foreach ($payloads as $index => $payload) {
                $payloadFile = $directory.'/payload-'.$index.'.json';
                file_put_contents($payloadFile, json_encode($payload, JSON_THROW_ON_ERROR));
                $command = [PHP_BINARY, $worker, $operation, (string) $userIds[$index], $payloadFile, $barrier];
                $pipes = [];
                $processes[$index] = [
                    'process' => proc_open($command, [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes),
                    'pipes' => $pipes,
                ];
            }

            touch($barrier);
            $results = [];
            foreach ($processes as $processData) {
                $stdout = stream_get_contents($processData['pipes'][1]);
                $stderr = stream_get_contents($processData['pipes'][2]);
                fclose($processData['pipes'][1]);
                fclose($processData['pipes'][2]);
                $exitCode = proc_close($processData['process']);
                $this->assertSame(0, $exitCode, 'Concurrent worker failed: '.$stderr);
                $decoded = json_decode($stdout, true);
                $this->assertIsArray($decoded, 'Concurrent worker returned invalid JSON: '.$stdout);
                $results[] = $decoded;
            }

            return $results;
        } finally {
            foreach (glob($directory.'/*') ?: [] as $file) {
                @unlink($file);
            }
            @rmdir($directory);
        }
    }
}
