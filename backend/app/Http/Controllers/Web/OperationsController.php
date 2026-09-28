<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Address;
use App\Models\Conversation;
use App\Models\MarketplaceNotification;
use App\Models\Order;
use App\Models\Product;
use App\Models\Favorite;
use App\Models\Shop;
use App\Models\User;
use App\Models\VerificationRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class OperationsController extends Controller
{
    public function user(Request $request, string $screen): Response
    {
        $user = $request->user();
        $props = ['kind' => 'user', 'screen' => $screen, 'title' => $this->title($screen), 'subtitle' => $this->subtitle($screen), 'rows' => [], 'cards' => [], 'products' => [], 'addresses' => [], 'flash' => session('success')];

        if ($screen === 'categories') {
            $props['rows'] = Category::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'name', 'slug'])->map(fn ($item) => ['id' => $item->id, 'title' => $item->name, 'meta' => 'Browse products', 'href' => '/products?category='.$item->slug])->all();
        } elseif ($screen === 'shops') {
            $props['rows'] = Shop::query()->where('verified', true)->latest()->get(['id', 'name', 'address', 'slug'])->map(fn ($item) => ['id' => $item->id, 'title' => $item->name, 'meta' => 'Verified shop · '.($item->address ?: 'Marketplace'), 'href' => '/products?shop='.urlencode($item->name)])->all();
        } elseif ($screen === 'favorites' && Schema::hasTable('favorites')) {
            $props['rows'] = DB::table('favorites')->join('products', 'products.id', '=', 'favorites.product_id')->where('favorites.user_id', $user->id)->latest('favorites.created_at')->get(['products.id', 'products.title', 'products.price', 'products.stock'])->map(fn ($item) => ['id' => $item->id, 'title' => $item->title, 'meta' => number_format((float) $item->price).' MMK · '.$item->stock.' in stock', 'href' => '/products/'.$item->id, 'remove' => '/favorites/'.$item->id.'/toggle'])->all();
        } elseif ($screen === 'notifications') {
            $props['rows'] = MarketplaceNotification::query()->where('user_id', $user->id)->latest()->limit(50)->get()->map(fn ($item) => ['id' => $item->id, 'title' => $item->title, 'meta' => ($item->read_at ? 'Read' : 'Unread').' · '.($item->body ?: $item->type), 'href' => '#', 'unread' => ! $item->read_at])->all();
        } elseif ($screen === 'chats' && Schema::hasTable('conversations')) {
            $props['rows'] = Conversation::query()->where(fn ($query) => $query->where('participant_one_id', $user->id)->orWhere('participant_two_id', $user->id))->with(['participantOne:id,name', 'participantTwo:id,name', 'product:id,title'])->withCount('messages')->latest('last_message_at')->limit(50)->get()->map(function ($item) use ($user) {
                $other = (int) $item->participant_one_id === (int) $user->id ? $item->participantTwo : $item->participantOne;
                return ['id' => $item->id, 'title' => $other?->name ?: 'Conversation', 'meta' => ($item->product?->title ?: 'Marketplace chat').' · '.$item->messages_count.' messages', 'href' => '/chats/'.$item->id];
            })->all();
        } elseif ($screen === 'addresses' && Schema::hasTable('addresses')) {
            $props['addresses'] = DB::table('addresses')->where('user_id', $user->id)->latest()->get(['id', 'label', 'recipient_name', 'phone', 'address', 'city', 'region', 'is_default'])->all();
        } elseif ($screen === 'help') {
            $props['cards'] = [
                ['label' => 'Orders', 'value' => 'Track delivery, COD, and returns'],
                ['label' => 'Selling', 'value' => 'Create a shop and submit verification'],
                ['label' => 'Safety', 'value' => 'Use in-app chat and report suspicious activity'],
            ];
        }

        return Inertia::render('Operations/Index', $props);
    }

    public function seller(Request $request, string $screen): Response
    {
        $sellerId = $request->user()->id;
        $props = ['kind' => 'seller', 'screen' => $screen, 'title' => $this->title($screen), 'subtitle' => $this->subtitle($screen), 'rows' => [], 'cards' => [], 'flash' => session('success')];
        $shop = Shop::query()->where('owner_id', $sellerId)->first();

        if ($screen === 'orders') {
            $props['rows'] = Order::query()->where('seller_id', $sellerId)->latest()->limit(100)->get(['id', 'order_number', 'buyer_id', 'total', 'status', 'created_at'])->map(fn ($item) => ['id' => $item->id, 'title' => '#'.$item->order_number, 'meta' => ucfirst($item->status).' · '.number_format((float) $item->total).' MMK', 'href' => '/orders/'.$item->id, 'actions' => $this->orderActions($item->status, false, $item->id)])->all();
        } elseif ($screen === 'customers') {
            $customerIds = Order::query()->where('seller_id', $sellerId)->pluck('buyer_id')->filter()->unique();
            $props['rows'] = User::query()->whereIn('id', $customerIds)->withCount(['orders as order_count' => fn ($query) => $query->where('seller_id', $sellerId)])->get(['id', 'name', 'email', 'phone_number'])->map(fn ($item) => ['id' => $item->id, 'title' => $item->name, 'meta' => $item->email.' · '.$item->order_count.' orders', 'href' => '/seller/customers'])->all();
        } elseif ($screen === 'analytics') {
            $orders = Order::query()->where('seller_id', $sellerId);
            $props['cards'] = [['label' => 'Orders', 'value' => (clone $orders)->count()], ['label' => 'Revenue', 'value' => number_format((float) (clone $orders)->whereNotIn('status', ['cancelled'])->sum('total')).' MMK'], ['label' => 'Pending', 'value' => (clone $orders)->whereIn('status', ['pending', 'processing'])->count()], ['label' => 'Customers', 'value' => Order::query()->where('seller_id', $sellerId)->distinct('buyer_id')->count('buyer_id')]];
            $props['rows'] = Order::query()->where('seller_id', $sellerId)->selectRaw('DATE(created_at) as day, COUNT(*) as orders, SUM(total) as revenue')->groupBy('day')->latest('day')->limit(14)->get()->map(fn ($item) => ['id' => $item->day, 'title' => $item->day, 'meta' => $item->orders.' orders · '.number_format((float) $item->revenue).' MMK', 'href' => '/seller/orders'])->all();
        } elseif ($screen === 'categories') {
            $props['rows'] = Category::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'name', 'slug'])->map(fn ($item) => ['id' => $item->id, 'title' => $item->name, 'meta' => 'Use this category for products', 'href' => '/seller/products?category='.$item->slug])->all();
        }

        $props['shop'] = $shop ? ['name' => $shop->name, 'verified' => $shop->verified] : null;
        return Inertia::render('Operations/Index', $props);
    }

    public function admin(Request $request, string $screen): Response
    {
        $props = ['kind' => 'admin', 'screen' => $screen, 'title' => $this->title($screen), 'subtitle' => $this->subtitle($screen), 'rows' => [], 'cards' => [], 'flash' => session('success')];
        $props['cards'] = [['label' => 'Users', 'value' => User::count()], ['label' => 'Shops', 'value' => Shop::count()], ['label' => 'Products', 'value' => Product::count()], ['label' => 'Pending verifications', 'value' => VerificationRequest::where('status', 'pending')->count()]];

        if ($screen === 'users') {
            $props['rows'] = User::query()->latest()->limit(100)->get(['id', 'name', 'email', 'phone_number', 'role', 'status', 'created_at'])->map(fn ($item) => ['id' => $item->id, 'title' => $item->name, 'meta' => $item->email.' · '.$item->role.' · '.$item->status, 'href' => '/admin/users', 'status' => $item->status, 'actions' => [['label' => 'Activate', 'href' => '/admin/users/'.$item->id.'/status/active'], ['label' => 'Suspend', 'href' => '/admin/users/'.$item->id.'/status/suspended'], ['label' => 'Ban', 'href' => '/admin/users/'.$item->id.'/status/banned']]])->all();
        } elseif ($screen === 'shops') {
            $props['rows'] = Shop::query()->with('owner:id,name')->latest()->limit(100)->get(['id', 'name', 'owner_id', 'verification_status', 'verified'])->map(fn ($item) => ['id' => $item->id, 'title' => $item->name, 'meta' => ($item->owner?->name ?: 'Owner').' · '.($item->verified ? 'Verified' : ucfirst($item->verification_status)), 'href' => '/admin/verifications', 'actions' => $item->verification_status === 'pending' ? [['label' => 'Approve', 'href' => '/admin/shops/'.$item->id.'/status/approved'], ['label' => 'Reject', 'href' => '/admin/shops/'.$item->id.'/status/rejected']] : []])->all();
        } elseif ($screen === 'products') {
            $props['rows'] = Product::query()->with('seller:id,name')->latest()->limit(100)->get(['id', 'title', 'seller_id', 'price', 'stock', 'status'])->map(fn ($item) => ['id' => $item->id, 'title' => $item->title, 'meta' => ($item->seller?->name ?: 'Seller').' · '.number_format((float) $item->price).' MMK · '.$item->stock.' stock · '.ucfirst($item->status), 'href' => '/products/'.$item->id, 'actions' => [['label' => $item->status === 'hidden' ? 'Show' : 'Hide', 'href' => '/admin/products/'.$item->id.'/status/'.($item->status === 'hidden' ? 'active' : 'hidden')], ['label' => 'Delete', 'href' => '/admin/products/'.$item->id.'/delete']]])->all();
        } elseif ($screen === 'orders') {
            $props['rows'] = Order::query()->with(['buyer:id,name', 'seller:id,name'])->latest()->limit(100)->get(['id', 'order_number', 'buyer_id', 'seller_id', 'total', 'status'])->map(fn ($item) => ['id' => $item->id, 'title' => '#'.$item->order_number, 'meta' => ($item->buyer?->name ?: 'Buyer').' → '.($item->seller?->name ?: 'Seller').' · '.ucfirst($item->status).' · '.number_format((float) $item->total).' MMK', 'href' => '/orders/'.$item->id, 'actions' => $this->orderActions($item->status, true, $item->id)])->all();
        } elseif ($screen === 'reports') {
            $props['cards'] = [['label' => 'Orders', 'value' => Order::count()], ['label' => 'GMV', 'value' => number_format((float) Order::whereNotIn('status', ['cancelled'])->sum('total')).' MMK'], ['label' => 'Active users', 'value' => User::where('status', 'active')->count()], ['label' => 'Verified shops', 'value' => Shop::where('verified', true)->count()]];
        } elseif ($screen === 'categories') {
            $props['rows'] = Category::query()->orderBy('sort_order')->orderBy('name')->get(['id', 'name', 'slug', 'is_active'])->map(fn ($item) => ['id' => $item->id, 'title' => $item->name, 'meta' => $item->slug.' · '.($item->is_active ? 'Active' : 'Hidden'), 'href' => '/admin/categories', 'actions' => [['label' => $item->is_active ? 'Hide' : 'Activate', 'href' => '/admin/categories/'.$item->id.'/toggle']]])->all();
        }

        return Inertia::render('Operations/Index', $props);
    }

    public function updateUserStatus(Request $request, User $user, string $status): RedirectResponse
    {
        abort_unless(in_array($status, ['active', 'suspended', 'banned'], true), 422);
        abort_if($user->is($request->user()), 422, 'You cannot change your own account status.');
        $user->update(['status' => $status]);
        return back()->with('success', "User status changed to {$status}.");
    }

    public function toggleFavorite(Request $request, Product $product): RedirectResponse
    {
        $favorite = Favorite::query()->where('user_id', $request->user()->id)->where('product_id', $product->id)->first();
        $favorite ? $favorite->delete() : Favorite::create(['user_id' => $request->user()->id, 'product_id' => $product->id]);
        return back();
    }

    public function storeAddress(Request $request): RedirectResponse
    {
        $data = $request->validate(['label' => ['required', 'string', 'max:80'], 'recipient_name' => ['required', 'string', 'max:120'], 'phone' => ['required', 'string', 'max:30'], 'address' => ['required', 'string', 'max:1000'], 'city' => ['nullable', 'string', 'max:120'], 'region' => ['nullable', 'string', 'max:120']]);
        DB::transaction(function () use ($request, $data): void {
            if ($request->user()->addresses()->count() === 0) $data['is_default'] = true;
            Address::create([...$data, 'user_id' => $request->user()->id]);
        });
        return back()->with('success', 'Address saved.');
    }

    public function deleteAddress(Request $request, Address $address): RedirectResponse
    {
        abort_unless((int) $address->user_id === (int) $request->user()->id, 403);
        $address->delete();
        return back()->with('success', 'Address removed.');
    }

    public function markNotificationsRead(Request $request): RedirectResponse
    {
        MarketplaceNotification::query()->where('user_id', $request->user()->id)->whereNull('read_at')->update(['read_at' => now()]);
        return back();
    }

    public function storeCategory(Request $request): RedirectResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:120'], 'slug' => ['nullable', 'string', 'max:140', 'alpha_dash'], 'sort_order' => ['nullable', 'integer', 'min:0']]);
        $data['slug'] = $data['slug'] ?: str($data['name'])->slug()->toString();
        Category::create(['name' => $data['name'], 'slug' => $data['slug'], 'sort_order' => $data['sort_order'] ?? 0, 'is_active' => true]);
        return back()->with('success', 'Category created.');
    }

    public function toggleCategory(Category $category): RedirectResponse
    {
        $category->update(['is_active' => ! $category->is_active]);
        return back()->with('success', 'Category visibility updated.');
    }

    public function updateProductStatus(Request $request, Product $product, string $status): RedirectResponse
    {
        abort_unless(in_array($status, ['active', 'hidden'], true), 422);
        $product->update(['status' => $status]);
        return back()->with('success', "Product {$status}.");
    }

    public function deleteProduct(Request $request, Product $product): RedirectResponse
    {
        $product->delete();
        return back()->with('success', 'Product deleted.');
    }

    public function updateShopStatus(Request $request, Shop $shop, string $status): RedirectResponse
    {
        abort_unless(in_array($status, ['approved', 'rejected'], true), 422);
        $shop->update(['verification_status' => $status, 'verified' => $status === 'approved']);
        return back()->with('success', "Shop {$status}.");
    }

    public function updateOrderStatus(Request $request, Order $order, string $status): RedirectResponse
    {
        abort_unless(in_array($status, ['confirmed', 'preparing', 'shipped', 'delivered', 'completed', 'cancelled'], true), 422);
        abort_unless($request->user()->isAdmin() || (int) $order->seller_id === (int) $request->user()->id, 403);
        abort_if($order->status === 'cancelled' && $status !== 'cancelled', 422, 'Cancelled orders cannot be reopened.');
        $updates = ['status' => $status];
        if ($status === 'delivered') $updates['delivered_at'] = now();
        if ($status === 'completed') $updates['completed_at'] = now();
        if ($status === 'cancelled') $updates['cancelled_at'] = now();
        $order->update($updates);
        return back()->with('success', "Order status changed to {$status}.");
    }

    private function title(string $screen): string
    {
        return match ($screen) {
            'categories' => 'Categories', 'shops' => 'Explore Shops', 'favorites' => 'Favorites', 'notifications' => 'Notifications', 'chats' => 'Messages', 'addresses' => 'Saved Addresses', 'help' => 'Help & Support', 'orders' => 'Customer Orders', 'customers' => 'Customers', 'analytics' => 'Analytics', 'users' => 'Users', 'products' => 'Products', 'reports' => 'Reports', default => ucfirst($screen),
        };
    }

    private function subtitle(string $screen): string
    {
        return match ($screen) {
            'favorites' => 'Products you saved for later', 'notifications' => 'Order, offer, and marketplace updates', 'chats' => 'Chat with buyers and sellers', 'addresses' => 'Manage delivery addresses', 'help' => 'Frequently asked questions and support', 'orders' => 'Manage customer orders and fulfillment', 'customers' => 'Customers who purchased from your shop', 'analytics' => 'Sales and performance overview', 'users' => 'Search and manage marketplace accounts', 'reports' => 'Platform performance and moderation reports', default => 'Manage your Easy Zay Mm marketplace experience',
        };
    }

    private function orderActions(string $status, bool $admin, int $id): array
    {
        $next = match ($status) {
            'pending' => ['confirmed', 'cancelled'], 'confirmed' => ['preparing', 'cancelled'], 'preparing' => ['shipped', 'cancelled'], 'shipped' => ['delivered'], 'delivered' => ['completed'], default => [],
        };
        return array_map(fn ($value) => ['label' => ucfirst($value), 'href' => ($admin ? '/admin/orders/' : '/seller/orders/').$id.'/status/'.$value], $next);
    }
}
