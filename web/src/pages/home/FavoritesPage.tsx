import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Heart, ShoppingBag } from 'lucide-react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { useAuthStore } from '../../stores/authStore';

export const FavoritesPage: React.FC = () => {
  const { user } = useAuthStore();
  const [favorites, setFavorites] = useState<(Product & { favoriteId: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'favorites'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);

      const favoritesData = await Promise.all(
        snapshot.docs.map(async (favDoc) => {
          const favData = favDoc.data();
          const productDoc = await getDocs(query(collection(db, 'products'), where('__name__', '==', favData.productId)));
          if (!productDoc.empty) {
            const productData = productDoc.docs[0].data() as Product;
            return {
              ...productData,
              id: productDoc.docs[0].id,
              favoriteId: favDoc.id,
            };
          }
          return null;
        })
      );

      setFavorites(favoritesData.filter(Boolean) as (Product & { favoriteId: string })[]);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (favoriteId: string) => {
    try {
      await deleteDoc(doc(db, 'favorites', favoriteId));
      setFavorites(favorites.filter((f) => f.favoriteId !== favoriteId));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center px-4 h-14">
          <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={22} />
          </Link>
          <h1 className="ml-2 text-lg font-semibold">Favorites</h1>
        </div>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-3">
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-5 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="mx-auto text-gray-300 mb-4" size={64} />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Favorites Yet</h2>
            <p className="text-gray-500 mb-6">Save products you love to find them later</p>
            <Link to="/" className="bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {favorites.map((product) => (
              <div key={product.id} className="bg-white rounded-xl overflow-hidden shadow-sm relative">
                <Link to={`/product/${product.id}`}>
                  <div className="aspect-square bg-gray-100">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ShoppingBag size={32} />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">{product.title}</h3>
                    <span className="text-base font-bold text-primary-600">{formatCurrency(product.price)} Ks</span>
                  </div>
                </Link>
                <button
                  onClick={() => removeFavorite(product.favoriteId)}
                  className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center"
                >
                  <Heart size={16} className="text-red-500 fill-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
