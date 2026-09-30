import { ImageOff } from 'lucide-react';
import type { ImgHTMLAttributes, SyntheticEvent } from 'react';

type Props = ImgHTMLAttributes<HTMLImageElement>;
export default function ProductImage({ alt = '', className = '', onError, ...props }: Props) {
    const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
        event.currentTarget.style.display = 'none';
        event.currentTarget.parentElement?.querySelector('[data-image-fallback]')?.removeAttribute('hidden');
        onError?.(event);
    };
    return <span className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gray-100 text-gray-400"><span data-image-fallback hidden><ImageOff size={28} /></span><img {...props} alt={alt} className={`h-full w-full object-cover ${className}`} onError={handleError} /></span>;
}
