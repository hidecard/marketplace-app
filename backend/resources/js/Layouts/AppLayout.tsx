import { Link, usePage } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import { Bell, Boxes, FileText, FolderTree, Heart, HelpCircle, Home, MessageCircle, Package, Receipt, Search, Settings, ShoppingBag, ShoppingCart, Store, Tag, User, Users, BarChart3, ShieldCheck, DollarSign, ArrowRightLeft } from 'lucide-react';
import type { SharedProps } from '../types';

const marketplaceItems = [
    ['/','Home',Home], ['/products','Search',Search], ['/categories','Categories',FolderTree], ['/shops','Explore Shops',Store], ['/cart','Cart',ShoppingCart], ['/orders','My Orders',ShoppingBag], ['/favorites','Favorites',Heart], ['/chats','Messages',MessageCircle], ['/help','Help & Support',HelpCircle], ['/profile','Profile',User],
] as const;
const businessItems = [
    ['/seller','Dashboard',Store], ['/seller/pos','POS Register',DollarSign], ['/seller/products','Products',Package], ['/seller/inventory','Inventory',Boxes], ['/seller/orders','Customer Orders',ShoppingBag], ['/seller/expenses','Expenses',Receipt], ['/seller/customers','Customers',Users], ['/seller/analytics','Analytics',BarChart3], ['/seller/reports','Reports & P&L',FileText], ['/seller/verification','Verification',ShieldCheck], ['/seller/settings','Settings',Settings],
] as const;

export default function AppLayout({ children }: PropsWithChildren) {
    const { auth } = usePage<SharedProps>().props;
    const user = auth.user;
    const path = typeof window === 'undefined' ? '/' : window.location.pathname;
    const isBusiness = path.startsWith('/seller');
    const items = isBusiness ? businessItems : marketplaceItems;
    const businessHref = user?.role === 'seller' ? '/seller' : '/seller/shop/create';
    const active = (href: string) => href === '/' ? path === '/' : path.startsWith(href);

    return <div className="min-h-screen bg-gray-50 text-gray-900">
        <div className="flex">
            <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-gray-200 bg-white lg:flex lg:flex-col">
                <div className="border-b border-gray-200 p-4">
                    <Link href="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600 text-white"><Store size={23} /></span><span><strong className="block text-lg leading-tight">{isBusiness ? 'Shop Hub' : 'Marketplace'}</strong><small className="text-xs text-gray-500">{isBusiness ? 'Business Mode' : 'Shopping Mode'}</small></span></Link>
                    {user && <Link href={isBusiness ? '/' : businessHref} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700"><ArrowRightLeft size={15} />{isBusiness ? 'Switch to Marketplace' : 'Open Shop / Seller Mode'}</Link>}
                </div>
                <nav className="flex-1 space-y-1 overflow-y-auto p-4"><p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{isBusiness ? 'Seller Tools & Management' : 'Marketplace'}</p>{items.map(([href, label, Icon]) => <Link key={href} href={href} className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${active(href) ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-100'}`}><Icon size={20} /><span className="font-medium">{label}</span></Link>)}</nav>
            </aside>
            <div className="min-h-screen w-full lg:ml-72">
                <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur"><div className="flex h-14 items-center justify-between px-4 sm:px-6"><div className="flex items-center gap-3"><Link href={isBusiness ? '/seller' : '/'} className="text-lg font-semibold lg:hidden">{isBusiness ? 'Shop Hub' : 'Marketplace'}</Link><h1 className="hidden text-lg font-semibold lg:block">{isBusiness ? 'Business Mode' : 'Marketplace'}</h1></div><div className="flex items-center gap-2"><Link href="/products" className="rounded-lg p-2 hover:bg-gray-100" aria-label="Search"><Search size={21} /></Link><Link href="/notifications" className="relative rounded-lg p-2 hover:bg-gray-100" aria-label="Notifications"><Bell size={21} /><span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" /></Link><Link href="/cart" className="relative rounded-lg p-2 hover:bg-gray-100" aria-label="Cart"><ShoppingCart size={21} /></Link>{user ? <Link href="/dashboard" className="hidden rounded-full bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white sm:block">{user.name}</Link> : <Link href="/login" className="rounded-full bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white">Sign in</Link>}</div></div></header>
                <main className="pb-20 lg:pb-8">{children}</main>
            </div>
        </div>
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white lg:hidden"><div className="mx-auto flex h-16 max-w-lg items-center justify-around">{[['/', 'Home', Home], ['/products', 'Search', Search], ['/cart', 'Cart', ShoppingBag], ['/orders', 'Orders', ShoppingBag], ['/dashboard', 'Profile', User]].map(([href, label, Icon]) => <Link key={href as string} href={href as string} className={`flex h-full w-full flex-col items-center justify-center ${active(href as string) ? 'text-teal-600' : 'text-gray-400'}`}><Icon size={21} /><span className="mt-1 text-[11px]">{label as string}</span></Link>)}</div></nav>
    </div>;
}
