import React from 'react';
import { Star, Shield, MapPin } from 'lucide-react';
import { Shop } from '../../types';

interface ShopCardProps {
  shop: Shop;
  onClick?: () => void;
}

export const ShopCard: React.FC<ShopCardProps> = ({ shop, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
          {shop.logo ? (
            <img src={shop.logo} alt={shop.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
              No Logo
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{shop.name}</h3>
            {shop.verified && (
              <Shield className="w-4 h-4 text-primary-600 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm text-gray-600">
              {shop.rating.toFixed(1)} ({shop.totalReviews})
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1 text-gray-500">
            <MapPin className="w-3 h-3" />
            <span className="text-xs truncate">{shop.city}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
