'use client';

import { useState, useEffect } from 'react';
import { AdCampaign, Advertiser, CreateAdCampaignInput, AdMedia, AdSchedule } from '@/types';

export default function CampaignManagement() {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<AdCampaign | null>(null);
  const [formData, setFormData] = useState<CreateAdCampaignInput>({
    advertiserId: 0,
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    dailyRate: 500,
    billingPeriod: 'daily',
    priority: 5,
    frequencyType: 'interval',
    frequencyValue: 3,
    displayType: 'mixed',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [campaignsRes, advertisersRes] = await Promise.all([
        fetch('/api/campaigns'),
        fetch('/api/advertisers?status=active'),
      ]);
      const campaignsData = await campaignsRes.json();
      const advertisersData = await advertisersRes.json();
      setCampaigns(campaignsData.campaigns || []);
      setAdvertisers(advertisersData.advertisers || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed to create campaign');
      setShowForm(false);
      setFormData({
        advertiserId: 0,
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        dailyRate: 500,
        billingPeriod: 'daily',
        priority: 5,
        frequencyType: 'interval',
        frequencyValue: 3,
        displayType: 'mixed',
      });
      fetchData();
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign');
    }
  };

  const handleApprove = async (id: number) => {
    try {
      const response = await fetch(`/api/campaigns/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: 1 }), // TODO: Get actual user ID
      });
      if (!response.ok) throw new Error('Failed to approve campaign');
      fetchData();
    } catch (error) {
      console.error('Error approving campaign:', error);
      alert('Failed to approve campaign');
    }
  };

  const handlePause = async (id: number) => {
    try {
      const response = await fetch(`/api/campaigns/${id}/pause`, { method: 'PUT' });
      if (!response.ok) throw new Error('Failed to pause campaign');
      fetchData();
    } catch (error) {
      console.error('Error pausing campaign:', error);
      alert('Failed to pause campaign');
    }
  };

  const handleResume = async (id: number) => {
    try {
      const response = await fetch(`/api/campaigns/${id}/resume`, { method: 'PUT' });
      if (!response.ok) throw new Error('Failed to resume campaign');
      fetchData();
    } catch (error) {
      console.error('Error resuming campaign:', error);
      alert('Failed to resume campaign');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      const response = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete campaign');
      fetchData();
      if (selectedCampaign?.id === id) setSelectedCampaign(null);
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert('Failed to delete campaign');
    }
  };

  const viewCampaign = async (id: number) => {
    try {
      const response = await fetch(`/api/campaigns/${id}`);
      const data = await response.json();
      setSelectedCampaign(data.campaign);
    } catch (error) {
      console.error('Error fetching campaign:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading campaigns...</div>;
  }

  if (selectedCampaign) {
    return (
      <CampaignDetail
        campaign={selectedCampaign}
        onBack={() => setSelectedCampaign(null)}
        onRefresh={fetchData}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Ad Campaigns</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        >
          <i className="fas fa-plus mr-2" />
          New Campaign
        </button>
      </div>

      {showForm && (
        <div className="glass-container p-6 rounded-lg">
          <h3 className="text-xl font-semibold text-white mb-4">New Campaign</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Advertiser *
              </label>
              <select
                required
                value={formData.advertiserId}
                onChange={(e) => setFormData({ ...formData, advertiserId: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
              >
                <option value={0}>Select advertiser</option>
                {advertisers.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.companyName}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Daily Rate (₱) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.dailyRate}
                  onChange={(e) => setFormData({ ...formData, dailyRate: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Frequency Type
                </label>
                <select
                  value={formData.frequencyType}
                  onChange={(e) => setFormData({ ...formData, frequencyType: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
                >
                  <option value="interval">Interval</option>
                  <option value="per_hour">Per Hour</option>
                  <option value="per_day">Per Day</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Frequency Value *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.frequencyValue}
                  onChange={(e) => setFormData({ ...formData, frequencyValue: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
                  placeholder={formData.frequencyType === 'interval' ? 'Every Nth video' : 'Count'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Priority (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Display Type
              </label>
              <select
                value={formData.displayType}
                onChange={(e) => setFormData({ ...formData, displayType: e.target.value as any })}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
              >
                <option value="mixed">Mixed</option>
                <option value="interstitial">Interstitial</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                Create Campaign
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
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
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Advertiser</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Period</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Rate</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No campaigns found
                </td>
              </tr>
            ) : (
              campaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-white">{campaign.name}</td>
                  <td className="px-4 py-3 text-gray-300">
                    {campaign.advertiser?.companyName || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {new Date(campaign.startDate).toLocaleDateString()} -{' '}
                    {new Date(campaign.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    ₱{campaign.dailyRate.toFixed(2)}/day
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        campaign.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : campaign.status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : campaign.status === 'paused'
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => viewCampaign(campaign.id)}
                        className="text-blue-400 hover:text-blue-300"
                        title="View Details"
                      >
                        <i className="fas fa-eye" />
                      </button>
                      {campaign.status === 'pending' && (
                        <button
                          onClick={() => handleApprove(campaign.id)}
                          className="text-green-400 hover:text-green-300"
                          title="Approve"
                        >
                          <i className="fas fa-check" />
                        </button>
                      )}
                      {campaign.status === 'active' && (
                        <button
                          onClick={() => handlePause(campaign.id)}
                          className="text-orange-400 hover:text-orange-300"
                          title="Pause"
                        >
                          <i className="fas fa-pause" />
                        </button>
                      )}
                      {campaign.status === 'paused' && (
                        <button
                          onClick={() => handleResume(campaign.id)}
                          className="text-green-400 hover:text-green-300"
                          title="Resume"
                        >
                          <i className="fas fa-play" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(campaign.id)}
                        className="text-red-400 hover:text-red-300"
                        title="Delete"
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

function CampaignDetail({
  campaign,
  onBack,
  onRefresh,
}: {
  campaign: AdCampaign;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const [media, setMedia] = useState<AdMedia[]>(campaign.media || []);
  const [schedules, setSchedules] = useState<AdSchedule[]>(campaign.schedules || []);
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newMediaTitle, setNewMediaTitle] = useState('');

  const addMedia = async () => {
    if (!newMediaUrl.trim()) {
      alert('Please enter a media URL');
      return;
    }
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newMediaTitle || newMediaUrl.split('/').pop() || 'Media',
          source: newMediaUrl,
          type: 'url',
        }),
      });
      if (!response.ok) throw new Error('Failed to add media');
      const data = await response.json();
      setMedia([...media, data.media]);
      setNewMediaUrl('');
      setNewMediaTitle('');
    } catch (error) {
      console.error('Error adding media:', error);
      alert('Failed to add media');
    }
  };

  const deleteMedia = async (mediaId: number) => {
    if (!confirm('Delete this media?')) return;
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/media/${mediaId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete media');
      setMedia(media.filter((m) => m.id !== mediaId));
    } catch (error) {
      console.error('Error deleting media:', error);
      alert('Failed to delete media');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white"
        >
          <i className="fas fa-arrow-left" />
        </button>
        <h2 className="text-2xl font-bold text-white">{campaign.name}</h2>
      </div>

      <div className="glass-container p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Campaign Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Advertiser:</span>
            <span className="text-white ml-2">{campaign.advertiser?.companyName || 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-400">Status:</span>
            <span className="text-white ml-2">{campaign.status}</span>
          </div>
          <div>
            <span className="text-gray-400">Period:</span>
            <span className="text-white ml-2">
              {new Date(campaign.startDate).toLocaleDateString()} -{' '}
              {new Date(campaign.endDate).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Daily Rate:</span>
            <span className="text-white ml-2">₱{campaign.dailyRate.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-400">Total Cost:</span>
            <span className="text-white ml-2">
              ₱{campaign.totalCost?.toFixed(2) || 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Frequency:</span>
            <span className="text-white ml-2">
              {campaign.frequencyType} ({campaign.frequencyValue})
            </span>
          </div>
        </div>
      </div>

      <div className="glass-container p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Media</h3>
        <div className="space-y-2 mb-4">
          <input
            type="text"
            placeholder="Media URL"
            value={newMediaUrl}
            onChange={(e) => setNewMediaUrl(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
          />
          <input
            type="text"
            placeholder="Title (optional)"
            value={newMediaTitle}
            onChange={(e) => setNewMediaTitle(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
          />
          <button
            onClick={addMedia}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            Add Media
          </button>
        </div>
        <div className="space-y-2">
          {media.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg"
            >
              <span className="text-white">{m.title}</span>
              <button
                onClick={() => deleteMedia(m.id)}
                className="text-red-400 hover:text-red-300"
              >
                <i className="fas fa-trash" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
