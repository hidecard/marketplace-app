import { useForm, usePage } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import type { SharedProps } from '../../types';

type Props = SharedProps & { user: { name: string; phone_number?: string | null; phone_verified?: boolean } };

export default function ProfileComplete() {
    const { user, flash } = usePage<Props>().props;
    const profile = useForm({ name: user.name ?? '', region: '' });
    const otpRequest = useForm({ phone_number: user.phone_number ?? '' });
    const otpVerify = useForm({ challenge_id: '', code: '' });

    return <AppLayout><main className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <p className="text-sm font-bold uppercase tracking-widest text-primary-700">Finish onboarding</p>
        <h1 className="mt-2 text-4xl font-black">Complete your profile</h1>
        <p className="mt-3 text-slate-600">Verify your phone number before ordering, chatting, reviewing, or listing products.</p>
        {flash?.success && <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{flash.success}</p>}
        <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-black">1. Phone verification</h2>
            {!user.phone_verified && <>
                <form onSubmit={(e) => { e.preventDefault(); otpRequest.post('/profile/phone/request'); }} className="mt-4 flex gap-2">
                    <input value={otpRequest.data.phone_number} onChange={(e) => otpRequest.setData('phone_number', e.target.value)} placeholder="09xxxxxxxxx" className="min-w-0 flex-1 rounded-xl border-slate-300" />
                    <button disabled={otpRequest.processing} className="rounded-xl bg-primary-700 px-4 py-2 font-bold text-white">Send code</button>
                </form>
                <form onSubmit={(e) => { e.preventDefault(); otpVerify.post('/profile/phone/verify'); }} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <input value={otpVerify.data.challenge_id} onChange={(e) => otpVerify.setData('challenge_id', e.target.value)} placeholder="Challenge ID" className="rounded-xl border-slate-300" />
                    <input value={otpVerify.data.code} onChange={(e) => otpVerify.setData('code', e.target.value)} placeholder="6-digit code" className="rounded-xl border-slate-300" />
                    <button disabled={otpVerify.processing} className="rounded-xl border border-primary-700 px-4 py-2 font-bold text-primary-700">Verify</button>
                </form>
            </>}
            {user.phone_verified && <p className="mt-4 font-bold text-emerald-700">Phone verified</p>}
        </section>
        <section className="mt-5 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-black">2. Profile details</h2>
            <form onSubmit={(e) => { e.preventDefault(); profile.post('/profile/complete'); }} className="mt-4 space-y-4">
                <label className="block text-sm font-bold">Name<input value={profile.data.name} onChange={(e) => profile.setData('name', e.target.value)} className="mt-2 w-full rounded-xl border-slate-300" /></label>
                <label className="block text-sm font-bold">Region / City<input value={profile.data.region} onChange={(e) => profile.setData('region', e.target.value)} placeholder="Yangon" className="mt-2 w-full rounded-xl border-slate-300" /></label>
                {Object.values({ ...profile.errors, ...otpRequest.errors, ...otpVerify.errors }).map((error) => <p key={error} className="text-sm text-red-600">{error}</p>)}
                <button disabled={profile.processing || !user.phone_verified} className="w-full rounded-xl bg-slate-900 px-4 py-3 font-bold text-white disabled:opacity-40">Save and continue</button>
            </form>
        </section>
    </main></AppLayout>;
}
