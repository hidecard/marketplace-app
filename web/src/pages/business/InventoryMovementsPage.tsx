import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Package } from 'lucide-react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { InventoryMovement, Shop } from '../../types';
import { formatDate } from '../../utils/helpers';
import { useAuthStore } from '../../stores/authStore';

export const InventoryMovementsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [shop, setShop] = useState<Shop | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchShop();
  }, [user]);

  useEffect(() => {
    if (shop) fetchMovements();
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

  const fetchMovements = async () => {
    if (!shop) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'inventory_movements'),
        where('shopId', '==', shop.id),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as InventoryMovement));
      setMovements(data);
    } catch (error) {
      console.error('Error fetching movements:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center px-4 h-14">
          <Link to="/business" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={22} />
          </Link>
          <h1 className="ml-2 text-lg font-semibold">Inventory Movements</h1>
        </div>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-6 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : movements.length === 0 ? (
          <div className="text-center py-16">
            <Package className="mx-auto text-gray-300 mb-4" size={64} />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Movements</h2>
            <p className="text-gray-500">Inventory movements will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {movements.map((movement) => (
              <div key={movement.id} className="bg-white rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{movement.type}</p>
                    <p className="text-sm text-gray-500">
                      {movement.previousStock} → {movement.newStock}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(movement.createdAt)}</p>
                  </div>
                  <span className={`text-sm font-medium ${movement.type === 'increment' ? 'text-green-600' : 'text-red-600'}`}>
                    {movement.type === 'increment' ? '+' : '-'}{movement.quantity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
