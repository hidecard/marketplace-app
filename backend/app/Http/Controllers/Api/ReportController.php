<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Order;
use App\Models\PosSale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => ['sometimes', 'date'],
            'to' => ['sometimes', 'date', 'after_or_equal:from'],
        ]);
        $from = Carbon::parse($data['from'] ?? now()->startOfMonth())->startOfDay();
        $to = Carbon::parse($data['to'] ?? now())->endOfDay();
        $user = $request->user();

        $sales = PosSale::query()->whereBetween('created_at', [$from, $to]);
        $orders = Order::query()->whereBetween('created_at', [$from, $to]);
        $expenses = Expense::query()->whereDate('expense_date', '>=', $from->toDateString())->whereDate('expense_date', '<=', $to->toDateString());
        if (!$user->isAdmin()) {
            $shopId = $user->shop->id;
            $sales->where('shop_id', $shopId);
            $orders->where('seller_id', $user->id);
            $expenses->where('shop_id', $shopId);
        }

        $salesTotals = $sales->selectRaw('COUNT(*) as count, COALESCE(SUM(total), 0) as revenue, COALESCE(SUM(cost_of_goods_sold), 0) as cogs, COALESCE(SUM(gross_profit), 0) as gross_profit')->first();
        $orderTotals = $orders->whereNotIn('status', ['cancelled'])->selectRaw('COUNT(*) as count, COALESCE(SUM(total), 0) as revenue')->first();
        $expenseTotal = (float) $expenses->sum('amount');

        $dailySales = $sales->selectRaw('DATE(created_at) as day, COUNT(*) as count, COALESCE(SUM(total), 0) as revenue, COALESCE(SUM(gross_profit), 0) as gross_profit')
            ->groupBy(DB::raw('DATE(created_at)'))->orderBy('day')->get();

        return response()->json([
            'range' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'pos' => [
                'count' => (int) $salesTotals->count,
                'revenue' => (float) $salesTotals->revenue,
                'cogs' => (float) $salesTotals->cogs,
                'gross_profit' => (float) $salesTotals->gross_profit,
            ],
            'marketplace_orders' => [
                'count' => (int) $orderTotals->count,
                'revenue' => (float) $orderTotals->revenue,
            ],
            'expenses' => ['total' => $expenseTotal],
            'net_profit' => (float) $salesTotals->gross_profit - $expenseTotal,
            'daily_sales' => $dailySales,
        ]);
    }
}
