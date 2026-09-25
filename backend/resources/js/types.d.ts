import { PageProps as InertiaPageProps } from '@inertiajs/core';

export type Role = 'user' | 'seller' | 'admin';
export type AccountStatus = 'active' | 'suspended' | 'banned';

export interface AuthUser {
    id: number;
    name: string;
    email: string;
    role: Role;
    status: AccountStatus;
    phone_number?: string | null;
    phone_verified?: boolean;
}

export interface SharedProps extends InertiaPageProps {
    auth: { user: AuthUser | null };
    flash?: { success?: string; error?: string };
    errors: Record<string, string>;
}

declare module '@inertiajs/core' {
    interface PageProps extends SharedProps {}
}
