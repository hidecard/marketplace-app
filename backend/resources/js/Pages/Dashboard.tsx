import { Link, router, usePage } from '@inertiajs/react';
import AppLayout from '../Layouts/AppLayout';
import type { SharedProps } from '../types';

type Props = SharedProps & { user: { id: number; name: string; email: string; role: string; status: string; phone_verified: boolean }; shop: { name: string; verified: boolean; verification_status: string } | null };

export default function Dashboard() {
    const { user, shop } = usePage<Props>().props;
    const logout = () => router.post('/logout');
    return <AppLayout><section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-bold uppercase tracking-widest text-teal-700">Account dashboard</p><h1 className="mt-2 text-4xl font-black">Hello, {user.name}</h1><p className="mt-2 text-slate-600">{user.email} · <span className="capitalize">{user.role}</span></p></div><button onClick={logout} className="w-fit rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-700 hover:border-red-300 hover:text-red-600">Sign out</button></div>
        <div className="mt-8 grid gap-5 md:grid-cols-3"><div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200"><p className="text-sm text-slate-500">Account status</p><p className="mt-2 text-2xl font-black capitalize text-emerald-700">{user.status}</p><p className="mt-2 text-sm text-slate-500">Phone verification: {user.phone_verified ? 'complete' : 'not completed'}</p></div><div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200"><p className="text-sm text-slate-500">Seller onboarding</p>{shop ? <><p className="mt-2 text-2xl font-black">{shop.name}</p><p className="mt-2 text-sm capitalize text-slate-500">Verification: {shop.verification_status}</p></> : <><p className="mt-2 font-bold">No shop yet</p><Link href="/seller/shop/create" className="mt-4 inline-block font-bold text-teal-700">Create a shop →</Link></>}</div><div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200"><p className="text-sm text-slate-500">Quick links</p><div className="mt-3 grid gap-2 text-sm font-bold"><Link href="/products" className="text-teal-700">Browse products →</Link>{user.role === 'admin' && <Link href="/admin" className="text-teal-700">Open admin panel →</Link>}{user.role === 'seller' && shop?.verified && <Link href="/seller" className="text-teal-700">Seller tools →</Link>}</div></div></div>
    </section></AppLayout>;
}
