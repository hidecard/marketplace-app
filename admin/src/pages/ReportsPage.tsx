import React, { useState } from 'react';
import { Search, CheckCircle, XCircle, AlertTriangle, User, Store, Package } from 'lucide-react';
import { AdminLayout } from '../components/layout/AdminLayout';
import { useCollection } from '../hooks/useCollection';
import { Report } from '../types';
import { formatDate } from '../utils/helpers';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import toast from 'react-hot-toast';

export const ReportsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const { data: reports, loading, refetch } = useCollection<Report>('reports', {
    orderByField: 'createdAt',
    orderDirection: 'desc',
  });

  const filteredReports = reports.filter((r) => {
    const matchesSearch = r.reason?.toLowerCase().includes(searchQuery.toLowerCase()) || r.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleResolve = async (id: string) => {
    try {
      await updateDoc(doc(db, 'reports', id), {
        status: 'resolved',
        updatedAt: serverTimestamp(),
      });
      toast.success('Report resolved');
      refetch();
    } catch (error) {
      toast.error('Failed to resolve report');
    }
  };

  const handleDismiss = async (id: string) => {
    if (!confirm('Are you sure you want to dismiss this report?')) return;
    try {
      await updateDoc(doc(db, 'reports', id), {
        status: 'dismissed',
        updatedAt: serverTimestamp(),
      });
      toast.success('Report dismissed');
      refetch();
    } catch (error) {
      toast.error('Failed to dismiss report');
    }
  };

  const getTargetIcon = (type: string) => {
    switch (type) {
      case 'user': return <User size={16} />;
      case 'shop': return <Store size={16} />;
      case 'product': return <Package size={16} />;
      default: return <AlertTriangle size={16} />;
    }
  };

  return (
    <AdminLayout title="Reports">
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
              ) : filteredReports.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No reports found</td></tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getTargetIcon(report.targetType)}
                        <span className="capitalize font-medium text-gray-900">{report.targetType}</span>
                      </div>
                      <p className="text-sm text-gray-500">{report.targetId.slice(0, 8)}...</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        {report.reason}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{report.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                        report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(report.createdAt)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {report.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleResolve(report.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            title="Resolve"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => handleDismiss(report.id)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="Dismiss"
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
