'use client';

import { useState } from 'react';
import { SystemSettings, Theme } from '@/types';

interface SystemSettingsPanelProps {
  settings: SystemSettings;
  onUpdated: () => void;
}

const THEMES: Theme[] = ['windows-glass', 'dark-mode', 'light-mode'];

export default function SystemSettingsPanel({
  settings,
  onUpdated,
}: SystemSettingsPanelProps) {
  const [formData, setFormData] = useState<SystemSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      onUpdated();
    } catch (error) {
      console.error('Error updating settings:', error);
      alert('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-container rounded-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* System Identity */}
        <div>
          <h3 className="text-lg font-semibold mb-4">System Identity</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">System Name</label>
              <input
                type="text"
                value={formData.systemName}
                onChange={(e) =>
                  setFormData({ ...formData, systemName: e.target.value })
                }
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Logo URL</label>
              <input
                type="url"
                value={formData.logo}
                onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>
        </div>

        {/* Timing Settings */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Timing Settings</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Boarding Time (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={formData.boardingTime}
                onChange={(e) =>
                  setFormData({ ...formData, boardingTime: parseInt(e.target.value) })
                }
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Last Call Time (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={formData.lastCallTime}
                onChange={(e) =>
                  setFormData({ ...formData, lastCallTime: parseInt(e.target.value) })
                }
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Fade Interval (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={formData.fadeInterval}
                onChange={(e) =>
                  setFormData({ ...formData, fadeInterval: parseInt(e.target.value) })
                }
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>
          </div>
        </div>

        {/* Theme Settings */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Theme Settings</h3>
          <div className="space-y-2">
            {THEMES.map((theme) => (
              <label
                key={theme}
                className={`flex items-center p-4 rounded-lg cursor-pointer transition-colors ${
                  formData.theme === theme
                    ? 'bg-blue-600'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name="theme"
                  value={theme}
                  checked={formData.theme === theme}
                  onChange={(e) =>
                    setFormData({ ...formData, theme: e.target.value as Theme })
                  }
                  className="mr-3"
                />
                <span className="capitalize">{theme.replace('-', ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

