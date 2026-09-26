<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ChatController extends Controller
{
    public function start(Request $request): RedirectResponse
    {
        $data = $request->validate(['product_id' => ['required', 'integer', 'exists:products,id']]);
        $product = Product::with('seller')->findOrFail($data['product_id']);
        $buyerId = (int) $request->user()->id;
        $sellerId = (int) $product->seller_id;
        abort_unless($sellerId > 0 && $sellerId !== $buyerId, 403);
        [$one, $two] = $buyerId < $sellerId ? [$buyerId, $sellerId] : [$sellerId, $buyerId];
        $attributes = ['participant_one_id' => $one, 'participant_two_id' => $two, 'product_id' => $product->id, 'shop_id' => $product->shop_id, 'order_id' => null];
        $conversation = Conversation::firstOrCreate($attributes, ['last_message_at' => now()]);

        return redirect()->route('chats.show', $conversation);
    }

    public function show(Request $request, Conversation $conversation): Response
    {
        $this->authorizeParticipant($request, $conversation);
        $userId = (int) $request->user()->id;
        $conversation->messages()->where('sender_id', '!=', $userId)->whereNull('read_at')->update(['read_at' => now()]);
        $conversation->load(['participantOne:id,name', 'participantTwo:id,name', 'product:id,title']);

        return Inertia::render('Chats/Show', [
            'conversation' => [
                'id' => $conversation->id,
                'title' => ((int) $conversation->participant_one_id === $userId ? $conversation->participantTwo?->name : $conversation->participantOne?->name) ?: 'Conversation',
                'product' => $conversation->product?->title,
                'messages' => $conversation->messages()->with('sender:id,name')->oldest()->get()->map(fn ($message) => [
                    'id' => $message->id,
                    'body' => $message->body,
                    'sender_id' => $message->sender_id,
                    'sender_name' => $message->sender?->name ?: 'Member',
                    'created_at' => $message->created_at?->toIso8601String(),
                    'mine' => (int) $message->sender_id === $userId,
                ])->all(),
            ],
        ]);
    }

    public function store(Request $request, Conversation $conversation): RedirectResponse
    {
        $this->authorizeParticipant($request, $conversation);
        $data = $request->validate(['body' => ['required', 'string', 'max:4000']]);
        $conversation->messages()->create(['sender_id' => $request->user()->id, 'body' => trim($data['body'])]);
        $conversation->update(['last_message_at' => now()]);

        return back();
    }

    private function authorizeParticipant(Request $request, Conversation $conversation): void
    {
        $userId = (int) $request->user()->id;
        abort_unless((int) $conversation->participant_one_id === $userId || (int) $conversation->participant_two_id === $userId, 403);
    }
}
