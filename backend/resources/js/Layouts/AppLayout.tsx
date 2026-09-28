import { Link, usePage } from '@inertiajs/react';
import type { ComponentType, PropsWithChildren } from 'react';
import { useMemo, useState } from 'react';
import {
    ArrowRightLeft, BarChart3, Bell, Boxes, FileText, FolderTree, Globe, HelpCircle, Home, Heart,
    Menu, MessageCircle, Package, Receipt, Search, Settings, ShieldCheck, ShoppingBag, ShoppingCart,
    Store, User, Users, X, DollarSign,
} from 'lucide-react';
import type { SharedProps } from '../types';

type NavItem = readonly [string, string, ComponentType<{ size?: number }>];

const marketplaceItems: readonly NavItem[] = [
    ['/', 'Home', Home], ['/categories', 'Categories', FolderTree], ['/shops', 'Explore Shops', Store],
    ['/products', 'Search', Search], ['/seller/shop/create', 'Sell Item', Store], ['/offers', 'Special Offers', FileText],
    ['/favorites', 'Favorites', Heart], ['/orders', 'My Orders', ShoppingBag], ['/chats', 'Messages', MessageCircle],
    ['/help', 'Help & Support', HelpCircle], ['/profile', 'Profile', User],
];

const businessItems: readonly NavItem[] = [
    ['/seller', 'Dashboard', Store], ['/seller/pos', 'POS Register', DollarSign], ['/seller/products', 'Products', Package],
    ['/seller/inventory', 'Inventory', Boxes], ['/seller/orders', 'Customer Orders', ShoppingBag], ['/seller/expenses', 'Expenses', Receipt],
    ['/seller/customers', 'Customers', Users], ['/seller/analytics', 'Analytics', BarChart3], ['/seller/reports', 'Reports & P&L', FileText],
    ['/seller/verification', 'Verification', ShieldCheck], ['/seller/settings', 'Settings', Settings],
];

export default function AppLayout({ children }: PropsWithChildren) {
    const { auth } = usePage<SharedProps>().props;
    const user = auth.user;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [language, setLanguage] = useState<'en' | 'my'>('en');
    const path = typeof window === 'undefined' ? '/' : window.location.pathname;
    const isBusiness = path.startsWith('/seller');
    const items = isBusiness ? businessItems : marketplaceItems;
    const businessHref = user?.role === 'seller' ? '/seller' : '/seller/shop/create';
    const active = (href: string) => href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`);
    const title = useMemo(() => isBusiness ? (language === 'my' ? 'စီးပွားရေးဆိုင်ရာ' : 'Shop Hub') : (language === 'my' ? 'ပဒေသာပင်' : 'Marketplace'), [isBusiness, language]);
    const closeSidebar = () => setSidebarOpen(false);

    return <div className="min-h-screen bg-gray-50 text-gray-900">
        {sidebarOpen && <button aria-label="Close navigation" onClick={closeSidebar} className="fixed inset-0 z-40 bg-black/50 lg:hidden" />}
        <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-gray-200 bg-white transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
            <div className="border-b border-gray-200 p-4">
                <div className="flex items-center justify-between gap-3">
                    <Link href={isBusiness ? '/seller' : '/'} onClick={closeSidebar} className="flex items-center gap-2">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 text-white"><Store size={24} /></span>
                        <span><strong className="block text-lg leading-tight text-gray-900">{title}</strong><small className="font-medium text-gray-500">{isBusiness ? (language === 'my' ? 'အရောင်းမုဒ်' : 'Business Mode') : (language === 'my' ? 'ဈေးဝယ်မုဒ်' : 'Shopping Mode')}</small></span>
                    </Link>
                    <button onClick={() => setLanguage(language === 'my' ? 'en' : 'my')} className="flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-700" title="Switch language"><Globe size={13} className="text-primary-600" />{language === 'my' ? 'မြန်မာ' : 'EN'}</button>
                </div>
                {user && <Link href={isBusiness ? '/' : businessHref} onClick={closeSidebar} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700 hover:bg-primary-100"><ArrowRightLeft size={15} />{isBusiness ? (language === 'my' ? 'ဈေးဝယ်မုဒ်သို့ ကူးမည်' : 'Switch to Marketplace') : (language === 'my' ? 'ဆိုင်ဖွင့်မည် / ရောင်းချမည်' : 'Open Shop / Seller Mode')}</Link>}
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-4">
                <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{isBusiness ? (language === 'my' ? 'အရောင်းနှင့် ဆိုင်စီမံခန့်ခွဲမှု' : 'Seller Tools & Management') : (language === 'my' ? 'ဈေးကွက်လမ်းညွှန်' : 'Marketplace')}</p>
                {items.map(([href, label, Icon]) => <Link key={href} href={href} onClick={closeSidebar} className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${active(href) ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-100'}`}><Icon size={20} /><span className="font-medium">{label}</span></Link>)}
            </nav>
        </aside>
        <div className="flex min-h-screen flex-col lg:ml-72">
            <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
                <div className="flex h-14 items-center justify-between px-4 sm:px-6">
                    <div className="flex items-center gap-3"><button onClick={() => setSidebarOpen(true)} className="-ml-2 rounded-lg p-2 hover:bg-gray-100 lg:hidden" aria-label="Open navigation"><Menu size={22} /></button><h1 className="text-lg font-semibold text-gray-900">{isBusiness ? (language === 'my' ? 'စီးပွားရေးမုဒ်' : 'Business Mode') : (path === '/' ? title : 'Marketplace')}</h1></div>
                    <div className="flex items-center gap-1 sm:gap-2"><Link href="/products" className="rounded-full p-2 hover:bg-gray-100" aria-label="Search"><Search size={20} /></Link><Link href="/notifications" className="relative rounded-full p-2 hover:bg-gray-100" aria-label="Notifications"><Bell size={20} /><span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" /></Link><Link href="/cart" className="relative rounded-full p-2 hover:bg-gray-100" aria-label="Cart"><ShoppingCart size={20} /><span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary-500" /></Link>{user ? <Link href="/profile" className="hidden rounded-full bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700 sm:block">{user.name}</Link> : <Link href="/login" className="rounded-full bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700">Sign in</Link>}</div>
                </div>
            </header>
            <main className="flex-1 pb-20 lg:pb-6">{children}</main>
        </div>
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white lg:hidden safe-area-bottom"><div className="mx-auto flex h-16 max-w-lg items-center justify-around"><Link href="/" className={`flex h-full w-full flex-col items-center justify-center ${active('/') ? 'text-primary-600' : 'text-gray-400'}`}><Home size={21} /><span className="mt-1 text-[11px]">Home</span></Link><Link href="/products" className={`flex h-full w-full flex-col items-center justify-center ${active('/products') ? 'text-primary-600' : 'text-gray-400'}`}><Search size={21} /><span className="mt-1 text-[11px]">Search</span></Link><Link href="/cart" className={`flex h-full w-full flex-col items-center justify-center ${active('/cart') ? 'text-primary-600' : 'text-gray-400'}`}><ShoppingBag size={21} /><span className="mt-1 text-[11px]">Cart</span></Link><Link href="/chats" className={`flex h-full w-full flex-col items-center justify-center ${active('/chats') ? 'text-primary-600' : 'text-gray-400'}`}><MessageCircle size={21} /><span className="mt-1 text-[11px]">Messages</span></Link><Link href="/profile" className={`flex h-full w-full flex-col items-center justify-center ${active('/profile') ? 'text-primary-600' : 'text-gray-400'}`}><User size={21} /><span className="mt-1 text-[11px]">Profile</span></Link></div></nav>
    </div>;
}
