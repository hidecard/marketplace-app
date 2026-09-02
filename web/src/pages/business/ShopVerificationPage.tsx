import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Camera, CheckCircle, Clock, XCircle, Menu } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../services/firebase';
import { Shop, VerificationRequest } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { trackEvent } from '../../services/analytics';
import toast from 'react-hot-toast';

export const ShopVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [shop, setShop] = useState<Shop | null>(null);
  const [verification, setVerification] = useState<VerificationRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    ownerName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    region: '',
    description: '',
    facebookPage: '',
  });

  useEffect(() => {
    if (user) {
      fetchShop();
    }
  }, [user]);

  useEffect(() => {
    if (shop) {
      fetchVerification();
    }
  }, [shop]);

  const fetchShop = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'shops'), where('ownerId', '==', user.uid));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setShop({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Shop);
      }
    } catch (error) {
      console.error('Error fetching shop:', error);
    }
  };

  const fetchVerification = async () => {
    if (!shop) return;
    try {
      const q = query(
        collection(db, 'verification_requests'),
        where('shopId', '==', shop.id)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setVerification({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as VerificationRequest);
      }
    } catch (error) {
      console.error('Error fetching verification:', error);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !shop) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const timestamp = Date.now();
        const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const storageRef = ref(storage, `verifications/${shop.id}/${fileName}`);
        const snapshot = await uploadBytes(storageRef, file);
        return getDownloadURL(snapshot.ref);
      });

      const urls = await Promise.all(uploadPromises);
      setPhotos([...photos, ...urls]);
    } catch (error) {
      toast.error('Failed to upload photos');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop || !formData.ownerName || !formData.phone || !formData.address) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const verificationData = {
        userId: user!.uid,
        shopId: shop.id,
        shopName: shop.name,
        ownerName: formData.ownerName,
        phone: formData.phone,
        email: formData.email || shop.email,
        address: formData.address,
        city: formData.city,
        region: formData.region,
        description: formData.description,
        facebookPage: formData.facebookPage,
        shopPhotos: photos,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'verification_requests'), verificationData);

      // Update shop verification status
      await updateDoc(doc(db, 'shops', shop.id), {
        verificationStatus: 'pending',
        updatedAt: serverTimestamp(),
      });

      trackEvent('verification_requested', { shop_id: shop.id, shop_name: shop.name });
      toast.success('Verification request submitted!');
      navigate('/business');
    } catch (error) {
      console.error('Error submitting verification:', error);
      toast.error('Failed to submit verification');
    } finally {
      setLoading(false);
    }
  };

  if (!shop) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Please create a shop first</p>
      </div>
    );
  }

  // Show verification status if already submitted
  if (verification) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-3">
              <button
                onClick={() => useUIStore.getState().toggleSidebar()}
                className="p-2 -ml-2 rounded-lg hover:bg-gray-100 lg:hidden"
              >
                <Menu size={22} />
              </button>
              <div className="flex items-center">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                  <ArrowLeft size={22} />
                </button>
                <h1 className="ml-2 text-lg font-semibold">Shop Verification</h1>
              </div>
            </div>
          </div>
        </header>

        <div className="p-4">
          <div className="bg-white rounded-xl p-8 text-center">
            {verification.status === 'pending' && (
              <>
                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="text-yellow-600" size={40} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Pending</h2>
                <p className="text-gray-500 mb-6">
                  Your verification request is being reviewed. We will notify you once it's approved.
                </p>
              </>
            )}
            {verification.status === 'approved' && (
              <>
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="text-green-600" size={40} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Verified!</h2>
                <p className="text-gray-500 mb-6">
                  Congratulations! Your shop is now verified and trusted by customers.
                </p>
              </>
            )}
            {verification.status === 'rejected' && (
              <>
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="text-red-600" size={40} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Rejected</h2>
                <p className="text-gray-500 mb-6">
                  Your verification request was rejected. Please check the requirements and try again.
                </p>
                {verification.adminNote && (
                  <div className="bg-red-50 rounded-lg p-4 mb-6">
                    <p className="text-sm text-red-700">{verification.adminNote}</p>
                  </div>
                )}
                <button
                  onClick={() => setVerification(null)}
                  className="bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold"
                >
                  Submit Again
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => useUIStore.getState().toggleSidebar()}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 lg:hidden"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center">
              <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                <ArrowLeft size={22} />
              </button>
              <h1 className="ml-2 text-lg font-semibold">Shop Verification</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4">
        {/* Info Banner */}
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Shield className="text-primary-600 flex-shrink-0" size={24} />
            <div>
              <h3 className="font-semibold text-primary-900">Get Verified</h3>
              <p className="text-sm text-primary-700 mt-1">
                Verified shops get a trust badge and are more likely to attract customers.
                Please provide accurate information for verification.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Owner Information */}
          <div className="bg-white rounded-xl p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">Owner Information</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                placeholder="Enter your full name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                placeholder="09xxxxxxxxx"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                placeholder="your@email.com"
              />
            </div>
          </div>

          {/* Business Address */}
          <div className="bg-white rounded-xl p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">Business Address</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                placeholder="Street address"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                <input
                  type="text"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                  placeholder="Region"
                />
              </div>
            </div>
          </div>

          {/* Business Description */}
          <div className="bg-white rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Business Description</h3>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
              rows={3}
              placeholder="Describe your business..."
            />
          </div>

          {/* Social Links */}
          <div className="bg-white rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Social Links</h3>
            <input
              type="url"
              value={formData.facebookPage}
              onChange={(e) => setFormData({ ...formData, facebookPage: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
              placeholder="Facebook page URL"
            />
          </div>

          {/* Shop Photos */}
          <div className="bg-white rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Shop Photos</h3>
            <p className="text-sm text-gray-500 mb-4">Upload photos of your shop or products</p>
            <div className="flex flex-wrap gap-3">
              {photos.map((photo, index) => (
                <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary-500">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <Camera className="text-gray-400" size={20} />
                <span className="text-xs text-gray-400 mt-1">{uploading ? '...' : 'Add'}</span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit for Verification'}
          </button>
        </form>
      </div>
    </div>
  );
};
