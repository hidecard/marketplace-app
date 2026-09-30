import { Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';
import AppLayout from '../../Layouts/AppLayout';

type Category = { id: number; name: string; slug: string; icon_url?: string | null; sort_order: number; is_active: boolean };
type Props = { category: Category; kind: 'seller' | 'admin' };
type FormData = { name: string; slug: string; icon_url: string; sort_order: number; is_active: boolean };

function Body({ category, kind }: Props) {
    const form = useForm<FormData>({ name: category.name, slug: category.slug, icon_url: category.icon_url || '', sort_order: category.sort_order || 0, is_active: category.is_active });
    const submit = (event: FormEvent) => { event.preventDefault(); form.put(`/${kind}/categories/${category.id}`); };
    return <section className="mx-auto max-w-2xl px-4 py-7 sm:px-6 sm:py-10"><Link href={`/${kind}/categories`} className="text-sm font-bold text-primary-700">← Back to categories</Link><p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-primary-700">{kind === 'admin' ? 'Admin catalog' : 'Seller workspace'}</p><h1 className="mt-2 text-3xl font-black text-gray-950">Edit category</h1><form onSubmit={submit} className="mt-7 space-y-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 sm:p-7"><label className="block text-sm font-bold">Name<input required value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} className="mt-2 w-full rounded-xl border-gray-200" /></label><label className="block text-sm font-bold">Slug<input required value={form.data.slug} onChange={(e) => form.setData('slug', e.target.value)} className="mt-2 w-full rounded-xl border-gray-200" /></label><label className="block text-sm font-bold">Icon URL<input value={form.data.icon_url} onChange={(e) => form.setData('icon_url', e.target.value)} className="mt-2 w-full rounded-xl border-gray-200" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold">Sort order<input type="number" min="0" value={form.data.sort_order} onChange={(e) => form.setData('sort_order', Number(e.target.value))} className="mt-2 w-full rounded-xl border-gray-200" /></label><label className="flex items-center gap-3 pt-8 text-sm font-bold"><input type="checkbox" checked={form.data.is_active} onChange={(e) => form.setData('is_active', e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />Visible in marketplace</label></div>{Object.values(form.errors).map((error) => <p key={error} className="text-sm text-red-600">{error}</p>)}<button disabled={form.processing} className="w-full rounded-xl bg-primary-600 px-4 py-3 font-bold text-white hover:bg-primary-700 disabled:opacity-60">{form.processing ? 'Saving…' : 'Save category'}</button></form></section>;
}

export default function Form() { const props = usePage<Props>().props; return props.kind === 'admin' ? <AdminLayout title="Edit category"><Body {...props} /></AdminLayout> : <AppLayout><Body {...props} /></AppLayout>; }
