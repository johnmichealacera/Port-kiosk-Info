'use client';

import { useState, useEffect } from 'react';
import { Advertiser, CreateAdvertiserInput, UpdateAdvertiserInput } from '@/types';

export default function AdvertiserManagement() {
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateAdvertiserInput>({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    status: 'active',
  });

  useEffect(() => {
    fetchAdvertisers();
  }, []);

  const fetchAdvertisers = async () => {
    try {
      const response = await fetch('/api/advertisers');
      const data = await response.json();
      setAdvertisers(data.advertisers || []);
    } catch (error) {
      console.error('Error fetching advertisers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        const updateData: UpdateAdvertiserInput = { ...formData, id: editingId };
        const response = await fetch(`/api/advertisers/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });
        if (!response.ok) throw new Error('Failed to update advertiser');
      } else {
        const response = await fetch('/api/advertisers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!response.ok) throw new Error('Failed to create advertiser');
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        address: '',
        status: 'active',
      });
      fetchAdvertisers();
    } catch (error) {
      console.error('Error saving advertiser:', error);
      alert('Failed to save advertiser');
    }
  };

  const handleEdit = (advertiser: Advertiser) => {
    setEditingId(advertiser.id);
    setFormData({
      companyName: advertiser.companyName,
      contactName: advertiser.contactName || '',
      email: advertiser.email,
      phone: advertiser.phone || '',
      address: advertiser.address || '',
      status: advertiser.status,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this advertiser?')) return;
    try {
      const response = await fetch(`/api/advertisers/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete advertiser');
      fetchAdvertisers();
    } catch (error) {
      console.error('Error deleting advertiser:', error);
      alert('Failed to delete advertiser');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading advertisers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Advertisers</h2>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({
              companyName: '',
              contactName: '',
              email: '',
              phone: '',
              address: '',
              status: 'active',
            });
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        >
          <i className="fas fa-plus mr-2" />
          Add Advertiser
        </button>
      </div>

      {showForm && (
        <div className="glass-container p-6 rounded-lg">
          <h3 className="text-xl font-semibold text-white mb-4">
            {editingId ? 'Edit Advertiser' : 'New Advertiser'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Contact Name
              </label>
              <input
                type="text"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-container rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Company</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Contact</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Email</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Phone</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {advertisers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No advertisers found
                </td>
              </tr>
            ) : (
              advertisers.map((advertiser) => (
                <tr key={advertiser.id} className="hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-white">{advertiser.companyName}</td>
                  <td className="px-4 py-3 text-gray-300">{advertiser.contactName || '-'}</td>
                  <td className="px-4 py-3 text-gray-300">{advertiser.email}</td>
                  <td className="px-4 py-3 text-gray-300">{advertiser.phone || '-'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        advertiser.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : advertiser.status === 'suspended'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {advertiser.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(advertiser)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <i className="fas fa-edit" />
                      </button>
                      <button
                        onClick={() => handleDelete(advertiser.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
