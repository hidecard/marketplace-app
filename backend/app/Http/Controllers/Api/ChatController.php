<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Order;
use App\Models\Product;
use App\Models\Shop;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ChatController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $id = $request->user()->id;
        $conversations = Conversation::query()
            ->where(fn ($q) => $q->where('participant_one_id', $id)->orWhere('participant_two_id', $id))
            ->with(['participantOne:id,name', 'participantTwo:id,name', 'order:id,order_number,status', 'product:id,name', 'shop:id,name'])
            ->withCount('messages')->latest('last_message_at')->paginate(min($request->integer('per_page', 30), 100));

        return response()->json($conversations);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'participant_id' => ['sometimes', 'integer', 'exists:users,id', 'different:'.(int) $request->user()->id],
            'order_id' => ['sometimes', 'nullable', 'integer', 'exists:orders,id'],
            'product_id' => ['sometimes', 'nullable', 'integer', 'exists:products,id'],
            'shop_id' => ['sometimes', 'nullable', 'integer', 'exists:shops,id'],
        ]);
        $user = $request->user();
        $otherId = $data['participant_id'] ?? null;
        if (! empty($data['order_id'])) {
            $order = Order::findOrFail($data['order_id']);
            abort_unless(in_array($user->id, [$order->buyer_id, $order->seller_id], true), 403);
            $otherId = $otherId ?: ((int) $order->buyer_id === (int) $user->id ? $order->seller_id : $order->buyer_id);
        } elseif (! empty($data['product_id'])) {
            $product = Product::findOrFail($data['product_id']);
            abort_unless((int) $product->seller_id !== (int) $user->id, 403);
            $otherId = $otherId ?: $product->seller_id;
            $data['shop_id'] = $data['shop_id'] ?? $product->shop_id;
        } elseif (! empty($data['shop_id'])) {
            $shop = Shop::findOrFail($data['shop_id']);
            abort_unless((int) $shop->owner_id !== (int) $user->id, 403);
            $otherId = $otherId ?: $shop->owner_id;
        }
        if (! $otherId) {
            throw ValidationException::withMessages(['participant_id' => ['A participant or valid order/product/shop context is required.']]);
        }

        $one = min((int) $user->id, (int) $otherId);
        $two = max((int) $user->id, (int) $otherId);
        $conversation = Conversation::query()
            ->where(['participant_one_id' => $one, 'participant_two_id' => $two, 'order_id' => $data['order_id'] ?? null, 'product_id' => $data['product_id'] ?? null, 'shop_id' => $data['shop_id'] ?? null])
            ->first();
        if (! $conversation) {
            $conversation = Conversation::create(['participant_one_id' => $one, 'participant_two_id' => $two, 'order_id' => $data['order_id'] ?? null, 'product_id' => $data['product_id'] ?? null, 'shop_id' => $data['shop_id'] ?? null]);
        }

        return response()->json(['conversation' => $conversation->load(['participantOne:id,name', 'participantTwo:id,name'])], 201);
    }

    public function messages(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorizeParticipant($request, $conversation);

        return response()->json($conversation->messages()->with('sender:id,name')->latest()->paginate(min($request->integer('per_page', 50), 100)));
    }

    public function send(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorizeParticipant($request, $conversation);
        $data = $request->validate(['body' => ['required', 'string', 'max:5000']]);
        $message = DB::transaction(function () use ($request, $conversation, $data): Message {
            $message = $conversation->messages()->create(['sender_id' => $request->user()->id, 'body' => trim($data['body'])]);
            $conversation->update(['last_message_at' => now()]);

            return $message;
        });

        return response()->json(['message' => $message->load('sender:id,name')], 201);
    }

    public function markRead(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorizeParticipant($request, $conversation);
        $conversation->messages()->whereNull('read_at')->where('sender_id', '!=', $request->user()->id)->update(['read_at' => now()]);

        return response()->json(['message' => 'Conversation marked as read']);
    }

    private function authorizeParticipant(Request $request, Conversation $conversation): void
    {
        abort_unless(in_array((int) $request->user()->id, [(int) $conversation->participant_one_id, (int) $conversation->participant_two_id], true), 403);
    }
}
