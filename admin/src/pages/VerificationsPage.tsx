import React, { useState } from 'react';
import { Search, CheckCircle, XCircle, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { AdminLayout } from '../components/layout/AdminLayout';
import { useCollection } from '../hooks/useCollection';
import { VerificationRequest } from '../types';
import { formatDate } from '../utils/helpers';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';
import toast from 'react-hot-toast';

export const VerificationsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedVerification, setSelectedVerification] = useState<VerificationRequest | null>(null);
  const [rejectionTarget, setRejectionTarget] = useState<VerificationRequest | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(0);
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

  const handleApprove = async (item: VerificationRequest) => {
    try {
      const reviewVerification = httpsCallable(functions, 'reviewVerification');
      await reviewVerification({ requestId: item.id, decision: 'approved', note: '' });
      toast.success('Verification approved and shop verified');
      refetch();
    } catch (error) {
      toast.error('Failed to approve verification');
    }
  };

  const handleReject = async (item: VerificationRequest) => {
    setRejectionTarget(item);
    setRejectionNote(item.adminNote || '');
  };

  const submitRejection = async () => {
    if (!rejectionTarget || !rejectionNote.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      const reviewVerification = httpsCallable(functions, 'reviewVerification');
      await reviewVerification({ requestId: rejectionTarget.id, decision: 'rejected', note: rejectionNote.trim() });
      toast.success('Verification rejected');
      setRejectionTarget(null);
      setRejectionNote('');
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
                            onClick={() => {
                              setSelectedVerification(verification);
                              setSelectedPhoto(0);
                            }}
                            className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                            title="View details"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleApprove(verification)}
                            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                            title="Approve"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => handleReject(verification)}
                            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                            title="Reject"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      )}
                      {verification.status !== 'pending' && (
                        <button
                          onClick={() => {
                            setSelectedVerification(verification);
                            setSelectedPhoto(0);
                          }}
                          className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                          title="View details"
                        >
                          <Eye size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedVerification && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{selectedVerification.shopName}</h2>
                <p className="text-sm text-gray-500">Verification details and submitted evidence</p>
              </div>
              <button onClick={() => setSelectedVerification(null)} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Close details">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <div className="aspect-video rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                  {selectedVerification.shopPhotos?.length ? (
                    <img src={selectedVerification.shopPhotos[selectedPhoto]} alt={`${selectedVerification.shopName} evidence ${selectedPhoto + 1}`} className="w-full h-full object-contain" />
                  ) : (
                    <p className="text-sm text-gray-500">No evidence photos submitted</p>
                  )}
                </div>
                {selectedVerification.shopPhotos?.length > 1 && (
                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={() => setSelectedPhoto((photo) => (photo - 1 + selectedVerification.shopPhotos.length) % selectedVerification.shopPhotos.length)} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50" aria-label="Previous photo"><ChevronLeft size={18} /></button>
                    <div className="flex gap-2 overflow-x-auto">
                      {selectedVerification.shopPhotos.map((photo, index) => (
                        <button key={photo} onClick={() => setSelectedPhoto(index)} className={`w-16 h-12 rounded-lg overflow-hidden border-2 ${index === selectedPhoto ? 'border-primary-600' : 'border-transparent'}`}>
                          <img src={photo} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setSelectedPhoto((photo) => (photo + 1) % selectedVerification.shopPhotos.length)} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50" aria-label="Next photo"><ChevronRight size={18} /></button>
                  </div>
                )}
              </div>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-gray-500">Owner</p><p className="font-medium text-gray-900">{selectedVerification.ownerName}</p></div>
                  <div><p className="text-gray-500">Phone</p><p className="font-medium text-gray-900">{selectedVerification.phone}</p></div>
                  <div><p className="text-gray-500">Email</p><p className="font-medium text-gray-900 break-all">{selectedVerification.email}</p></div>
                  <div><p className="text-gray-500">Location</p><p className="font-medium text-gray-900">{selectedVerification.city}, {selectedVerification.region}</p></div>
                </div>
                <div><p className="text-gray-500 mb-1">Address</p><p className="text-gray-900">{selectedVerification.address}</p></div>
                <div><p className="text-gray-500 mb-1">Description</p><p className="text-gray-900 whitespace-pre-wrap">{selectedVerification.description || 'No description provided.'}</p></div>
                {selectedVerification.adminNote && <div className="rounded-lg bg-red-50 p-3 text-red-800"><p className="font-medium">Admin note</p><p>{selectedVerification.adminNote}</p></div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {rejectionTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div><h2 className="text-lg font-semibold text-gray-900">Reject verification</h2><p className="text-sm text-gray-500 mt-1">The shop owner will see this reason.</p></div>
              <button onClick={() => setRejectionTarget(null)} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Close rejection dialog"><X size={18} /></button>
            </div>
            <textarea value={rejectionNote} onChange={(event) => setRejectionNote(event.target.value)} rows={5} maxLength={500} autoFocus placeholder="Explain what needs to be corrected..." className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-primary-500 focus:ring-primary-500" />
            <div className="mt-4 flex justify-end gap-3"><button onClick={() => setRejectionTarget(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button><button onClick={submitRejection} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">Reject verification</button></div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
