import { Link, useForm } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';

export default function Register() {
    const form = useForm({ name: '', email: '', password: '', password_confirmation: '' });
    return <AppLayout><div className="mx-auto max-w-md px-4 py-16"><h1 className="text-3xl font-black">Create your account</h1><p className="mt-2 text-slate-600">Join the marketplace as a buyer. You can apply to sell after signing in.</p><form onSubmit={(e) => { e.preventDefault(); form.post('/register'); }} className="mt-8 space-y-5 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <label className="block text-sm font-bold">Name<input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} className="mt-2 w-full rounded-xl border-slate-300" autoComplete="name" /></label>
        <label className="block text-sm font-bold">Email<input type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} className="mt-2 w-full rounded-xl border-slate-300" autoComplete="email" /></label>
        <label className="block text-sm font-bold">Password<input type="password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} className="mt-2 w-full rounded-xl border-slate-300" autoComplete="new-password" /></label>
        <label className="block text-sm font-bold">Confirm password<input type="password" value={form.data.password_confirmation} onChange={(e) => form.setData('password_confirmation', e.target.value)} className="mt-2 w-full rounded-xl border-slate-300" autoComplete="new-password" /></label>
        {Object.values(form.errors).map((error) => <p key={error} className="text-sm text-red-600">{error}</p>)}
        <button disabled={form.processing} className="w-full rounded-xl bg-teal-700 px-4 py-3 font-bold text-white disabled:opacity-60">{form.processing ? 'Creating…' : 'Create account'}</button>
        <p className="text-center text-sm text-slate-600">Already registered? <Link href="/login" className="font-bold text-teal-700">Sign in</Link></p>
    </form></div></AppLayout>;
}
