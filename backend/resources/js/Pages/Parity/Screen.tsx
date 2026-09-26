import { Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowRight, Bell, CheckCircle2, FileText, Heart, MapPin, Package, Search, Store, Trash2, Users, XCircle } from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import AdminLayout from '../../Layouts/AdminLayout';

type Row = { title: string; meta?: string; href?: string; action?: string };
type Product = { id: number; title: string; price: string | number };
type Props = { kind: 'user' | 'seller' | 'admin'; screen: string; title: string; subtitle: string; cards: { label: string; value: string | number }[]; rows: Row[]; actions: { label: string; href: string }[]; products?: Product[]; empty?: string; flash?: { success?: string; error?: string } };

const iconFor = (screen: string, meta = '') => {
    if (screen.includes('shop') || meta.toLowerCase().includes('shop')) return Store;
    if (screen.includes('customer') || screen.includes('user')) return Users;
    if (screen.includes('favorite')) return Heart;
    if (screen.includes('address')) return MapPin;
    if (screen.includes('order') || screen.includes('product')) return Package;
    return FileText;
};

function AddressForm() {
    const form = useForm({ label: 'Home', recipient_name: '', phone: '', address: '', city: '', region: '' });
    return <form onSubmit={(e) => { e.preventDefault(); form.post('/addresses', { onSuccess: () => form.reset() }); }} className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2"><MapPin size={19} className="text-primary-600" /><h3 className="font-semibold text-gray-900">Add new address</h3></div>
        <div className="grid gap-3 sm:grid-cols-2">{[['label', 'Label (Home / Office)'], ['recipient_name', 'Recipient name'], ['phone', 'Phone'], ['city', 'City'], ['region', 'Region']].map(([key, placeholder]) => <input key={key} placeholder={placeholder} value={form.data[key as keyof typeof form.data]} onChange={(e) => form.setData(key as keyof typeof form.data, e.target.value)} className="rounded-lg border-gray-300 bg-white text-sm focus:border-primary-500 focus:ring-primary-500" />)}<textarea placeholder="Full address" value={form.data.address} onChange={(e) => form.setData('address', e.target.value)} className="min-h-20 rounded-lg border-gray-300 bg-white text-sm focus:border-primary-500 focus:ring-primary-500 sm:col-span-2" /><button disabled={form.processing} className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 sm:col-span-2">{form.processing ? 'Saving...' : 'Save address'}</button></div>
    </form>;
}
function OfferForm({ products }: { products: Product[] }) {
    const form = useForm({ product_id: products[0]?.id || 0, amount: '', note: '' });
    return <form onSubmit={(e) => { e.preventDefault(); form.post('/offers'); }} className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2"><FileText size={19} className="text-primary-600" /><h3 className="font-semibold text-gray-900">Make an offer</h3></div><div className="grid gap-3 sm:grid-cols-2"><select value={form.data.product_id} onChange={(e) => form.setData('product_id', Number(e.target.value))} className="rounded-lg border-gray-300 bg-white text-sm sm:col-span-2">{products.map((p) => <option key={p.id} value={p.id}>{p.title} · {Number(p.price).toLocaleString()} MMK</option>)}</select><input type="number" min="1" placeholder="Your offer amount" value={form.data.amount} onChange={(e) => form.setData('amount', e.target.value)} className="rounded-lg border-gray-300 bg-white text-sm" /><input placeholder="Note (optional)" value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} className="rounded-lg border-gray-300 bg-white text-sm" /><button disabled={form.processing} className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 sm:col-span-2">{form.processing ? 'Submitting...' : 'Submit offer'}</button></div>
    </form>;
}

function Body({ kind, screen, title, subtitle, cards, rows, actions, products = [], empty, flash }: Props) {
    return <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary-600">{kind === 'admin' ? 'Admin Panel' : kind === 'seller' ? 'Business Mode' : 'Marketplace'}</p><h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h1><p className="mt-1 text-sm text-gray-500">{subtitle}</p></div><div className="flex flex-wrap gap-2">{actions.map((action) => <Link key={action.href} href={action.href} className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"><span>{action.label}</span><ArrowRight size={16} /></Link>)}</div></div>
        {flash?.success && <div className="mt-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 size={17} />{flash.success}</div>}{flash?.error && <div className="mt-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><XCircle size={17} />{flash.error}</div>}
        {screen === 'addresses' && <div className="mt-6"><AddressForm /></div>}{screen === 'offers' && products.length > 0 && <div className="mt-6"><OfferForm products={products} /></div>}{screen === 'notifications' && rows.length > 0 && <form onSubmit={(e) => { e.preventDefault(); router.post('/notifications/read-all'); }} className="mt-5"><button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"><Bell size={16} /> Mark all as read</button></form>}
        {cards.length > 0 && <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map((card, index) => <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center justify-between"><p className="text-sm text-gray-500">{card.label}</p><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">{index % 2 === 0 ? <Package size={18} /> : <Users size={18} />}</span></div><p className="mt-3 text-2xl font-bold text-gray-900">{typeof card.value === 'number' ? card.value.toLocaleString() : card.value}</p></div>)}</div>}
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">{rows.length === 0 ? <div className="p-12 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600"><Search size={24} /></div><p className="mt-4 font-semibold text-gray-900">{empty || 'No records found yet.'}</p><p className="mt-1 text-sm text-gray-500">New activity will appear here.</p></div> : <div className="divide-y divide-gray-100">{rows.map((row) => { const Icon = iconFor(screen, row.meta); return <div key={`${row.title}-${row.meta}`} className="flex items-center gap-3 p-4 transition hover:bg-gray-50 sm:p-5"><Link href={row.href || '#'} className="flex min-w-0 flex-1 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600"><Icon size={19} /></span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-gray-900">{row.title}</span><span className="block truncate text-sm text-gray-500">{row.meta}</span></span></Link>{row.action && <button onClick={() => router.post(row.action!)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove"><Trash2 size={17} /></button>}<ArrowRight size={17} className="shrink-0 text-gray-400" /></div>; })}</div>}</div>
    </section>;
}
export default function Screen() { const props = usePage<Props>().props; return props.kind === 'admin' ? <AdminLayout title={props.title}><Body {...props} /></AdminLayout> : <AppLayout><Body {...props} /></AppLayout>; }
