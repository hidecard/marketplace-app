import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, MapPin, Edit, Trash2, Check } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Address } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import toast from 'react-hot-toast';

export const AddressesPage: React.FC = () => {
  const { user } = useAuthStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState<Partial<Address>>({
    label: 'Home',
    name: '',
    phone: '',
    address: '',
    city: '',
    region: '',
  });

  useEffect(() => {
    fetchAddresses();
  }, [user]);

  const fetchAddresses = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'addresses'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Address));
      setAddresses(data);
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name || !formData.phone || !formData.address) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      if (editingAddress) {
        await updateDoc(doc(db, 'addresses', editingAddress.id!), {
          ...formData,
          updatedAt: serverTimestamp(),
        });
        toast.success('Address updated');
      } else {
        await addDoc(collection(db, 'addresses'), {
          ...formData,
          userId: user.uid,
          isDefault: addresses.length === 0,
          createdAt: serverTimestamp(),
        });
        toast.success('Address added');
      }
      setShowForm(false);
      setEditingAddress(null);
      setFormData({ label: 'Home', name: '', phone: '', address: '', city: '', region: '' });
      fetchAddresses();
    } catch (error) {
      toast.error('Failed to save address');
    }
  };

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setFormData(address);
    setShowForm(true);
  };

  const handleDelete = async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    try {
      await deleteDoc(doc(db, 'addresses', addressId));
      toast.success('Address deleted');
      fetchAddresses();
    } catch (error) {
      toast.error('Failed to delete address');
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      // Remove default from all addresses
      await Promise.all(
        addresses.map((addr) =>
          updateDoc(doc(db, 'addresses', addr.id!), { isDefault: false })
        )
      );
      // Set new default
      await updateDoc(doc(db, 'addresses', addressId), { isDefault: true });
      toast.success('Default address updated');
      fetchAddresses();
    } catch (error) {
      toast.error('Failed to update default address');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center">
            <Link to="/profile" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
              <ArrowLeft size={22} />
            </Link>
            <h1 className="ml-2 text-lg font-semibold">My Addresses</h1>
          </div>
          <button
            onClick={() => {
              setEditingAddress(null);
              setFormData({ label: 'Home', name: '', phone: '', address: '', city: '', region: '' });
              setShowForm(true);
            }}
            className="text-primary-600 font-medium flex items-center gap-1"
          >
            <Plus size={18} />
            Add
          </button>
        </div>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : addresses.length === 0 ? (
          <div className="text-center py-16">
            <MapPin className="mx-auto text-gray-300 mb-4" size={64} />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Addresses</h2>
            <p className="text-gray-500 mb-6">Add a delivery address to place orders</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold"
            >
              Add Address
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((address) => (
              <div key={address.id} className="bg-white rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">{address.label}</span>
                      {address.isDefault && (
                        <span className="text-xs bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-gray-900">{address.name}</p>
                    <p className="text-sm text-gray-600">{address.phone}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {address.address}, {address.city} {address.region}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(address)}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(address.id!)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {!address.isDefault && (
                  <button
                    onClick={() => handleSetDefault(address.id!)}
                    className="mt-3 text-sm text-primary-600 font-medium flex items-center gap-1"
                  >
                    <Check size={14} />
                    Set as default
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Address Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingAddress ? 'Edit Address' : 'Add New Address'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Label</label>
                <select
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="Home">Home</option>
                  <option value="Office">Office</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Enter your name"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="09xxxxxxxxx"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                  placeholder="Street address, building, floor..."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Region</label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Region"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingAddress(null);
                  }}
                  className="flex-1 py-2.5 border border-gray-300 rounded-xl font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl font-semibold"
                >
                  {editingAddress ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
