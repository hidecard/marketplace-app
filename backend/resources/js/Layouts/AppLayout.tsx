import { Link, usePage } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import type { SharedProps } from '../types';

export default function AppLayout({ children }: PropsWithChildren) {
    const { auth } = usePage<SharedProps>().props;
    const user = auth.user;

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <Link href="/" className="text-xl font-black tracking-tight text-teal-700">PaDeTha</Link>
                    <nav className="flex items-center gap-4 text-sm font-semibold text-slate-600">
                        <Link href="/products" className="hover:text-teal-700">Marketplace</Link>
                        <Link href="/cart" className="hover:text-teal-700">Cart</Link>
                        {user && <Link href="/orders" className="hover:text-teal-700">Orders</Link>}
                        {user ? <Link href="/dashboard" className="hover:text-teal-700">Dashboard</Link> : <Link href="/login" className="rounded-full bg-teal-700 px-4 py-2 text-white">Sign in</Link>}
                    </nav>
                </div>
            </header>
            <main>{children}</main>
            <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500">© {new Date().getFullYear()} PaDeTha Marketplace</footer>
        </div>
    );
}
