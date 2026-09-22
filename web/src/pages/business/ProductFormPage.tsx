import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, X, Camera, Menu } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../services/firebase';
import { FunctionsService } from '../../services/functions';
import { Category, Shop, Product } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import toast from 'react-hot-toast';

export const ProductFormPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { productId } = useParams<{ productId?: string }>();
  const { user } = useAuthStore();
  const [shop, setShop] = useState<Shop | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    brand: '',
    city: 'Yangon',
    description: '',
    price: '',
    comparePrice: '',
    costPrice: '',
    categoryId: '',
    condition: 'new' as 'new' | 'used' | 'refurbished',
    stock: '1',
    sku: '',
    weight: '',
  });
  const isBusinessListing = location.pathname.startsWith('/business/');

  useEffect(() => {
    fetchShop();
    fetchCategories();
    if (productId) {
      setIsEdit(true);
      fetchProduct();
    }
  }, [user, productId]);

  const fetchProduct = async () => {
    if (!productId) return;
    try {
      const productDoc = await getDoc(doc(db, 'products', productId));
      if (productDoc.exists()) {
        const product = productDoc.data() as Product;
        setFormData({
          title: product.title,
          brand: product.brand || '',
          city: product.sellerCity || 'Yangon',
          description: product.description,
          price: String(product.price),
          comparePrice: product.comparePrice ? String(product.comparePrice) : '',
          costPrice: product.costPrice ? String(product.costPrice) : '',
          categoryId: product.categoryId,
          condition: product.condition,
          stock: String(product.stock),
          sku: product.sku || '',
          weight: product.weight ? String(product.weight) : '',
        });
        setImages(product.images || []);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    }
  };

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

  const fetchCategories = async () => {
    try {
      const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      const allCategories = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Category));
      const topLevel = allCategories.filter((c) => !c.parentId);
      setCategories(topLevel.length > 0 ? topLevel : allCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    const selected = Array.from(files);
    if (selected.some((file) => !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024)) {
      toast.error('Each product image must be smaller than 5 MB');
      return;
    }
    if (images.length + selected.length > 8) {
      toast.error('You can upload up to 8 product images');
      return;
    }

    setUploadingImages(true);
    try {
      const uploadPromises = selected.map(async (file) => {
        const timestamp = Date.now();
        const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const storageRef = ref(storage, `product-images/${user.uid}/${fileName}`);
        const snapshot = await uploadBytes(storageRef, file);
        return getDownloadURL(snapshot.ref);
      });

      const urls = await Promise.all(uploadPromises);
      setImages((prev) => [...prev, ...urls]);
      toast.success('Images uploaded');
    } catch (error: any) {
      console.error('Error uploading product images:', error);
      toast.error(error?.code === 'storage/unauthorized'
        ? 'Image upload is not authorized. Please sign in again.'
        : error?.message || 'Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.price || !formData.categoryId) {
      toast.error('Please fill all required fields');
      return;
    }

    if (!isBusinessListing && !user?.phoneVerified) {
      toast.error('Phone verification is required to sell items on Marketplace');
      navigate('/verify-phone');
      return;
    }
    if (isBusinessListing && !shop) {
      toast.error('A verified shop is required for Business products');
      return;
    }

    const price = Number(formData.price);
    const stock = Number(formData.stock);
    const comparePrice = formData.comparePrice ? Number(formData.comparePrice) : null;
    const costPrice = formData.costPrice ? Number(formData.costPrice) : null;
    const weight = formData.weight ? Number(formData.weight) : null;
    if (!Number.isInteger(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
      toast.error('Price must be a positive whole number and stock cannot be negative');
      return;
    }

    setLoading(true);
    try {
      const isShopSeller = isBusinessListing && !!shop;
      const result = await FunctionsService.callOrThrow<{ id: string }>('saveProduct', {
        productId: productId || null,
        shopId: isShopSeller ? shop!.id : '',
        sellerCity: isShopSeller ? (shop!.city || 'Yangon') : (formData.city || 'Yangon'),
        brand: formData.brand || '',
        title: formData.title,
        description: formData.description,
        price,
        comparePrice,
        costPrice,
        categoryId: formData.categoryId,
        condition: formData.condition,
        stock,
        sku: formData.sku || null,
        weight,
        images,
        idempotencyKey: generateIdempotencyKey(),
      });

      if (isEdit && productId) {
        toast.success('Product updated successfully!');
        if (isShopSeller) {
          navigate('/business/products');
        } else {
          navigate(`/product/${productId}`);
        }
      } else {
        toast.success(isShopSeller ? 'Product added to your shop!' : 'Item listed successfully as Individual Seller!');
        if (isShopSeller) {
          navigate('/business/products');
        } else {
          navigate(`/product/${result.id}`);
        }
      }
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(error?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

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
              <h1 className="ml-2 text-lg font-semibold">{isEdit ? 'Edit Product' : 'Add Product'}</h1>
            </div>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Seller Info Banner */}
        {isBusinessListing && shop ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
            <p className="font-semibold">Listing under Shop: {shop.name}</p>
            <p className="text-xs text-emerald-600 mt-0.5">This product will be linked to your shop and synchronized with your POS/inventory.</p>
          </div>
        ) : (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
            <p className="font-semibold">Individual Seller Listing (Phone Verified)</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Selling as an individual seller. Buyers can browse, chat, and order with cash-on-delivery or direct pay.
            </p>
          </div>
        )}

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Product Images</label>
          <div className="flex flex-wrap gap-3">
            {images.map((img, index) => (
              <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary-500">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              <Camera className="text-gray-400" size={20} />
              <span className="text-xs text-gray-400 mt-1">{uploadingImages ? '...' : 'Add'}</span>
            </label>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Enter product title"
            required
          />
        </div>

        {/* Brand and City */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand (optional)</label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g. Apple, Samsung, or Unbranded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City / Location *</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g. Yangon, Mandalay"
              required
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            rows={4}
            placeholder="Describe your product..."
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
          <select
            value={formData.categoryId}
            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            required
          >
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Condition */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
          <div className="flex gap-3">
            {['new', 'used', 'refurbished'].map((cond) => (
              <button
                key={cond}
                type="button"
                onClick={() => setFormData({ ...formData, condition: cond as 'new' | 'used' | 'refurbished' })}
                className={`flex-1 py-2.5 rounded-xl font-medium capitalize ${
                  formData.condition === cond
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {cond}
              </button>
            ))}
          </div>
        </div>

        {/* Price */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (Ks) *</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="0"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Compare at Price (Ks)</label>
            <input
              type="number"
              value={formData.comparePrice}
              onChange={(e) => setFormData({ ...formData, comparePrice: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
        </div>

        {/* Cost Price & Stock */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (Ks)</label>
            <input
              type="number"
              value={formData.costPrice}
              onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
            <input
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
        </div>

        {/* SKU & Weight */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
            <input
              type="text"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="SKU-001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
            <input
              type="number"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="0.0"
              step="0.1"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Adding Product...' : 'Add Product'}
        </button>
      </form>
    </div>
  );
};

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `product-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
