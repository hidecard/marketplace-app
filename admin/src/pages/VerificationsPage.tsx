import React, { useState } from 'react';
import { Search, CheckCircle, XCircle } from 'lucide-react';
import { AdminLayout } from '../components/layout/AdminLayout';
import { useCollection } from '../hooks/useCollection';
import { VerificationRequest } from '../types';
import { formatDate } from '../utils/helpers';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import toast from 'react-hot-toast';

export const VerificationsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const { data: verifications, loading, refetch } = useCollection<VerificationRequest>(
    'verification_requests',
    {
      orderByField: 'createdAt',
      orderDirection: 'desc',
      whereField: filter === 'all' ? undefined : 'status',
      whereOperator: filter === 'all' ? undefined : '==',
      whereValue: filter === 'all' ? undefined : filter,
    }
  );

  const filteredVerifications = verifications.filter(
    (v) =>
      v.shopName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.ownerName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApprove = async (id: string) => {
    try {
      await updateDoc(doc(db, 'verification_requests', id), {
        status: 'approved',
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'shops', id), {
        verified: true,
        verificationStatus: 'approved',
        updatedAt: serverTimestamp(),
      });
      toast.success('Verification approved');
      refetch();
    } catch (error) {
      toast.error('Failed to approve verification');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateDoc(doc(db, 'verification_requests', id), {
        status: 'rejected',
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'shops', id), {
        verificationStatus: 'rejected',
        updatedAt: serverTimestamp(),
      });
      toast.success('Verification rejected');
      refetch();
    } catch (error) {
      toast.error('Failed to reject verification');
    }
  };

  return (
    <AdminLayout title="Verifications">
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-200 space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search verifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shop
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredVerifications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No verifications found
                  </td>
                </tr>
              ) : (
                filteredVerifications.map((verification) => (
                  <tr key={verification.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-medium text-gray-900">{verification.shopName}</p>
                      {verification.facebookPage && (
                        <a
                          href={verification.facebookPage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary-600 hover:underline"
                        >
                          Facebook Page
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-gray-900">{verification.ownerName}</p>
                      <p className="text-sm text-gray-500">{verification.phone}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {verification.city}, {verification.region}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          verification.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : verification.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {verification.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(verification.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {verification.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleApprove(verification.id)}
                            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                            title="Approve"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => handleReject(verification.id)}
                            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                            title="Reject"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};
