export const generateQRDataUrl = (text: string, size = 300): string => {
  const encoded = encodeURIComponent(text);
  return `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${encoded}`;
};

export const getShopShareUrl = (shopId: string): string => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/shop/${shopId}`;
  }
  return `/shop/${shopId}`;
};

export const getProductShareUrl = (productId: string): string => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/product/${productId}`;
  }
  return `/product/${productId}`;
};
