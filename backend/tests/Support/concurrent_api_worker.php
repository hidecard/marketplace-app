<?php

use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ShopController;
use App\Models\User;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

require dirname(__DIR__, 2).'/vendor/autoload.php';

$app = require dirname(__DIR__, 2).'/bootstrap/app.php';

$controllerName = $argv[1] ?? '';
$userId = (int) ($argv[2] ?? 0);
$payloadFile = $argv[3] ?? '';
$barrierFile = $argv[4] ?? '';
$payload = json_decode((string) file_get_contents($payloadFile), true, 512, JSON_THROW_ON_ERROR);

$deadline = microtime(true) + 10;
while ($barrierFile !== '' && ! is_file($barrierFile) && microtime(true) < $deadline) {
    usleep(1000);
}

$request = Request::create(
    $controllerName === 'order' ? '/api/orders' : '/api/shop',
    'POST',
    [],
    [],
    [],
    [
        'CONTENT_TYPE' => 'application/json',
        'HTTP_ACCEPT' => 'application/json',
    ],
    json_encode($payload, JSON_THROW_ON_ERROR),
);
$request->setUserResolver(fn (): User => User::query()->findOrFail($userId));

try {
    $response = $controllerName === 'order'
        ? $app->make(OrderController::class)->store($request)
        : $app->make(ShopController::class)->store($request);

    echo json_encode([
        'status' => $response->getStatusCode(),
        'body' => $response->getData(true),
    ], JSON_THROW_ON_ERROR);
} catch (HttpExceptionInterface $exception) {
    echo json_encode([
        'status' => $exception->getStatusCode(),
        'body' => ['message' => $exception->getMessage()],
    ], JSON_THROW_ON_ERROR);
} catch (Throwable $exception) {
    echo json_encode([
        'status' => 500,
        'body' => ['message' => $exception->getMessage(), 'type' => $exception::class],
    ], JSON_THROW_ON_ERROR);
}
