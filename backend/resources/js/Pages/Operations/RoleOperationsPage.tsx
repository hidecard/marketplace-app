import { Link, router, useForm } from '@inertiajs/react';
import { ArrowRight, BarChart3, CheckCircle2, Eye, FileText, Package, Plus, Settings2, ShieldCheck, ShoppingBag, Store, Trash2, Users, XCircle } from 'lucide-react';
import type { ComponentType } from 'react';
import type { SharedProps } from '../../types';

type Action = { label: string; href: string; method?: 'get' | 'post' | 'delete' };
type Row = { id: number | string; title: string; meta?: string; href?: string; actions?: Action[]; status?: string };
type Card = { label: string; value: string | number };
export type RoleOperationsProps = SharedProps & Record<string, unknown> & { kind: 'seller' | 'admin'; screen: string; title: string; subtitle: string; rows: Row[]; cards: Card[]; shop?: { name: string; verified: boolean } | null; flash?: string };

type Icon = ComponentType<{ size?: number; className?: string }>;
const iconFor = (screen: string): Icon => {
    if (screen === 'users' || screen === 'customers') return Users;
    if (screen === 'shops') return Store;
    if (screen === 'products') return Package;
    if (screen === 'orders') return ShoppingBag;
    if (screen === 'analytics' || screen === 'reports') return BarChart3;
    if (screen === 'categories') return Settings2;
    return FileText;
};
const statusTone = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-600';
    if (['active', 'approved', 'delivered', 'completed', 'verified'].includes(status)) return 'bg-emerald-50 text-emerald-700';
    if (['pending', 'processing', 'preparing', 'shipped'].includes(status)) return 'bg-amber-50 text-amber-700';
    return 'bg-red-50 text-red-700';
};

function CategoryForm({ path }: { path: string }) {
    const form = useForm({ name: '', slug: '', sort_order: 0 });
    return <form onSubmit={(event) => { event.preventDefault(); form.post(path, { onSuccess: () => form.reset() }); }} className="mt-6 grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:grid-cols-[1fr_1fr_7rem_auto]">
        <input required placeholder="Category name" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} className="rounded-xl border-gray-200 text-sm" />
        <input placeholder="Slug (optional)" value={form.data.slug} onChange={(event) => form.setData('slug', event.target.value)} className="rounded-xl border-gray-200 text-sm" />
        <input type="number" min="0" placeholder="Order" value={form.data.sort_order} onChange={(event) => form.setData('sort_order', Number(event.target.value))} className="rounded-xl border-gray-200 text-sm" />
        <button disabled={form.processing} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50"><Plus size={16} />{form.processing ? 'Saving' : 'Add category'}</button>
    </form>;
}

export default function RoleOperationsPage({ kind, screen, title, subtitle, rows, cards, shop, flash }: RoleOperationsProps) {
    const isAdmin = kind === 'admin';
    const Icon = iconFor(screen);
    return <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-xs font-black uppercase tracking-[0.18em] text-primary-700">{isAdmin ? 'Admin control center' : 'Seller workspace'}</p><h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950">{title}</h1><p className="mt-2 max-w-2xl text-sm text-gray-500">{subtitle}</p></div>
            <div className="flex items-center gap-2">{screen === 'products' && isAdmin && <Link href="/admin/products/create" className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-700"><Plus size={16} />Add product</Link>}{shop && <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm ring-1 ring-gray-100"><p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Current shop</p><p className="mt-1 font-bold text-gray-900">{shop.name}</p><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${shop.verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{shop.verified ? 'Verified' : 'Verification required'}</span></div>}</div>
        </div>
        {flash && <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800"><CheckCircle2 size={17} />{flash}</div>}
        {cards.length > 0 && <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map((card, index) => <div key={card.label} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100"><div className="flex items-center justify-between"><p className="text-sm text-gray-500">{card.label}</p><span className={`rounded-xl p-2 ${index % 2 ? 'bg-violet-50 text-violet-700' : 'bg-primary-50 text-primary-700'}`}><Icon size={19} /></span></div><p className="mt-4 text-2xl font-black text-gray-950">{typeof card.value === 'number' ? card.value.toLocaleString() : card.value}</p></div>)}</div>}
        {screen === 'categories' && <CategoryForm path={isAdmin ? '/admin/categories' : '/seller/categories'} />}
        <div className="mt-7 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><div><h2 className="font-bold text-gray-900">{screen === 'analytics' || screen === 'reports' ? 'Recent activity' : 'Workspace records'}</h2><p className="mt-0.5 text-xs text-gray-500">{rows.length} record{rows.length === 1 ? '' : 's'} available</p></div><span className="rounded-xl bg-gray-50 p-2 text-gray-500"><Eye size={18} /></span></div>
            {rows.length === 0 ? <div className="p-14 text-center"><Icon className="mx-auto text-gray-300" size={42} /><p className="mt-4 font-bold text-gray-900">Nothing here yet</p><p className="mt-1 text-sm text-gray-500">New activity will appear as your marketplace grows.</p></div> : <div className="divide-y divide-gray-100">{rows.map((row) => <div key={String(row.id)} className="flex flex-col gap-3 px-5 py-4 transition hover:bg-gray-50 sm:flex-row sm:items-center"><Link href={row.href || '#'} className="flex min-w-0 flex-1 items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700"><Icon size={19} /></span><span className="min-w-0"><span className="block truncate font-bold text-gray-900">{row.title}</span><span className="mt-1 block truncate text-sm text-gray-500">{row.meta}</span></span></Link><div className="flex flex-wrap items-center gap-2 pl-14 sm:pl-0">{row.status && <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusTone(row.status)}`}>{row.status}</span>}{row.actions?.map((action) => <button key={action.href} onClick={() => { if (action.method === 'get') router.get(action.href); else if (action.method === 'delete') { if (window.confirm('Delete this record?')) router.delete(action.href); } else router.post(action.href); }} className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700">{action.label}</button>)}{!row.actions?.length && <ArrowRight size={17} className="text-gray-300" />}</div></div>)}</div>}
        </div>
        {isAdmin && <div className="mt-5 flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800"><ShieldCheck size={18} /><span>Admin actions are server-authorized and every status change is recorded by Laravel.</span></div>}
    </section>;
}
