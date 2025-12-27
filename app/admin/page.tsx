'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Schedule, MediaItem, SystemSettings } from '@/types';
import ScheduleForm from '@/components/admin/ScheduleForm';
import ScheduleTable from '@/components/admin/ScheduleTable';
import MediaPlaylist from '@/components/admin/MediaPlaylist';
import SystemSettingsPanel from '@/components/admin/SystemSettingsPanel';
import AdvertiserManagement from '@/components/admin/AdvertiserManagement';
import CampaignManagement from '@/components/admin/CampaignManagement';
import AdAnalytics from '@/components/admin/AdAnalytics';

export default function AdminPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'schedules' | 'media' | 'settings' | 'advertisers' | 'campaigns' | 'analytics'>('schedules');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [schedulesRes, mediaRes, settingsRes] = await Promise.all([
        fetch('/api/schedules'),
        fetch('/api/media'),
        fetch('/api/settings'),
      ]);

      const schedulesData = await schedulesRes.json();
      const mediaData = await mediaRes.json();
      const settingsData = await settingsRes.json();

      setSchedules(schedulesData.schedules || []);
      setMedia(mediaData.media || []);
      setSettings(settingsData.settings || null);
    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification('Failed to load data', 'error');
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleScheduleCreated = () => {
    fetchData();
    showNotification('Schedule created successfully!');
  };

  const handleScheduleUpdated = () => {
    fetchData();
    showNotification('Schedule updated successfully!');
  };

  const handleScheduleDeleted = () => {
    fetchData();
    showNotification('Schedule deleted successfully!');
  };

  const handleMediaAdded = () => {
    fetchData();
    showNotification('Media added successfully!');
  };

  const handleMediaDeleted = () => {
    fetchData();
    showNotification('Media deleted successfully!');
  };

  const handleSettingsUpdated = () => {
    fetchData();
    showNotification('Settings updated successfully!');
  };

  return (
    <div className="min-h-screen glass-container">
      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-gray-900/70 backdrop-blur-md border-r border-gray-700 p-6 flex flex-col">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Port Kiosk Admin</h1>
          </div>

          <div className="flex-1 space-y-2">
            <button
              onClick={() => setActiveTab('schedules')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'schedules'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <i className="fas fa-ship mr-3" />
              Schedules
            </button>
            <button
              onClick={() => setActiveTab('media')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'media'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <i className="fas fa-video mr-3" />
              Media Control
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <i className="fas fa-cog mr-3" />
              Settings
            </button>
            <div className="border-t border-gray-700 my-2" />
            <button
              onClick={() => setActiveTab('advertisers')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'advertisers'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <i className="fas fa-building mr-3" />
                  <span>Advertisers</span>
                </div>
                <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-medium">
                  Experimental
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'campaigns'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <i className="fas fa-bullhorn mr-3" />
                  <span>Ad Campaigns</span>
                </div>
                <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-medium">
                  Experimental
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <i className="fas fa-chart-line mr-3" />
                  <span>Ad Analytics</span>
                </div>
                <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-medium">
                  Experimental
                </span>
              </div>
            </button>
          </div>

          <div className="mt-auto">
            <Link
              href="/kiosk"
              target="_blank"
              className="block w-full text-left px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
            >
              <i className="fas fa-tv mr-3" />
              View Kiosk
            </Link>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {activeTab === 'schedules' && (
            <div>
              <div className="mb-6 flex justify-between items-center">
                <h2 className="text-3xl font-bold">Schedule Management</h2>
              </div>
              <ScheduleForm
                onCreated={handleScheduleCreated}
                onUpdated={handleScheduleUpdated}
              />
              <ScheduleTable
                schedules={schedules}
                onDeleted={handleScheduleDeleted}
                onUpdated={handleScheduleUpdated}
              />
            </div>
          )}

          {activeTab === 'media' && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Media Playlist Management</h2>
              <MediaPlaylist
                media={media}
                onAdded={handleMediaAdded}
                onDeleted={handleMediaDeleted}
              />
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <h2 className="text-3xl font-bold mb-6">System Settings</h2>
              {settings && (
                <SystemSettingsPanel
                  settings={settings}
                  onUpdated={handleSettingsUpdated}
                />
              )}
            </div>
          )}

          {activeTab === 'advertisers' && (
            <div>
              <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <i className="fas fa-exclamation-triangle text-orange-500 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-semibold text-orange-400 mb-2">Experimental Feature</h3>
                    <p className="text-gray-300 text-sm mb-2">
                      The Advertisers management system is currently in experimental stage. Some features may not work as expected or could contain bugs.
                    </p>
                    <p className="text-gray-400 text-xs">
                      <strong>Issues, bugs, and feedback are greatly appreciated!</strong> Please report any problems you encounter.
                    </p>
                  </div>
                </div>
              </div>
              <AdvertiserManagement />
            </div>
          )}

          {activeTab === 'campaigns' && (
            <div>
              <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <i className="fas fa-exclamation-triangle text-orange-500 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-semibold text-orange-400 mb-2">Experimental Feature</h3>
                    <p className="text-gray-300 text-sm mb-2">
                      The Ad Campaigns management system is currently in experimental stage. Some features may not work as expected or could contain bugs.
                    </p>
                    <p className="text-gray-400 text-xs">
                      <strong>Issues, bugs, and feedback are greatly appreciated!</strong> Please report any problems you encounter.
                    </p>
                  </div>
                </div>
              </div>
              <CampaignManagement />
            </div>
          )}

          {activeTab === 'analytics' && (
            <div>
              <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <i className="fas fa-exclamation-triangle text-orange-500 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-semibold text-orange-400 mb-2">Experimental Feature</h3>
                    <p className="text-gray-300 text-sm mb-2">
                      The Ad Analytics system is currently in experimental stage. Some features may not work as expected or could contain bugs.
                    </p>
                    <p className="text-gray-400 text-xs">
                      <strong>Issues, bugs, and feedback are greatly appreciated!</strong> Please report any problems you encounter.
                    </p>
                  </div>
                </div>
              </div>
              <AdAnalytics />
            </div>
          )}
        </main>
      </div>

      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 px-6 py-4 rounded-lg backdrop-blur-md border flex items-center gap-3 ${
            notification.type === 'success'
              ? 'bg-green-900/80 border-green-500'
              : 'bg-red-900/80 border-red-500'
          }`}
        >
          <i
            className={`fas ${
              notification.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'
            }`}
          />
          <span>{notification.message}</span>
        </div>
      )}
    </div>
  );
}

