import React from 'react';

interface BannerAdProps {
  className?: string;
}

const BannerAd: React.FC<BannerAdProps> = ({ className = '' }) => {
  return (
    <div className={`bg-gray-100 border border-gray-200 rounded-xl overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-3 py-1 bg-gray-200">
        <span className="text-xs font-medium text-gray-600">Advertisement</span>
        <span className="text-xs text-gray-500">320x50</span>
      </div>
      <div className="flex items-center justify-center h-[50px] bg-white">
        <span className="text-sm text-gray-400">Ad Banner Placeholder</span>
      </div>
    </div>
  );
};

export default BannerAd;
