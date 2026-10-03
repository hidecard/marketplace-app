import { Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, Grid2X2, List, MapPin, Search, ShieldCheck, Store, Users } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';

type Shop = {
    id: number;
    name: string;
    slug: string;
    description?: string | null;
    logo_url?: string | null;
    address?: string | null;
    verified: boolean;
    products_count: number;
    followers_count: number;
};
type Filters = { q?: string; sort?: string };
type Props = { shops: { data: Shop[]; current_page: number; last_page: number; total: number; next_page_url?: string | null; prev_page_url?: string | null }; filters: Filters };

export default function Index() {
    const { shops, filters } = usePage<Props>().props;
    const [query, setQuery] = useState(filters.q || '');
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const apply = (event: FormEvent) => {
        event.preventDefault();
        router.get('/shops', { q: query || undefined, sort: filters.sort || undefined }, { preserveState: true, replace: true });
    };
    const sort = (value: string) => router.get('/shops', { q: filters.q || undefined, sort: value || undefined }, { preserveState: true, replace: true });

    return <AppLayout>
        <section className="min-h-screen bg-gray-50 pb-24">
            <header className="border-b border-gray-200 bg-white px-4 pb-4 pt-4 sm:px-6">
                <div className="mx-auto max-w-6xl">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="rounded-full p-2 text-gray-600 hover:bg-gray-100" aria-label="Back to marketplace"><ArrowLeft size={21} /></Link>
                        <div><p className="text-xs font-semibold uppercase tracking-wider text-primary-600">Marketplace</p><h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Explore Shops</h1></div>
                    </div>
                    <form onSubmit={apply} className="relative mt-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={19} />
                        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search shops, cities, or services..." className="w-full rounded-full border-0 bg-gray-100 py-3 pl-10 pr-4 text-sm shadow-inner focus:bg-white focus:ring-2 focus:ring-primary-500" />
                    </form>
                </div>
            </header>
            <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-gray-500"><span className="font-semibold text-gray-900">{shops.total}</span> verified shops found</p>
                    <div className="flex items-center gap-2">
                        <select value={filters.sort || ''} onChange={(event) => sort(event.target.value)} className="rounded-full border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm"><option value="">Newest</option><option value="products">Most Products</option><option value="name">Name A–Z</option></select>
                        <div className="flex rounded-lg bg-gray-100 p-1"><button type="button" onClick={() => setView('grid')} className={`rounded p-1.5 ${view === 'grid' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`} aria-label="Grid view"><Grid2X2 size={16} /></button><button type="button" onClick={() => setView('list')} className={`rounded p-1.5 ${view === 'list' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`} aria-label="List view"><List size={16} /></button></div>
                    </div>
                </div>
                {shops.data.length === 0 ? <div className="rounded-2xl bg-white px-5 py-16 text-center shadow-sm ring-1 ring-gray-100"><Store className="mx-auto text-gray-300" size={52} /><h2 className="mt-4 text-lg font-bold text-gray-900">No shops found</h2><p className="mt-1 text-sm text-gray-500">Try another search or browse all verified shops.</p><button type="button" onClick={() => { setQuery(''); router.get('/shops'); }} className="mt-5 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white">Clear search</button></div> : <div className={view === 'grid' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-3'}>{shops.data.map((shop) => <Link key={shop.id} href={`/shops/${shop.id}`} className={`group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-md ${view === 'list' ? 'flex items-center gap-4' : ''}`}><div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary-50 text-2xl font-black text-primary-700 ${view === 'list' ? 'h-16 w-16' : 'h-20 w-20'}`}>{shop.logo_url ? <img src={shop.logo_url} alt={shop.name} className="h-full w-full object-cover" /> : shop.name.charAt(0).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="mt-3 flex items-center gap-2"><h2 className="truncate font-bold text-gray-900">{shop.name}</h2>{shop.verified && <ShieldCheck className="shrink-0 text-primary-600" size={17} />}</div><p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">{shop.description || 'A verified Easy Zay Mm marketplace shop.'}</p><div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500"><span className="flex items-center gap-1"><Store size={13} />{shop.products_count} products</span><span className="flex items-center gap-1"><Users size={13} />{shop.followers_count} followers</span>{shop.address && <span className="flex items-center gap-1 truncate"><MapPin size={13} />{shop.address}</span>}</div></div></Link>)}</div>}
                {(shops.prev_page_url || shops.next_page_url) && <div className="mt-6 flex justify-center gap-3"><button disabled={!shops.prev_page_url} onClick={() => shops.prev_page_url && router.get(shops.prev_page_url)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm disabled:opacity-40">Previous</button><span className="rounded-lg bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700">Page {shops.current_page} of {shops.last_page}</span><button disabled={!shops.next_page_url} onClick={() => shops.next_page_url && router.get(shops.next_page_url)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm disabled:opacity-40">Next</button></div>}
            </div>
        </section>
    </AppLayout>;
}
