import { Link } from '@inertiajs/react';
import AppLayout from '../Layouts/AppLayout';

export default function Home() {
    return (
        <AppLayout>
            <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
                <div className="flex flex-col justify-center">
                    <p className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-teal-700">A better local marketplace</p>
                    <h1 className="max-w-xl text-5xl font-black tracking-tight text-slate-950 sm:text-6xl">Buy, sell, and grow with confidence.</h1>
                    <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">A secure marketplace for buyers and verified sellers, now powered by Laravel, MySQL, Inertia, React, and TypeScript.</p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link href="/products" className="rounded-full bg-teal-700 px-6 py-3 font-bold text-white shadow-lg shadow-teal-700/20 hover:bg-teal-800">Browse marketplace</Link>
                        <Link href="/register" className="rounded-full border border-slate-300 bg-white px-6 py-3 font-bold text-slate-700 hover:border-teal-600 hover:text-teal-700">Start selling</Link>
                    </div>
                </div>
                <div className="rounded-[2rem] bg-gradient-to-br from-teal-700 to-cyan-900 p-8 text-white shadow-2xl shadow-teal-900/20 sm:p-12">
                    <div className="mb-12 flex items-center justify-between"><span className="rounded-full bg-white/15 px-3 py-1 text-sm">Laravel migration</span><span className="text-3xl">✦</span></div>
                    <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-white/10 p-5"><p className="text-3xl font-black">100%</p><p className="mt-1 text-sm text-teal-100">server-authoritative checkout</p></div><div className="rounded-2xl bg-white/10 p-5"><p className="text-3xl font-black">3 roles</p><p className="mt-1 text-sm text-teal-100">user, seller, admin</p></div></div>
                </div>
            </section>
        </AppLayout>
    );
}
