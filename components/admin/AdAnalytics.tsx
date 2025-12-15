'use client';

import { useState, useEffect } from 'react';

interface AnalyticsSummary {
  totalImpressions: number;
  uniqueCampaigns: number;
  uniqueKiosks: number;
  completedImpressions: number;
  skippedImpressions: number;
  avgPlayDuration: number;
}

interface RevenueItem {
  campaignId: number;
  campaignName: string;
  advertiserName: string;
  startDate: string;
  endDate: string;
  dailyRate: number;
  billingPeriod: string;
  totalCost: number;
  totalImpressions: number;
}

export default function AdAnalytics() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [revenue, setRevenue] = useState<RevenueItem[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [impressionsRes, revenueRes] = await Promise.all([
        fetch(
          `/api/analytics/ads?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
        ),
        fetch(
          `/api/analytics/ads/revenue?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
        ),
      ]);

      const impressionsData = await impressionsRes.json();
      const revenueData = await revenueRes.json();

      setSummary(impressionsData.summary);
      setRevenue(revenueData.revenue || []);
      setTotalRevenue(revenueData.totalRevenue || 0);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Ad Analytics</h2>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
          />
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
          />
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="glass-container p-6 rounded-lg">
            <div className="text-gray-400 text-sm mb-1">Total Impressions</div>
            <div className="text-3xl font-bold text-white">{summary.totalImpressions.toLocaleString()}</div>
          </div>
          <div className="glass-container p-6 rounded-lg">
            <div className="text-gray-400 text-sm mb-1">Completed</div>
            <div className="text-3xl font-bold text-green-400">
              {summary.completedImpressions.toLocaleString()}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {summary.totalImpressions > 0
                ? ((summary.completedImpressions / summary.totalImpressions) * 100).toFixed(1)
                : 0}
              % completion rate
            </div>
          </div>
          <div className="glass-container p-6 rounded-lg">
            <div className="text-gray-400 text-sm mb-1">Avg. Duration</div>
            <div className="text-3xl font-bold text-blue-400">
              {Math.floor(summary.avgPlayDuration)}s
            </div>
          </div>
        </div>
      )}

      <div className="glass-container p-6 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Revenue Summary</h3>
          <div className="text-2xl font-bold text-green-400">
            ₱{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="glass-container rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                  Campaign
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                  Advertiser
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Period</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                  Daily Rate
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                  Total Cost
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                  Impressions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {revenue.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No revenue data found
                  </td>
                </tr>
              ) : (
                revenue.map((item) => (
                  <tr key={item.campaignId} className="hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-white">{item.campaignName}</td>
                    <td className="px-4 py-3 text-gray-300">{item.advertiserName || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-300">
                      {new Date(item.startDate).toLocaleDateString()} -{' '}
                      {new Date(item.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      ₱{item.dailyRate.toFixed(2)}/day
                    </td>
                    <td className="px-4 py-3 text-green-400">
                      ₱{item.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {item.totalImpressions.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
