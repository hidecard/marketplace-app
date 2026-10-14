const DEFAULT_LOCALE = 'en-US';

function getLocale(): string {
    if (typeof window === 'undefined') {
        return DEFAULT_LOCALE;
    }

    const preference = window.localStorage.getItem('marketplace-locale');
    if (preference === 'my' || preference === 'my-MM') {
        return 'my-MM';
    }

    return window.navigator.language.toLowerCase().startsWith('my') ? 'my-MM' : DEFAULT_LOCALE;
}

function numericValue(value: number | string | null | undefined): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
}

export function formatNumber(value: number | string | null | undefined): string {
    return new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 2 }).format(numericValue(value));
}

export function formatMMK(value: number | string | null | undefined): string {
    return `${formatNumber(value)} MMK`;
}

export function formatDate(value: string | number | Date | null | undefined): string {
    if (!value) {
        return '';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(getLocale(), {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(date);
}

export function formatDateTime(value: string | number | Date | null | undefined): string {
    if (!value) {
        return '';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(getLocale(), {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}
