import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Globe, Facebook, Instagram } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../services/firebase';
import { useAuthStore } from '../../stores/authStore';
import { generateSlug } from '../../utils/helpers';
import { trackEvent } from '../../services/analytics';
import toast from 'react-hot-toast';

export const CreateShopPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    region: '',
    facebook: '',
    instagram: '',
    tiktok: '',
    website: '',
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);

    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const storageRef = ref(storage, `shops/temp/${fileName}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);

      if (type === 'logo') setLogo(url);
      else setCoverImage(url);
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name || !formData.phone || !formData.address) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const slug = generateSlug(formData.name);
      const shopData = {
        ownerId: user.uid,
        name: formData.name,
        slug,
        description: formData.description,
        logo,
        coverImage,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        region: formData.region,
        socialLinks: {
          facebook: formData.facebook || null,
          instagram: formData.instagram || null,
          tiktok: formData.tiktok || null,
          website: formData.website || null,
        },
        verified: false,
        verificationStatus: 'not_requested',
        rating: 0,
        totalReviews: 0,
        totalProducts: 0,
        totalSales: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'shops'), shopData);

      // Add owner as member
      await addDoc(collection(db, 'shops', docRef.id, 'members'), {
        userId: user.uid,
        role: 'owner',
        joinedAt: serverTimestamp(),
      });

      trackEvent('shop_created', { shop_id: docRef.id, shop_name: formData.name });
      toast.success('Shop created successfully!');
      navigate('/business');
    } catch (error) {
      console.error('Error creating shop:', error);
      toast.error('Failed to create shop');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={22} />
          </button>
          <h1 className="ml-2 text-lg font-semibold">Create Shop</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Cover Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image</label>
          <div className="relative h-32 bg-gray-100 rounded-xl overflow-hidden">
            {coverImage ? (
              <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Camera size={32} />
              </div>
            )}
            <label className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'cover')}
                className="hidden"
              />
              <span className="text-white font-medium">
                {uploadingCover ? 'Uploading...' : 'Upload Cover'}
              </span>
            </label>
          </div>
        </div>

        {/* Logo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Shop Logo</label>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 bg-gray-100 rounded-full overflow-hidden">
              {logo ? (
                <img src={logo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <Camera size={24} />
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer opacity-0 hover:opacity-100 transition-opacity rounded-full">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'logo')}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-sm text-gray-500">Upload your shop logo</p>
          </div>
        </div>

        {/* Shop Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Enter your shop name"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            rows={3}
            placeholder="Tell customers about your shop..."
          />
        </div>

        {/* Contact Info */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">Contact Information</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="shop@example.com"
            />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">Address</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
              <input
                type="text"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Region"
              />
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">Social Links (Optional)</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Facebook className="inline w-4 h-4 mr-1" />
              Facebook Page
            </label>
            <input
              type="url"
              value={formData.facebook}
              onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="https://facebook.com/yourpage"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Instagram className="inline w-4 h-4 mr-1" />
              Instagram
            </label>
            <input
              type="url"
              value={formData.instagram}
              onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="https://instagram.com/yourprofile"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">TikTok</label>
            <input
              type="url"
              value={formData.tiktok}
              onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="https://tiktok.com/@yourprofile"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Globe className="inline w-4 h-4 mr-1" />
              Website
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="https://yourwebsite.com"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Creating Shop...' : 'Create Shop'}
        </button>
      </form>
    </div>
  );
};
