import { Head } from '@inertiajs/react';

type SeoHeadProps = {
    title: string;
    description: string;
    canonical?: string;
    image?: string | null;
    type?: 'website' | 'product';
    jsonLd?: Record<string, unknown> | null;
};

const siteName = 'Easy Zay Mm';
const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://easyzaymm.com';

export default function SeoHead({ title, description, canonical, image, type = 'website', jsonLd }: SeoHeadProps) {
    const canonicalUrl = canonical || (typeof window !== 'undefined' ? window.location.href : siteUrl);
    const imageUrl = image || `${siteUrl}/images/og-default.svg`;
    return <Head title={title}>
        <meta name="description" content={description} />
        <meta name="robots" content="index,follow,max-image-preview:large" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:site_name" content={siteName} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content={type === 'product' ? 'product' : 'website'} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={imageUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={imageUrl} />
        {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />}
    </Head>;
}
