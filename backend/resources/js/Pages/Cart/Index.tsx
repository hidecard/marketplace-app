import { formatNumber } from './../../lib/format';
import { Link, router, usePage } from '@inertiajs/react';
import { MapPin, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import ProductImage from '../../Components/ProductImage';

type Item = {
    product: { id: number; title: string; price: string | number; stock: number; images?: string[] };
    quantity: number;
    line_total: number;
};

type Address = {
    id: number;
    label?: string | null;
    recipient_name: string;
    phone: string;
    address: string;
    city?: string | null;
    region?: string | null;
    is_default?: boolean;
};

type Props = {
    items: Item[];
    subtotal: number;
    deliveryFee: number;
    addresses: Address[];
    flash?: { success?: string };
};

export default function Index() {
    const { items, subtotal, deliveryFee, addresses, flash } = usePage<Props>().props;
    const selectedAddress = addresses.find((address) => address.is_default) || addresses[0];
    const total = subtotal + deliveryFee;

    const update = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data: Record<string, number> = {};
        new FormData(event.currentTarget).forEach((value, key) => {
            if (key.startsWith('items[')) data[key.match(/\[(\d+)\]/)?.[1] || ''] = Number(value);
        });
        router.put('/cart', { items: data });
    };

    return <AppLayout>
        <section className="mx-auto max-w-5xl px-4 py-5 pb-32 sm:px-6 sm:py-8">
            <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">Marketplace</p>
                <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">Cart {items.length ? `(${items.length})` : ''}</h1>
                <p className="mt-1 text-sm text-gray-500">Review your items before secure checkout.</p>
            </div>
            {flash?.success && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{flash.success}</div>}
            {!items.length ? <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
                <ShoppingBag className="mx-auto text-gray-300" size={56} />
                <h2 className="mt-4 text-lg font-semibold text-gray-900">Your Cart is Empty</h2>
                <p className="mt-1 text-sm text-gray-500">Add some products to get started.</p>
                <Link href="/products" className="mt-5 inline-flex rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">Start Shopping</Link>
            </div> : <form onSubmit={update} className="mt-6 grid gap-5 lg:grid-cols-[1fr_20rem]">
                <div className="space-y-3">
                    {items.map((item) => <div key={item.product.id} className="flex gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:gap-4 sm:p-4">
                        <Link href={`/products/${item.product.id}`} className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 text-gray-400 sm:h-28 sm:w-28">
                            {item.product.images?.[0] ? <ProductImage src={item.product.images[0]} alt={item.product.title} /> : <ShoppingBag size={22} />}
                        </Link>
                        <div className="min-w-0 flex-1">
                            <Link href={`/products/${item.product.id}`} className="line-clamp-2 text-sm font-semibold text-gray-900 hover:text-primary-700">{item.product.title}</Link>
                            <p className="mt-1 text-base font-bold text-primary-600">{formatNumber(item.product.price)} Ks</p>
                            <div className="mt-3 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
                                    <button type="button" className="rounded-lg p-1.5 hover:bg-white" onClick={() => router.put('/cart', { items: { [item.product.id]: Math.max(1, item.quantity - 1) } })} aria-label="Decrease quantity"><Minus size={15} /></button>
                                    <span className="w-7 text-center text-sm font-semibold">{item.quantity}</span>
                                    <button type="button" className="rounded-lg p-1.5 hover:bg-white" onClick={() => router.put('/cart', { items: { [item.product.id]: Math.min(item.product.stock, item.quantity + 1) } })} aria-label="Increase quantity"><Plus size={15} /></button>
                                </div>
                                <button type="button" onClick={() => router.delete(`/cart/${item.product.id}`)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label={`Remove ${item.product.title}`}><Trash2 size={17} /></button>
                            </div>
                        </div>
                    </div>)}
                    <button className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Update Cart</button>
                </div>
                <aside className="h-fit space-y-4 lg:sticky lg:top-20">
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-semibold text-gray-900"><MapPin size={18} /> Delivery Address</h2><Link href="/checkout" className="text-sm font-semibold text-primary-600">{selectedAddress ? 'Change' : 'Add'}</Link></div>
                        {selectedAddress ? <div className="mt-3 text-sm"><p className="font-semibold text-gray-900">{selectedAddress.label || 'Saved address'}</p><p className="mt-1 text-gray-700">{selectedAddress.recipient_name} · {selectedAddress.phone}</p><p className="mt-1 leading-5 text-gray-500">{selectedAddress.address}{selectedAddress.city ? `, ${selectedAddress.city}` : ''}{selectedAddress.region ? `, ${selectedAddress.region}` : ''}</p></div> : <p className="mt-2 text-sm text-gray-500">Choose a saved address during checkout.</p>}
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"><h2 className="font-semibold text-gray-900">Order Summary</h2><div className="mt-3 space-y-2 text-sm"><div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatNumber(subtotal)} Ks</span></div><div className="flex justify-between text-gray-600"><span>Delivery Fee</span><span className={deliveryFee ? 'text-gray-700' : 'text-emerald-600'}>{deliveryFee ? `${formatNumber(deliveryFee)} Ks` : 'Free'}</span></div><div className="flex justify-between border-t border-gray-100 pt-3 font-bold text-gray-900"><span>Total</span><span className="text-primary-600">{formatNumber(total)} Ks</span></div></div></div>
                </aside>
            </form>}
        </section>
        {items.length > 0 && <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-gray-200 bg-white/95 p-3 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] backdrop-blur lg:bottom-0"><div className="mx-auto flex max-w-5xl items-center justify-between gap-3"><div><p className="text-xs text-gray-500">Total</p><p className="font-bold text-primary-600">{formatNumber(total)} Ks</p></div><Link href="/checkout" className="rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-700">Checkout</Link></div></div>}
    </AppLayout>;
}
