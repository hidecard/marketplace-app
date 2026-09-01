import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface QRModalProps {
  url: string;
  title: string;
  onClose: () => void;
}

const QRModal: React.FC<QRModalProps> = ({ url, title, onClose }) => {
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    const encodedUrl = encodeURIComponent(url);
    setQrUrl(`https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodedUrl}`);
  }, [url]);

  const handleDownload = async () => {
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${title.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Error downloading QR:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Share {title}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>
        <div className="flex flex-col items-center">
          {qrUrl && (
            <img
              src={qrUrl}
              alt={`QR Code for ${title}`}
              className="w-64 h-64 border border-gray-200 rounded-xl"
            />
          )}
          <p className="text-sm text-gray-500 mt-4 text-center break-all">{url}</p>
          <button
            onClick={handleDownload}
            className="mt-4 w-full py-2.5 bg-primary-600 text-white rounded-xl font-semibold"
          >
            Download QR Code
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRModal;
