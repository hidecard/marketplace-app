<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Shop;
use App\Models\User;
use App\Models\VerificationRequest;
use Inertia\Inertia;
use Inertia\Response;

class AdminController extends Controller
{
    public function dashboard(): Response
    {
        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'users' => User::count(),
                'shops' => Shop::count(),
                'products' => Product::count(),
                'orders' => Order::count(),
                'pending_verifications' => VerificationRequest::where('status', 'pending')->count(),
            ],
            'recentOrders' => Order::with(['buyer:id,name', 'shop:id,name'])->latest()->limit(5)->get(['id', 'order_number', 'buyer_id', 'shop_id', 'total', 'status', 'created_at']),
        ]);
    }
}
