import { Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Grid2X2, Heart, List, MapPin, MessageCircle, Package, Phone, QrCode, Share2, ShieldCheck, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import ProductImage from '../../Components/ProductImage';
import type { SharedProps } from '../../types';

type Product = { id: number; title: string; price: string | number; stock: number; condition?: string; images?: string[]; created_at?: string | null };
type Shop = { id: number; name: string; slug: string; description?: string; logo_url?: string; cover_url?: string; phone?: string; email?: string; address?: string; verified: boolean; products_count: number; followers_count: number; products: Product[]; facebook_url?: string | null; instagram_url?: string | null; tiktok_url?: string | null; website_url?: string | null };
type Props = SharedProps & Record<string, unknown> & { shop: Shop; isFollowing: boolean; authUser?: { id: number } | null; flash?: { success?: string; error?: string } };
type Sort = 'newest' | 'price_low' | 'price_high';

const money = (value: string | number) => `${Number(value).toLocaleString()} MMK`;

export default function Show() {
    const { shop, isFollowing, authUser, flash } = usePage<Props>().props;
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [sort, setSort] = useState<Sort>('newest');
    const [copied, setCopied] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const follow = useForm({});
    const chat = useForm({});
    const products = useMemo(() => [...shop.products].sort((a, b) => {
        if (sort === 'price_low') return Number(a.price) - Number(b.price);
        if (sort === 'price_high') return Number(b.price) - Number(a.price);
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    }), [shop.products, sort]);
    const shopUrl = typeof window === 'undefined' ? `/shops/${shop.id}` : `${window.location.origin}/shops/${shop.id}`;

    const copyShopLink = async () => {
        if (navigator.clipboard) { await navigator.clipboard.writeText(shopUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    };
    const shareShop = async () => {
        if (navigator.share) await navigator.share({ title: shop.name, text: `Visit ${shop.name} on Easy Zay Mm`, url: shopUrl });
        else await copyShopLink();
    };

    return <AppLayout>
        <section className="min-h-screen bg-gray-50 pb-28">
            <div className="relative h-40 bg-gradient-to-r from-primary-700 via-primary-600 to-primary-400 sm:h-56">
                {shop.cover_url && <img src={shop.cover_url} alt="" className="h-full w-full object-cover" />}
                <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                    <Link href="/shops" className="rounded-full bg-white/90 p-2 text-gray-700 shadow hover:bg-white" aria-label="Back to shops"><ArrowLeft size={20} /></Link>
                    <div className="flex gap-2"><button type="button" onClick={shareShop} className="rounded-full bg-white/90 p-2 text-gray-700 shadow hover:bg-white" aria-label="Share shop"><Share2 size={20} /></button><button type="button" onClick={() => setShowQr(true)} className="rounded-full bg-white/90 p-2 text-gray-700 shadow hover:bg-white" aria-label="Show shop QR code"><QrCode size={20} /></button></div>
                </div>
            </div>
            <div className="relative mx-auto -mt-12 max-w-5xl px-4 sm:px-6">
                <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100 sm:p-7">
                    <div className="flex flex-wrap items-start gap-4"><div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-primary-100 shadow-lg">{shop.logo_url ? <img src={shop.logo_url} alt={shop.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-2xl font-black text-primary-700">{shop.name.charAt(0)}</div>}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h1 className="truncate text-2xl font-black text-gray-900">{shop.name}</h1>{shop.verified && <ShieldCheck className="shrink-0 text-primary-600" size={21} />}</div><p className="mt-1 flex items-center gap-1 text-sm text-gray-500"><Star size={14} className="fill-yellow-400 text-yellow-400" /> Trusted local shop</p>{shop.address && <p className="mt-1 flex items-center gap-1 text-xs text-gray-500"><MapPin size={13} />{shop.address}</p>}</div></div>
                    <div className="mt-6 grid grid-cols-3 divide-x rounded-xl bg-gray-50 py-3 text-center"><div><p className="font-black text-gray-900">{shop.products_count}</p><p className="text-xs text-gray-500">Products</p></div><div><p className="font-black text-gray-900">{shop.followers_count}</p><p className="text-xs text-gray-500">Followers</p></div><div><p className="font-black text-gray-900">4.8</p><p className="text-xs text-gray-500">Rating</p></div></div>
                    {(flash?.success || copied) && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{copied ? 'Shop link copied.' : flash?.success}</p>}
                    {flash?.error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{flash.error}</p>}
                    <div className="mt-5 flex gap-3">{authUser ? <><button disabled={follow.processing} onClick={() => follow.post(`/shops/${shop.id}/follow`, { preserveScroll: true })} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${isFollowing ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-primary-600 text-white hover:bg-primary-700'} disabled:cursor-wait disabled:opacity-60`}><Heart size={18} fill={isFollowing ? 'currentColor' : 'none'} className={isFollowing ? 'text-rose-500' : ''} />{follow.processing ? 'Updating...' : isFollowing ? 'Following' : 'Follow'}</button><button disabled={chat.processing} onClick={() => chat.post(`/shops/${shop.id}/chat`)} className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-primary-600 px-4 py-3 text-sm font-bold text-primary-700 transition hover:bg-primary-50 disabled:cursor-wait disabled:opacity-60"><MessageCircle size={18} />{chat.processing ? 'Opening...' : 'Message'}</button></> : <Link href="/login" className="flex w-full items-center justify-center rounded-xl bg-primary-600 px-4 py-3 text-sm font-bold text-white hover:bg-primary-700">Sign in to Follow or Message</Link>}</div>
                    {shop.description && <div className="mt-6 border-t border-gray-100 pt-5"><h2 className="font-bold text-gray-900">About this shop</h2><p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">{shop.description}</p></div>}
                    {(shop.phone || shop.email || shop.address) && <div className="mt-5 border-t border-gray-100 pt-5"><h2 className="font-bold text-gray-900">Contact</h2><div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600">{shop.phone && <span className="flex items-center gap-1"><Phone size={14} />{shop.phone}</span>}{shop.email && <span>{shop.email}</span>}{shop.address && <span>{shop.address}</span>}</div></div>}
                    {(shop.facebook_url || shop.instagram_url || shop.tiktok_url || shop.website_url) && <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-primary-700">{shop.facebook_url && <a href={shop.facebook_url} target="_blank" rel="noreferrer">Facebook</a>}{shop.instagram_url && <a href={shop.instagram_url} target="_blank" rel="noreferrer">Instagram</a>}{shop.tiktok_url && <a href={shop.tiktok_url} target="_blank" rel="noreferrer">TikTok</a>}{shop.website_url && <a href={shop.website_url} target="_blank" rel="noreferrer">Website</a>}</div>}
                </div>
            </div>
            <div className="mx-auto mt-5 max-w-5xl px-4 sm:px-6">
                <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black text-gray-900">Shop products</h2><p className="text-sm text-gray-500">{products.length} active products</p></div><div className="flex items-center gap-2"><select value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="rounded-lg border-gray-300 bg-white px-2 py-2 text-xs text-gray-700"><option value="newest">Newest</option><option value="price_low">Price: Low</option><option value="price_high">Price: High</option></select><div className="flex rounded-lg bg-gray-100 p-1"><button type="button" onClick={() => setViewMode('grid')} className={`rounded p-1.5 ${viewMode === 'grid' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`} aria-label="Grid view"><Grid2X2 size={17} /></button><button type="button" onClick={() => setViewMode('list')} className={`rounded p-1.5 ${viewMode === 'list' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`} aria-label="List view"><List size={17} /></button></div></div></div>
                {products.length === 0 ? <div className="mt-4 rounded-2xl bg-white p-10 text-center text-gray-500"><Package className="mx-auto mb-3 text-gray-300" size={40} /><p>No products yet.</p></div> : <div className={`mt-4 grid gap-3 ${viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'}`}>{products.map((product) => <ProductCard key={product.id} product={product} list={viewMode === 'list'} />)}</div>}
            </div>
            {showQr && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Shop QR code"><div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-xl"><div className="flex items-center justify-between"><h2 className="font-bold text-gray-900">Share {shop.name}</h2><button type="button" onClick={() => setShowQr(false)} className="rounded-lg px-2 py-1 text-2xl leading-none text-gray-500 hover:bg-gray-100" aria-label="Close QR code">×</button></div><img className="mx-auto mt-4 h-56 w-56 rounded-lg border border-gray-100" src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shopUrl)}`} alt="Shop QR code" /><p className="mt-3 break-all text-xs text-gray-500">{shopUrl}</p><button type="button" onClick={copyShopLink} className="mt-4 w-full rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white">Copy shop link</button></div></div>}
        </section>
    </AppLayout>;
}

function ProductCard({ product, list }: { product: Product; list: boolean }) {
    return <Link href={`/products/${product.id}`} className={`group overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-md ${list ? 'flex' : ''}`}><div className={`${list ? 'h-28 w-28 shrink-0 sm:h-32 sm:w-32' : 'aspect-square w-full'} flex items-center justify-center overflow-hidden bg-gray-100 text-4xl text-primary-200`}>{product.images?.[0] ? <ProductImage src={product.images[0]} alt={product.title} className="transition group-hover:scale-105" /> : <span>✦</span>}</div><div className="min-w-0 p-3 sm:p-4"><p className="line-clamp-2 text-sm font-semibold text-gray-900">{product.title}</p><p className="mt-2 font-black text-primary-700">{money(product.price)}</p><p className="mt-1 text-xs capitalize text-gray-500">{product.condition || 'new'} · {product.stock} in stock</p></div></Link>;
}
