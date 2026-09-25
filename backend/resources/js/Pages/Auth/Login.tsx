import { Link, useForm } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';

export default function Login() {
    const form = useForm({ email: '', password: '', remember: false });
    return <AppLayout><div className="mx-auto max-w-md px-4 py-16"><h1 className="text-3xl font-black">Welcome back</h1><p className="mt-2 text-slate-600">Sign in to your marketplace account.</p><form onSubmit={(e) => { e.preventDefault(); form.post('/login'); }} className="mt-8 space-y-5 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <label className="block text-sm font-bold">Email<input type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} className="mt-2 w-full rounded-xl border-slate-300" autoComplete="email" /></label>
        <label className="block text-sm font-bold">Password<input type="password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} className="mt-2 w-full rounded-xl border-slate-300" autoComplete="current-password" /></label>
        {form.errors.email && <p className="text-sm text-red-600">{form.errors.email}</p>}
        <button disabled={form.processing} className="w-full rounded-xl bg-teal-700 px-4 py-3 font-bold text-white disabled:opacity-60">{form.processing ? 'Signing in…' : 'Sign in'}</button>
        <p className="text-center text-sm text-slate-600">No account? <Link href="/register" className="font-bold text-teal-700">Create one</Link></p>
    </form></div></AppLayout>;
}
