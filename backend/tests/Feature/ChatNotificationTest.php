<?php

namespace Tests\Feature;

use App\Models\MarketplaceNotification;
use App\Models\Order;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ChatNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_buyer_and_seller_can_create_order_chat_and_send_messages(): void
    {
        $buyer = User::factory()->create(['role' => User::ROLE_USER]);
        $seller = User::factory()->create(['role' => User::ROLE_SELLER]);
        $shop = Shop::create(['owner_id' => $seller->id, 'name' => 'Chat Shop', 'slug' => 'chat-shop', 'verified' => true, 'verification_status' => 'approved']);
        $order = Order::create(['order_number' => 'ORD-CHAT-1', 'buyer_id' => $buyer->id, 'seller_id' => $seller->id, 'shop_id' => $shop->id, 'subtotal' => 100, 'delivery_fee' => 0, 'total' => 100, 'payment_method' => 'cod', 'status' => 'pending', 'delivery_address' => ['address' => 'Yangon'], 'idempotency_key' => 'chat-order-1']);

        Sanctum::actingAs($buyer);
        $conversation = $this->postJson('/api/conversations', ['order_id' => $order->id])->assertCreated()->json('conversation');
        $this->postJson('/api/conversations', ['order_id' => $order->id])->assertCreated()->assertJsonPath('conversation.id', $conversation['id']);
        $this->postJson("/api/conversations/{$conversation['id']}/messages", ['body' => 'Where is my order?'])->assertCreated();

        Sanctum::actingAs($seller);
        $this->getJson("/api/conversations/{$conversation['id']}/messages")->assertOk()->assertJsonPath('data.0.body', 'Where is my order?');
        $this->postJson("/api/conversations/{$conversation['id']}/messages", ['body' => 'It is being prepared.'])->assertCreated();
        $this->postJson("/api/conversations/{$conversation['id']}/read")->assertOk();
    }

    public function test_non_participant_cannot_read_or_send_chat_messages(): void
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->create(['role' => User::ROLE_SELLER]);
        $outsider = User::factory()->create();
        $shop = Shop::create(['owner_id' => $seller->id, 'name' => 'Private Chat Shop', 'slug' => 'private-chat-shop']);
        $order = Order::create(['order_number' => 'ORD-CHAT-2', 'buyer_id' => $buyer->id, 'seller_id' => $seller->id, 'shop_id' => $shop->id, 'subtotal' => 100, 'delivery_fee' => 0, 'total' => 100, 'payment_method' => 'cod', 'status' => 'pending', 'idempotency_key' => 'chat-order-2']);
        Sanctum::actingAs($buyer);
        $id = $this->postJson('/api/conversations', ['order_id' => $order->id])->json('conversation.id');
        Sanctum::actingAs($outsider);
        $this->getJson("/api/conversations/{$id}/messages")->assertForbidden();
        $this->postJson("/api/conversations/{$id}/messages", ['body' => 'Intrusion'])->assertForbidden();
    }

    public function test_notifications_are_user_scoped_and_can_be_marked_read(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $notification = MarketplaceNotification::create(['user_id' => $user->id, 'type' => 'order.created', 'title' => 'New order', 'body' => 'You have a new order.', 'data' => ['order_id' => 1], 'idempotency_key' => 'notification-1']);
        $otherNotification = MarketplaceNotification::create(['user_id' => $other->id, 'type' => 'private', 'title' => 'Private', 'idempotency_key' => 'notification-2']);
        Sanctum::actingAs($user);
        $this->getJson('/api/notifications')->assertOk()->assertJsonPath('unread_count', 1)->assertJsonPath('notifications.data.0.id', $notification->id);
        $this->postJson("/api/notifications/{$otherNotification->id}/read")->assertForbidden();
        $this->postJson("/api/notifications/{$notification->id}/read")->assertOk();
        $this->assertNotNull($notification->fresh()->read_at);
    }
}
