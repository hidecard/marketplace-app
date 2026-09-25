<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\BusinessController as ApiBusinessController;
use App\Http\Controllers\Api\ReportController as ApiReportController;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BusinessController extends Controller
{
    public function inventory(Request $request): Response { return Inertia::render('Seller/Inventory', ['products' => $request->user()->shop->products()->latest()->paginate(50)]); }
    public function pos(Request $request): Response { return Inertia::render('Seller/POS', ['products' => $request->user()->shop->products()->where('status', 'active')->where('stock', '>', 0)->orderBy('title')->get(['id', 'title', 'price', 'stock'])]); }
    public function sale(Request $request): RedirectResponse { $data = $request->validate(['product_id' => ['required', 'integer', 'exists:products,id'], 'quantity' => ['required', 'integer', 'min:1'], 'payment_method' => ['required', 'in:cash,kbzpay,wavepay,bank_transfer']]); $request->merge(['items' => [['product_id' => $data['product_id'], 'quantity' => $data['quantity']]], 'idempotency_key' => 'web-pos-'.now()->format('YmdHis').'-'.bin2hex(random_bytes(4))]); app(ApiBusinessController::class)->posSale($request); return back()->with('success', 'POS sale completed.'); }
    public function expenses(Request $request): Response { return Inertia::render('Seller/Expenses', ['expenses' => app(\App\Models\Expense::class)->where('shop_id', $request->user()->shop->id)->latest('expense_date')->paginate(30)]); }
    public function expense(Request $request): RedirectResponse { $data = $request->validate(['amount' => ['required', 'numeric', 'gt:0'], 'category' => ['required', 'string', 'max:100'], 'description' => ['nullable', 'string', 'max:5000'], 'expense_date' => ['required', 'date']]); $request->merge([...$data, 'idempotency_key' => 'web-expense-'.now()->format('YmdHis').'-'.bin2hex(random_bytes(4))]); app(ApiBusinessController::class)->createExpense($request); return back()->with('success', 'Expense recorded.'); }
    public function reports(Request $request): Response { $data = app(ApiReportController::class)->summary($request)->getData(true); return Inertia::render('Seller/Reports', ['summary' => $data]); }
    public function adjust(Request $request, Product $product): RedirectResponse { $data = $request->validate(['quantity_delta' => ['required', 'integer', 'between:-1000000,1000000', 'not_in:0'], 'reason' => ['required', 'string', 'max:80']]); $request->merge([...$data, 'product_id' => $product->id, 'idempotency_key' => 'web-stock-'.now()->format('YmdHis').'-'.bin2hex(random_bytes(4))]); app(ApiBusinessController::class)->adjustInventory($request); return back()->with('success', 'Stock updated.'); }
}
