import { Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, MessageSquare, Star } from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';

type Review = {
    id: number;
    rating: number;
    body?: string | null;
    product_id: number;
    product_title: string;
    user_name: string;
    created_at?: string;
};
type Product = { id: number; title?: string; name?: string };
type Props = {
    reviews: Review[];
    eligibleProducts: Product[];
    flash?: { success?: string; error?: string };
};

function Stars({ rating, large = false }: { rating: number; large?: boolean }) {
    return <span className={`inline-flex items-center gap-0.5 text-amber-500 ${large ? 'text-xl' : 'text-sm'}`} aria-label={`${rating} out of 5 stars`}>
        {Array.from({ length: 5 }, (_, index) => <Star key={index} size={large ? 20 : 15} fill={index < rating ? 'currentColor' : 'none'} />)}
    </span>;
}

function ReviewForm({ product }: { product: Product }) {
    const form = useForm({ rating: 5, body: '' });
    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        form.post(`/products/${product.id}/reviews`, { preserveScroll: true });
    };
    return <form onSubmit={submit} className="rounded-2xl border border-primary-100 bg-primary-50 p-5 shadow-sm">
        <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white"><Star size={18} fill="currentColor" /></span>
            <div><p className="text-xs font-bold uppercase tracking-wider text-primary-700">Your purchase</p><h2 className="mt-1 font-bold text-primary-950">Review {product.title || product.name || 'this product'}</h2></div>
        </div>
        <label className="mt-5 block text-sm font-semibold text-gray-700">Your rating</label>
        <div className="mt-2 flex items-center gap-3">
            <select value={form.data.rating} onChange={(event) => form.setData('rating', Number(event.target.value))} className="rounded-lg border-gray-200 bg-white text-sm focus:border-primary-500 focus:ring-primary-500">
                <option value="5">5 · Excellent</option><option value="4">4 · Good</option><option value="3">3 · Okay</option><option value="2">2 · Poor</option><option value="1">1 · Bad</option>
            </select>
            <Stars rating={form.data.rating} />
        </div>
        <textarea value={form.data.body} onChange={(event) => form.setData('body', event.target.value)} placeholder="Share your experience (optional)" className="mt-3 min-h-24 w-full rounded-xl border-gray-200 bg-white text-sm focus:border-primary-500 focus:ring-primary-500" maxLength={2000} />
        {form.errors.rating && <p className="mt-2 text-sm text-red-600">{form.errors.rating}</p>}
        {form.errors.body && <p className="mt-2 text-sm text-red-600">{form.errors.body}</p>}
        <button type="submit" disabled={form.processing} className="mt-3 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">{form.processing ? 'Submitting...' : 'Submit review'}</button>
    </form>;
}

export default function Index() {
    const { reviews, eligibleProducts, flash } = usePage<Props>().props;
    return <AppLayout><section className="mx-auto max-w-5xl px-4 py-6 pb-28 sm:px-6 sm:py-8">
        <Link href="/profile" className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-primary-700"><ArrowLeft size={16} /> Back to profile</Link>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-primary-700">Community trust</p><h1 className="mt-2 text-3xl font-black text-gray-950">Reviews</h1><p className="mt-2 text-gray-500">Read customer feedback and review products you received.</p></div><div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm ring-1 ring-gray-100"><p className="text-2xl font-black text-primary-700">{reviews.length}</p><p className="text-xs font-semibold text-gray-500">Recent reviews</p></div></div>
        {flash?.success && <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">{flash.success}</p>}
        {flash?.error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{flash.error}</p>}
        {eligibleProducts.length > 0 && <section className="mt-8"><div className="mb-3 flex items-center gap-2"><MessageSquare size={19} className="text-primary-600" /><h2 className="text-xl font-bold text-gray-900">Products waiting for your review</h2></div><div className="grid gap-4 md:grid-cols-2">{eligibleProducts.map((product) => <ReviewForm key={product.id} product={product} />)}</div></section>}
        <section className="mt-8"><h2 className="text-xl font-bold text-gray-900">Customer reviews</h2><div className="mt-4 space-y-4">{reviews.map((review) => <article key={review.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-gray-900">{review.product_title}</h3><p className="mt-1 text-sm text-gray-500">{review.user_name} · {review.created_at || 'Recently'}</p></div><Stars rating={review.rating} /></div>{review.body && <p className="mt-4 whitespace-pre-line leading-6 text-gray-700">{review.body}</p>}</article>)}{reviews.length === 0 && <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center"><MessageSquare className="mx-auto text-gray-300" size={46} /><h3 className="mt-4 font-bold text-gray-900">No reviews yet</h3><p className="mt-1 text-sm text-gray-500">Completed purchases will appear here when customers share feedback.</p><Link href="/products" className="mt-5 inline-flex rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white">Browse products</Link></div>}</div></section>
    </section></AppLayout>;
}
