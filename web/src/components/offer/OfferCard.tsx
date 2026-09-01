import React from 'react';
import { Link } from 'react-router-dom';
import { Offer } from '../../types';
import { formatCurrency, formatDate } from '../../utils/helpers';

interface OfferCardProps {
  offer: Offer;
  type: 'sent' | 'received';
  onAccept?: (offerId: string) => void;
  onReject?: (offerId: string) => void;
  onCounter?: (offerId: string) => void;
}

const OfferCard: React.FC<OfferCardProps> = ({ offer, type, onAccept, onReject, onCounter }) => {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    countered: 'bg-blue-100 text-blue-700',
    expired: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">
            {type === 'sent' ? 'Sent Offer' : 'Received Offer'}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[offer.status]}`}>
            {offer.status}
          </span>
        </div>
        <span className="text-xs text-gray-500">{formatDate(offer.createdAt)}</span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <p className="text-sm text-gray-600">Offer Price</p>
          <p className="text-xl font-bold text-primary-600">{formatCurrency(offer.price)} Ks</p>
        </div>
      </div>

      {(type === 'received' && offer.status === 'pending') && (
        <div className="flex gap-2">
          {onAccept && (
            <button
              onClick={() => onAccept(offer.id)}
              className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium"
            >
              Accept
            </button>
          )}
          {onReject && (
            <button
              onClick={() => onReject(offer.id)}
              className="flex-1 py-2 border border-red-500 text-red-500 rounded-lg text-sm font-medium"
            >
              Reject
            </button>
          )}
          {onCounter && (
            <button
              onClick={() => onCounter(offer.id)}
              className="flex-1 py-2 border border-primary-600 text-primary-600 rounded-lg text-sm font-medium"
            >
              Counter
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default OfferCard;
