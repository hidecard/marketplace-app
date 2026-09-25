import { Link, router, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import AppLayout from '../../Layouts/AppLayout';

type Product = { id: number; title: string; brand?: string; description?: string; price: string | number; stock: number; condition?: string; images?: string[]; shop?: { name: string; slug: string; verified?: boolean; address?: string }; category?: { name: string; slug: string } };
type Category = { name: string; slug: string };
type Filters = { q?: string; brand?: string; category?: string; shop?: string; verified?: string | boolean; condition?: string; min_price?: string; max_price?: string; sort?: string };
type Props = { products: { data: Product[]; links: { url: string | null; label: string; active: boolean }[] }; categories: Category[]; filters: Filters };

export default function Index() {
    const { products, categories, filters } = usePage<Props>().props;
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget).entries());
        router.get('/products', data, { preserveState: true, replace: true });
    };
    return <AppLayout><section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div><p className="text-sm font-bold uppercase tracking-widest text-primary-700">Marketplace</p><h1 className="mt-2 text-4xl font-black">Find something useful</h1></div>
        <form onSubmit={submit} className="mt-8 grid gap-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:grid-cols-4 lg:grid-cols-8">
            <input name="q" defaultValue={filters.q} placeholder="Product, brand or keyword" className="rounded-xl border-slate-300 lg:col-span-2" />
            <input name="brand" defaultValue={filters.brand} placeholder="Brand" className="rounded-xl border-slate-300" />
            <select name="category" defaultValue={filters.category ?? ''} className="rounded-xl border-slate-300"><option value="">All categories</option>{categories.map((category) => <option value={category.slug} key={category.slug}>{category.name}</option>)}</select>
            <input name="shop" defaultValue={filters.shop} placeholder="Shop / location" className="rounded-xl border-slate-300" />
            <select name="condition" defaultValue={filters.condition ?? ''} className="rounded-xl border-slate-300"><option value="">Any condition</option><option value="new">New</option><option value="used">Used</option><option value="refurbished">Refurbished</option></select>
            <input name="min_price" defaultValue={filters.min_price} type="number" min="0" placeholder="Min MMK" className="rounded-xl border-slate-300" />
            <input name="max_price" defaultValue={filters.max_price} type="number" min="0" placeholder="Max MMK" className="rounded-xl border-slate-300" />
            <label className="flex items-center gap-2 text-sm font-bold"><input name="verified" value="1" type="checkbox" defaultChecked={filters.verified === true || filters.verified === '1'} className="rounded border-slate-300" /> Verified shops</label>
            <select name="sort" defaultValue={filters.sort ?? ''} className="rounded-xl border-slate-300"><option value="">Recommended</option><option value="newest">Newest</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select>
            <button className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white md:col-span-2 lg:col-span-1">Search</button>
        </form>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{products.data.map((product) => <Link href={`/products/${product.id}`} key={product.id} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-lg"><div className="flex aspect-square items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100 text-5xl">{product.images?.[0] ? <img src={product.images[0]} alt="" className="h-full w-full object-cover" /> : '✦'}</div><div className="p-5"><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-widest text-slate-400">{product.shop?.name || 'Marketplace seller'}</p>{product.shop?.verified && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">Verified</span>}</div><h2 className="mt-2 line-clamp-2 text-lg font-black">{product.title}</h2><p className="mt-3 text-xl font-black text-primary-700">{Number(product.price).toLocaleString()} MMK</p><p className="mt-1 text-sm capitalize text-slate-500">{product.condition || 'new'} · {product.stock} in stock</p></div></Link>)}{products.data.length === 0 && <div className="col-span-full rounded-3xl bg-white p-12 text-center text-slate-500">No products found.</div>}</div>
        <div className="mt-8 flex flex-wrap gap-2">{products.links.map((link) => link.url && <Link key={link.label} href={link.url} className={`rounded-lg px-3 py-2 text-sm ${link.active ? 'bg-primary-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`} dangerouslySetInnerHTML={{ __html: link.label }} />)}</div>
    </section></AppLayout>;
}
