import { Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Check, MapPin, Package, ShieldCheck } from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import ProductImage from '../../Components/ProductImage';
import type { SharedProps } from '../../types';

type Item = { product: { id: number; title?: string; name?: string; price: string | number; images?: string[] }; quantity: number; line_total: number };
type Address = { id: number; label: string; recipient_name: string; phone: string; address: string; city?: string | null; region?: string | null; is_default?: boolean };
type Props = SharedProps & Record<string, unknown> & { items: Item[]; subtotal: number; deliveryFee: number; sellerCount: number; addresses: Address[] };
type Data = { name: string; phone: string; address: string; address_id: number | ''; payment_method: 'cod' };

export default function Checkout() {
    const { items, subtotal, deliveryFee, sellerCount, addresses, errors } = usePage<Props>().props;
    const defaultAddress = addresses.find((address) => address.is_default) || addresses[0];
    const form = useForm<Data>({
        name: defaultAddress?.recipient_name || '',
        phone: defaultAddress?.phone || '',
        address: defaultAddress ? [defaultAddress.address, defaultAddress.city, defaultAddress.region].filter(Boolean).join(', ') : '',
        address_id: defaultAddress?.id || '',
        payment_method: 'cod',
    });
    const chooseAddress = (address: Address) => form.setData({
        name: address.recipient_name,
        phone: address.phone,
        address: [address.address, address.city, address.region].filter(Boolean).join(', '),
        address_id: address.id,
    });
    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        form.post('/checkout', { preserveScroll: true });
    };
    const errorMessages = Object.values(form.errors).length ? Object.values(form.errors) : Object.values(errors || {});

    return <AppLayout><section className="mx-auto max-w-5xl px-4 py-6 pb-28 sm:px-6 sm:py-8">
        <Link href="/cart" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-primary-700"><ArrowLeft size={17} /> Back to cart</Link>
        <div className="mt-5"><p className="text-xs font-bold uppercase tracking-widest text-primary-700">Secure checkout</p><h1 className="mt-2 text-3xl font-black text-gray-950">Delivery details</h1><p className="mt-2 text-sm text-gray-500">Choose a saved address or enter a new delivery address.</p></div>
        {errorMessages.map((error) => <p key={error} className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>)}
        {!items.length ? <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center"><Package className="mx-auto text-gray-300" size={48} /><h2 className="mt-4 text-xl font-bold text-gray-900">Your cart is empty</h2><Link href="/products" className="mt-5 inline-flex rounded-xl bg-primary-600 px-5 py-3 font-bold text-white">Browse products</Link></div> : <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
            <form onSubmit={submit} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 sm:p-6">
                {sellerCount > 1 && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Separate checkout required.</strong><p className="mt-1">Your cart contains products from {sellerCount} sellers. Remove products until only one seller remains, then place the order.</p><Link href="/cart" className="mt-3 inline-flex font-bold underline">Return to cart</Link></div>}
                {addresses.length > 0 && <div><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-gray-900">Saved addresses</h2><Link href="/addresses" className="text-sm font-semibold text-primary-600">Manage</Link></div><div className="mt-3 grid gap-3 sm:grid-cols-2">{addresses.map((address) => <button type="button" key={address.id} onClick={() => chooseAddress(address)} className={`rounded-xl border p-3 text-left transition ${form.data.address_id === address.id ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-100' : 'border-gray-200 hover:border-primary-300'}`}><div className="flex items-center justify-between gap-2"><span className="font-bold text-gray-900">{address.label}</span>{form.data.address_id === address.id && <Check size={17} className="text-primary-600" />}</div><p className="mt-1 text-sm font-medium text-gray-700">{address.recipient_name} · {address.phone}</p><p className="mt-1 line-clamp-2 text-xs text-gray-500">{address.address}, {address.city} {address.region}</p></button>)}</div></div>}
                <div className="mt-6 border-t border-gray-100 pt-5"><h2 className="text-lg font-bold text-gray-900">Delivery information</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-gray-700">Full name<input required value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} className="mt-2 w-full rounded-xl border-gray-300" placeholder="Recipient name" /></label><label className="block text-sm font-semibold text-gray-700">Phone<input required value={form.data.phone} onChange={(event) => form.setData('phone', event.target.value)} className="mt-2 w-full rounded-xl border-gray-300" placeholder="09..." /></label></div><label className="mt-4 block text-sm font-semibold text-gray-700">Delivery address<textarea required value={form.data.address} onChange={(event) => form.setData('address', event.target.value)} className="mt-2 min-h-28 w-full rounded-xl border-gray-300" placeholder="Street, township, region" /></label></div>
                <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4"><div className="flex items-start gap-3 text-sm text-emerald-800"><ShieldCheck className="mt-0.5 shrink-0 text-emerald-600" size={18} /><div><p className="font-bold">Payment method</p><label className="mt-2 flex cursor-pointer items-center gap-2"><input type="radio" checked={form.data.payment_method === 'cod'} onChange={() => form.setData('payment_method', 'cod')} /> <span>Cash on Delivery (COD)</span></label><p className="mt-1 text-xs text-emerald-700">Online payment gateways are not enabled yet. No payment will be charged online.</p></div></div></div><button type="submit" disabled={form.processing || sellerCount > 1} className="mt-5 w-full rounded-xl bg-primary-600 px-4 py-3.5 font-bold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">{form.processing ? 'Placing order...' : sellerCount > 1 ? 'Checkout one seller at a time' : 'Place COD order'}</button>
            </form>
            <aside className="h-fit rounded-2xl bg-gray-950 p-5 text-white shadow-sm"><h2 className="text-lg font-bold">Order summary</h2><div className="mt-4 space-y-4">{items.map((item) => <div key={item.product.id} className="flex gap-3"><div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-800">{item.product.images?.[0] ? <ProductImage src={item.product.images[0]} alt="" /> : <Package className="m-auto mt-4 text-gray-500" size={20} />}</div><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-semibold">{item.product.title || item.product.name || 'Product'}</p><p className="mt-1 text-xs text-gray-400">{item.quantity} × {Number(item.product.price).toLocaleString()} Ks</p></div><span className="text-sm font-bold">{Number(item.line_total).toLocaleString()}</span></div>)}</div><div className="mt-5 space-y-2 border-t border-white/15 pt-4 text-sm"><div className="flex justify-between"><span className="text-gray-400">Subtotal</span><span>{Number(subtotal).toLocaleString()} Ks</span></div><div className="flex justify-between"><span className="text-gray-400">Delivery fee</span><span>{deliveryFee ? `${Number(deliveryFee).toLocaleString()} Ks` : 'Free'}</span></div><div className="flex items-center justify-between border-t border-white/15 pt-3"><span className="text-gray-300">Total</span><strong className="text-xl">{Number(subtotal + deliveryFee).toLocaleString()} Ks</strong></div></div><div className="mt-4 flex items-center gap-2 text-xs text-gray-400"><MapPin size={14} /> Delivery fee is calculated from the active platform shipping rule.</div></aside>
        </div>}
    </section></AppLayout>;
}
