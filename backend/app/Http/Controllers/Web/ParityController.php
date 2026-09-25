<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Conversation;
use App\Models\MarketplaceNotification;
use App\Models\Order;
use App\Models\Product;
use App\Models\Shop;
use App\Models\User;
use App\Models\VerificationRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class ParityController extends Controller
{
    public function toggleFavorite(Request $request, Product $product): RedirectResponse
    {
        abort_unless(Schema::hasTable('favorites'), 404);
        $favorite = DB::table('favorites')->where(['user_id' => $request->user()->id, 'product_id' => $product->id])->first();
        if ($favorite) {
            DB::table('favorites')->where('id', $favorite->id)->delete();
        } else {
            DB::table('favorites')->insert(['user_id' => $request->user()->id, 'product_id' => $product->id, 'created_at' => now(), 'updated_at' => now()]);
        }

        return back()->with('success', $favorite ? 'Removed from favorites.' : 'Added to favorites.');
    }

    public function storeAddress(Request $request): RedirectResponse
    {
        $data = $request->validate(['label' => ['nullable', 'string', 'max:80'], 'recipient_name' => ['required', 'string', 'max:120'], 'phone' => ['required', 'string', 'max:30'], 'address' => ['required', 'string', 'max:2000'], 'city' => ['nullable', 'string', 'max:120'], 'region' => ['nullable', 'string', 'max:120']]);
        abort_unless(Schema::hasTable('addresses'), 404);
        $data['user_id'] = $request->user()->id;
        $data['is_default'] = ! DB::table('addresses')->where('user_id', $data['user_id'])->exists();
        DB::table('addresses')->insert(array_merge($data, ['created_at' => now(), 'updated_at' => now()]));

        return back()->with('success', 'Address saved.');
    }

    public function deleteAddress(Request $request, int $address): RedirectResponse
    {
        abort_unless(Schema::hasTable('addresses'), 404);
        DB::table('addresses')->where('id', $address)->where('user_id', $request->user()->id)->delete();

        return back()->with('success', 'Address deleted.');
    }

    public function markNotificationsRead(Request $request): RedirectResponse
    {
        abort_unless(Schema::hasTable('notifications'), 404);
        MarketplaceNotification::where('user_id', $request->user()->id)->whereNull('read_at')->update(['read_at' => now()]);

        return back()->with('success', 'Notifications marked as read.');
    }

    public function storeOffer(Request $request): RedirectResponse
    {
        abort_unless(Schema::hasTable('offers'), 404);
        $data = $request->validate(['product_id' => ['required', 'integer', 'exists:products,id'], 'amount' => ['required', 'integer', 'min:1'], 'note' => ['nullable', 'string', 'max:1000']]);
        $product = Product::findOrFail($data['product_id']);
        abort_unless((int) $product->seller_id !== (int) $request->user()->id, 403);
        DB::table('offers')->insert(array_merge($data, ['buyer_id' => $request->user()->id, 'seller_id' => $product->seller_id, 'status' => 'pending', 'created_at' => now(), 'updated_at' => now()]));

        return back()->with('success', 'Offer submitted.');
    }

    public function screen(Request $request, string $area, string $screen): Response
    {
        $key = "$area/$screen";
        $title = match ($key) {
            'user/categories' => 'Categories', 'user/shops' => 'Explore Shops', 'user/favorites' => 'Favorites',
            'user/profile' => 'Profile', 'user/addresses' => 'Saved Addresses', 'user/notifications' => 'Notifications',
            'user/chats' => 'Messages', 'user/offers' => 'Offers', 'user/help' => 'Help & Support',
            'seller/orders' => 'Customer Orders', 'seller/customers' => 'Customers', 'seller/analytics' => 'Analytics',
            'seller/settings' => 'Business Settings', 'seller/categories' => 'Business Categories',
            'admin/users' => 'Users', 'admin/shops' => 'Shops', 'admin/products' => 'Products', 'admin/orders' => 'Orders',
            'admin/reports' => 'Reports', 'admin/categories' => 'Categories', 'admin/banners' => 'Banners', 'admin/settings' => 'Settings',
            default => ucfirst($screen),
        };
        $kind = $area === 'admin' ? 'admin' : ($area === 'seller' ? 'seller' : 'user');
        $payload = ['area' => $area, 'screen' => $screen, 'kind' => $kind, 'title' => $title, 'subtitle' => $this->subtitle($key), 'cards' => [], 'rows' => [], 'actions' => $this->actions($key), 'products' => []];

        if ($key === 'user/categories' && Schema::hasTable('categories')) {
            $payload['rows'] = Category::where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'name', 'slug'])->map(fn ($c) => ['title' => $c->name, 'meta' => 'Browse category', 'href' => '/products?category='.$c->slug])->all();
        } elseif ($key === 'user/shops' && Schema::hasTable('shops')) {
            $payload['rows'] = Shop::where('verified', true)->latest()->get(['id', 'name', 'address', 'slug'])->map(fn ($s) => ['title' => $s->name, 'meta' => 'Verified shop · '.($s->address ?: 'Marketplace'), 'href' => '/products?shop='.urlencode($s->name)])->all();
        } elseif ($key === 'user/profile' && $request->user()) {
            $payload['cards'] = [['label' => 'Name', 'value' => $request->user()->name], ['label' => 'Email', 'value' => $request->user()->email], ['label' => 'Phone', 'value' => $request->user()->phone_number ?: 'Not verified'], ['label' => 'Region', 'value' => $request->user()->region ?: 'Not set']];
        } elseif ($key === 'user/favorites' && Schema::hasTable('favorites')) {
            $payload['rows'] = DB::table('favorites')->join('products', 'products.id', '=', 'favorites.product_id')->where('favorites.user_id', $request->user()->id)->latest('favorites.created_at')->get(['products.id', 'products.title', 'products.price', 'products.stock'])->map(fn ($p) => ['title' => $p->title, 'meta' => number_format((float) $p->price).' MMK · '.$p->stock.' in stock', 'href' => '/products/'.$p->id, 'action' => '/favorites/'.$p->id.'/toggle'])->all();
        } elseif ($key === 'user/addresses' && Schema::hasTable('addresses')) {
            $payload['rows'] = DB::table('addresses')->where('user_id', $request->user()->id)->latest()->get(['id', 'label', 'recipient_name', 'phone', 'address', 'city', 'region', 'is_default'])->map(fn ($a) => ['title' => $a->label ?: $a->recipient_name, 'meta' => $a->phone.' · '.$a->address.' '.($a->city ?: '').' '.($a->region ?: '').($a->is_default ? ' · Default' : ''), 'href' => '/addresses'])->all();
        } elseif ($key === 'user/notifications' && Schema::hasTable('notifications')) {
            $payload['rows'] = MarketplaceNotification::where('user_id', $request->user()->id)->latest()->limit(50)->get()->map(fn ($n) => ['title' => $n->title, 'meta' => ($n->read_at ? 'Read' : 'Unread').' · '.($n->body ?: $n->type), 'href' => '/notifications'])->all();
        } elseif ($key === 'user/chats' && Schema::hasTable('conversations')) {
            $id = $request->user()->id;
            $payload['rows'] = Conversation::where(fn ($q) => $q->where('participant_one_id', $id)->orWhere('participant_two_id', $id))->with(['participantOne:id,name', 'participantTwo:id,name', 'product:id,title'])->withCount('messages')->latest('last_message_at')->limit(50)->get()->map(function ($c) use ($id) {
                $other = (int) $c->participant_one_id === (int) $id ? $c->participantTwo : $c->participantOne;

                return ['title' => $other?->name ?: 'Conversation', 'meta' => ($c->product?->title ?: 'Marketplace chat').' · '.$c->messages_count.' messages', 'href' => '/chats/'.$c->id];
            })->all();
        } elseif ($key === 'user/offers' && Schema::hasTable('offers')) {
            $payload['rows'] = DB::table('offers')->join('products', 'products.id', '=', 'offers.product_id')->where('offers.buyer_id', $request->user()->id)->latest('offers.created_at')->get(['offers.id', 'offers.amount', 'offers.status', 'products.title'])->map(fn ($o) => ['title' => $o->title, 'meta' => number_format((float) $o->amount).' MMK · '.ucfirst($o->status), 'href' => '/offers'])->all();
        } elseif ($key === 'seller/orders' && Schema::hasTable('orders')) {
            $payload['rows'] = Order::where('seller_id', $request->user()->id)->latest()->limit(50)->get(['id', 'order_number', 'total', 'status', 'created_at'])->map(fn ($o) => ['title' => '#'.$o->order_number, 'meta' => ucfirst($o->status).' · '.number_format((float) $o->total).' MMK', 'href' => '/orders/'.$o->id])->all();
        } elseif ($key === 'seller/customers' && Schema::hasTable('orders')) {
            $payload['rows'] = User::whereIn('id', Order::where('seller_id', $request->user()->id)->pluck('buyer_id')->unique())->get(['id', 'name', 'email'])->map(fn ($u) => ['title' => $u->name, 'meta' => $u->email, 'href' => '/seller/customers'])->all();
        } elseif (str_starts_with($key, 'admin/') && Schema::hasTable('users')) {
            $payload['cards'] = [
                ['label' => 'Users', 'value' => User::count()], ['label' => 'Shops', 'value' => Schema::hasTable('shops') ? Shop::count() : 0],
                ['label' => 'Products', 'value' => Schema::hasTable('products') ? Product::count() : 0], ['label' => 'Pending reviews', 'value' => Schema::hasTable('verification_requests') ? VerificationRequest::where('status', 'pending')->count() : 0],
            ];
            $payload['rows'] = match ($screen) {
                'users' => User::latest()->limit(50)->get(['id', 'name', 'email', 'role', 'status'])->map(fn ($u) => ['title' => $u->name, 'meta' => $u->email.' · '.$u->role.' · '.$u->status, 'href' => '/admin/users'])->all(),
                'shops' => Shop::latest()->limit(50)->get(['id', 'name', 'verification_status'])->map(fn ($s) => ['title' => $s->name, 'meta' => 'Verification: '.$s->verification_status, 'href' => '/admin/shops'])->all(),
                'products' => Product::latest()->limit(50)->get(['id', 'title', 'price', 'status'])->map(fn ($p) => ['title' => $p->title, 'meta' => number_format((float) $p->price).' MMK · '.$p->status, 'href' => '/products/'.$p->id])->all(),
                default => [],
            };
        }
        if ($key === 'user/offers' && Schema::hasTable('products')) {
            $payload['products'] = Product::where('status', 'active')->where('seller_id', '!=', $request->user()->id)->orderBy('title')->limit(100)->get(['id', 'title', 'price'])->all();
        }
        if ($payload['rows'] === []) {
            $payload['empty'] = 'No records found yet.';
        }

        return Inertia::render('Parity/Screen', $payload);
    }

    private function subtitle(string $key): string
    {
        return match ($key) {
            'user/favorites' => 'Products you saved for later', 'user/notifications' => 'Order, offer, and marketplace updates', 'user/chats' => 'Chat with buyers and sellers', 'user/offers' => 'Manage your product offers', 'user/help' => 'Frequently asked questions and support', 'seller/analytics' => 'Sales and performance overview', 'seller/settings' => 'Manage your shop profile and business preferences', 'admin/reports' => 'Platform performance and moderation reports', default => 'Manage your Easy Zay Mm marketplace experience',
        };
    }

    private function actions(string $key): array
    {
        return match ($key) {
            'user/profile' => [['label' => 'Verify phone', 'href' => '/profile/complete']], 'user/addresses' => [['label' => 'Add address', 'href' => '/profile/complete']], 'user/favorites' => [['label' => 'Browse products', 'href' => '/products']], 'user/chats' => [['label' => 'Browse products', 'href' => '/products']], 'seller/orders' => [['label' => 'Open reports', 'href' => '/seller/reports']], 'admin/users' => [['label' => 'Review verification queue', 'href' => '/admin/verifications']], default => [],
        };
    }
}
