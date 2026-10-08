import { Link, usePage } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import { BarChart3, Bell, ChevronLeft, ChevronRight, FileCheck, Flag, FolderTree, Image, LayoutDashboard, LogOut, Menu, Package, Settings, ShoppingBag, Store, Users, X } from 'lucide-react';
import type { SharedProps } from '../types';

const items = [['/admin','Dashboard',LayoutDashboard], ['/admin/users','Users',Users], ['/admin/shops','Shops',Store], ['/admin/products','Products',Package], ['/admin/categories','Categories',FolderTree], ['/admin/orders','Orders',ShoppingBag], ['/admin/verifications','Verifications',FileCheck], ['/admin/reports','Reports',Flag], ['/admin/banners','Banners',Image], ['/admin/settings','Settings',Settings]] as const;

export default function AdminLayout({ children, title }: PropsWithChildren<{ title: string }>) {
    const { auth } = usePage<SharedProps>().props;
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const path = typeof window === 'undefined' ? '/admin' : window.location.pathname;
    const active = (href: string) => href === '/admin' ? path === href : path === href || path.startsWith(`${href}/`);
    return <div className="min-h-screen bg-gray-100 text-gray-900">
        {mobileOpen && <button aria-label="Close admin navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden" />}
        <aside className={`fixed inset-y-0 left-0 z-50 bg-gray-900 text-white transition-all duration-200 ${collapsed ? 'w-16' : 'w-64'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
            <div className="flex h-16 items-center justify-between border-b border-gray-800 px-3 sm:px-4">{!collapsed && <span className="truncate text-lg font-bold">Admin Panel</span>}<button onClick={() => setCollapsed(!collapsed)} className="hidden rounded-lg p-2 text-gray-300 hover:bg-gray-800 lg:block" aria-label="Toggle sidebar">{collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}</button><button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-gray-300 hover:bg-gray-800 lg:hidden" aria-label="Close sidebar"><X size={20} /></button></div>
            <nav className="max-h-[calc(100vh-4rem)] space-y-1 overflow-y-auto p-2">{items.map(([href, label, Icon]) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} title={collapsed ? label : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${active(href) ? 'bg-primary-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}><Icon size={20} />{!collapsed && <span className="truncate">{label}</span>}</Link>)}</nav>
        </aside>
        <div className={`min-h-screen transition-all duration-200 ${collapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-gray-200 bg-white px-3 sm:px-6"><div className="flex min-w-0 items-center gap-2 sm:gap-3"><button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 hover:bg-gray-100 lg:hidden" aria-label="Open admin navigation"><Menu size={22} /></button><h1 className="truncate text-lg font-semibold text-gray-900 sm:text-xl">{title}</h1></div><div className="flex shrink-0 items-center gap-1 sm:gap-3"><button aria-label="Notifications" className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100"><Bell size={20} /><span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" /></button><div className="hidden max-w-52 text-right sm:block"><p className="truncate text-sm font-medium text-gray-900">{auth.user?.name || 'Admin'}</p><p className="truncate text-xs text-gray-500">{auth.user?.email}</p></div><Link href="/logout" method="post" as="button" className="rounded-lg p-2 text-gray-600 hover:bg-gray-100" aria-label="Log out"><LogOut size={20} /></Link></div></header><main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
    </div>;
}
