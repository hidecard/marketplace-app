import React from 'react';
import { formatCurrency } from '../../utils/helpers';
import { Product } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const { language, t } = useLanguage();

  const getConditionLabel = () => {
    if (product.condition === 'used') return t('conditionUsed');
    if (product.condition === 'refurbished') return t('conditionRefurbished');
    return t('conditionNew');
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="aspect-square bg-gray-100 relative">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            {language === 'my' ? 'ပုံမရှိပါ' : 'No Image'}
          </div>
        )}
        {product.condition === 'used' && (
          <span className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded font-medium">
            {getConditionLabel()}
          </span>
        )}
        {product.comparePrice && product.comparePrice > product.price && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded font-semibold">
            -{Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)}%
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
          {product.title}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-primary-600">
            {formatCurrency(product.price)} {t('currency')}
          </span>
          {product.comparePrice && product.comparePrice > product.price && (
            <span className="text-sm text-gray-400 line-through">
              {formatCurrency(product.comparePrice)} {t('currency')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

