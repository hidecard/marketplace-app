import { Link, usePage } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import { BarChart3, Bell, ChevronLeft, ChevronRight, FileCheck, Flag, FolderTree, Image, LayoutDashboard, LogOut, Package, Settings, ShoppingBag, Store, Users } from 'lucide-react';
import type { SharedProps } from '../types';

const items = [['/admin','Dashboard',LayoutDashboard], ['/admin/users','Users',Users], ['/admin/shops','Shops',Store], ['/admin/products','Products',Package], ['/admin/categories','Categories',FolderTree], ['/admin/orders','Orders',ShoppingBag], ['/admin/verifications','Verifications',FileCheck], ['/admin/reports','Reports',Flag], ['/admin/banners','Banners',Image], ['/admin/settings','Settings',Settings]] as const;

export default function AdminLayout({ children, title }: PropsWithChildren<{ title: string }>) {
    const { auth } = usePage<SharedProps>().props;
    const [collapsed, setCollapsed] = useState(false);
    const path = typeof window === 'undefined' ? '/admin' : window.location.pathname;
    return <div className="min-h-screen bg-gray-100"><aside className={`fixed inset-y-0 left-0 z-50 hidden bg-gray-900 text-white transition-all lg:block ${collapsed ? 'w-16' : 'w-64'}`}><div className="flex h-16 items-center justify-between border-b border-gray-800 px-4">{!collapsed && <span className="text-lg font-bold">Admin Panel</span>}<button onClick={() => setCollapsed(!collapsed)} className="rounded-lg p-2 hover:bg-gray-800" aria-label="Toggle sidebar">{collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}</button></div><nav className="space-y-1 p-2">{items.map(([href, label, Icon]) => <Link key={href} href={href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${path === href ? 'bg-teal-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}><Icon size={20} />{!collapsed && <span>{label}</span>}</Link>)}</nav></aside><div className={collapsed ? 'lg:ml-16' : 'lg:ml-64'}><header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6"><h1 className="text-xl font-semibold text-gray-900">{title}</h1><div className="flex items-center gap-4"><button className="relative rounded-lg p-2 hover:bg-gray-100"><Bell size={20} /><span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" /></button><div className="hidden text-right sm:block"><p className="text-sm font-medium text-gray-900">{auth.user?.name || 'Admin'}</p><p className="text-xs text-gray-500">{auth.user?.email}</p></div><Link href="/logout" method="post" as="button" className="rounded-lg p-2 hover:bg-gray-100"><LogOut size={20} /></Link></div></header><main className="p-4 sm:p-6">{children}</main></div></div>;
}
