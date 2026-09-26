import { FormEvent } from 'react';
import { Link, useForm, usePage } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import type { SharedProps } from '../../types';

type Message = { id: number; body: string; sender_id: number; sender_name: string; created_at?: string | null; mine: boolean };
type Props = SharedProps & { conversation: { id: number; title: string; product?: string | null; messages: Message[] } };

export default function Show() {
    const { conversation } = usePage<Props>().props;
    const form = useForm({ body: '' });
    const submit = (event: FormEvent) => { event.preventDefault(); form.post(`/chats/${conversation.id}/messages`, { preserveScroll: true, onSuccess: () => form.reset() }); };

    return <AppLayout><section className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-4xl flex-col px-4 py-6 sm:px-6">
        <div className="mb-5 flex items-center gap-3"><Link href="/chats" className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-600">Back</Link><div><h1 className="text-2xl font-black text-gray-900">{conversation.title}</h1><p className="text-sm text-gray-500">{conversation.product ? `About ${conversation.product}` : 'Marketplace conversation'}</p></div></div>
        <div className="flex-1 space-y-3 overflow-y-auto rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-6">{conversation.messages.length === 0 ? <p className="py-16 text-center text-gray-500">No messages yet. Start the conversation.</p> : conversation.messages.map((message) => <div key={message.id} className={`flex ${message.mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.mine ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-900'}`}><p className="mb-1 text-xs font-bold opacity-70">{message.mine ? 'You' : message.sender_name}</p><p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>{message.created_at && <time className="mt-1 block text-[10px] opacity-60">{new Date(message.created_at).toLocaleString()}</time>}</div></div>)}</div>
        <form onSubmit={submit} className="mt-4 flex gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gray-100"><textarea value={form.data.body} onChange={(event) => form.setData('body', event.target.value)} rows={2} maxLength={4000} placeholder="Write a message..." className="min-w-0 flex-1 resize-none rounded-xl border-gray-200" /><button disabled={form.processing || !form.data.body.trim()} className="self-end rounded-xl bg-primary-600 px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Send</button></form>{form.errors.body && <p className="mt-2 text-sm text-red-600">{form.errors.body}</p>}
    </section></AppLayout>;
}
