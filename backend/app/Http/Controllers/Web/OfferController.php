<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class OfferController extends Controller
{
    public function index(Request $request): Response
    {
        $isSeller = $request->user()->role === 'seller' || $request->user()->role === 'admin';
        $query = DB::table('offers')->join('products', 'products.id', '=', 'offers.product_id')->join('users as other', 'other.id', '=', $isSeller ? 'offers.buyer_id' : 'offers.seller_id')->where($isSeller ? 'offers.seller_id' : 'offers.buyer_id', $request->user()->id)->latest('offers.created_at');
        $offers = $query->limit(100)->get(['offers.id', 'offers.product_id', 'offers.amount', 'offers.status', 'offers.note', 'offers.created_at', 'products.title', 'products.price', 'other.name as other_name', 'other.email as other_email']);

        return Inertia::render('Offers/Index', ['mode' => $isSeller ? 'seller' : 'buyer', 'offers' => $offers, 'products' => $isSeller ? [] : Product::where('status', 'active')->where('seller_id', '!=', $request->user()->id)->orderBy('title')->limit(100)->get(['id', 'title', 'price'])]);
    }

    public function review(Request $request, int $offer): RedirectResponse
    {
        $data = $request->validate(['status' => ['required', 'in:accepted,rejected,countered'], 'note' => ['nullable', 'string', 'max:1000']]);
        $row = DB::table('offers')->join('products', 'products.id', '=', 'offers.product_id')->where('offers.id', $offer)->where('offers.seller_id', $request->user()->id)->first(['offers.id']);
        abort_unless($row, 404);
        DB::table('offers')->where('id', $offer)->update(['status' => $data['status'], 'note' => $data['note'] ?? null, 'updated_at' => now()]);

        return back()->with('success', 'Offer updated.');
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate(['product_id' => ['required', 'integer', 'exists:products,id'], 'amount' => ['required', 'integer', 'min:1'], 'note' => ['nullable', 'string', 'max:1000']]);
        $product = Product::query()->whereKey($data['product_id'])->where('status', 'active')->firstOrFail();
        abort_if((int) $product->seller_id === (int) $request->user()->id, 422, 'You cannot make an offer on your own product.');
        DB::table('offers')->insert(['product_id' => $product->id, 'buyer_id' => $request->user()->id, 'seller_id' => $product->seller_id, 'amount' => $data['amount'], 'status' => 'pending', 'note' => $data['note'] ?? null, 'created_at' => now(), 'updated_at' => now()]);
        return back()->with('success', 'Offer submitted.');
    }
}
