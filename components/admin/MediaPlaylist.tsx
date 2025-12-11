'use client';

import { useState } from 'react';
import { MediaItem } from '@/types';

interface MediaPlaylistProps {
  media: MediaItem[];
  onAdded: () => void;
  onDeleted: () => void;
}

export default function MediaPlaylist({
  media,
  onAdded,
  onDeleted,
}: MediaPlaylistProps) {
  const [videoUrl, setVideoUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!videoUrl.trim()) {
      alert('Please enter a video URL');
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: videoUrl.split('/').pop() || 'Video from URL',
          source: videoUrl,
          type: 'url',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add media');
      }

      setVideoUrl('');
      onAdded();
    } catch (error) {
      console.error('Error adding media:', error);
      alert('Failed to add media');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this video from the playlist?')) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/media?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete media');
      }

      onDeleted();
    } catch (error) {
      console.error('Error deleting media:', error);
      alert('Failed to delete media');
    } finally {
      setDeletingId(null);
    }
  };

  const handlePlayOnKiosk = async (index: number) => {
    setIsPlaying(true);
    setPlayingIndex(index);
    
    try {
      const response = await fetch('/api/kiosk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentVideoIndex: index,
          isPlaying: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update kiosk');
      }

      // Show success feedback
      setTimeout(() => {
        setIsPlaying(false);
      }, 2000);
    } catch (error) {
      console.error('Error updating kiosk:', error);
      alert('Failed to update kiosk');
      setIsPlaying(false);
      setPlayingIndex(null);
    }
  };

  const handlePlayNext = async () => {
    if (media.length === 0) return;
    
    const currentPlaying = playingIndex !== null ? playingIndex : -1;
    const nextIndex = (currentPlaying + 1) % media.length;
    await handlePlayOnKiosk(nextIndex);
  };

  return (
    <div className="space-y-6">
      {/* Add Media Form */}
      <div className="glass-container rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Add Media</h3>
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Video URL</label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              placeholder="https://example.com/video.mp4"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isAdding}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isAdding ? 'Adding...' : 'Add to Playlist'}
          </button>
        </form>
      </div>

      {/* Playlist */}
      <div className="glass-container rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Current Playlist</h3>
          {media.length > 0 && (
            <button
              onClick={handlePlayNext}
              disabled={isPlaying}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              title="Play Next Video on Kiosk"
            >
              <i className="fas fa-forward" />
              <span>Play Next</span>
            </button>
          )}
        </div>
        {media.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <i className="fas fa-film text-4xl mb-4" />
            <p>No videos in playlist</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {media.map((item, index) => (
              <li
                key={item.id}
                className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                  playingIndex === index
                    ? 'bg-green-900/30 border-2 border-green-500'
                    : 'bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-sm text-gray-400 w-8">#{index + 1}</span>
                  <span className="flex-1">{item.title}</span>
                  {playingIndex === index && (
                    <span className="text-green-400 text-sm flex items-center gap-1">
                      <i className="fas fa-circle text-xs animate-pulse" />
                      Playing on Kiosk
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePlayOnKiosk(index)}
                    disabled={isPlaying}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                      playingIndex === index
                        ? 'bg-green-600 text-white'
                        : 'bg-green-600/80 text-white hover:bg-green-600'
                    } disabled:opacity-50`}
                    title="Play on Kiosk"
                  >
                    <i className="fas fa-play" />
                    <span>Play</span>
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="p-2 text-red-400 hover:text-red-300 disabled:opacity-50"
                    title="Delete"
                  >
                    <i className="fas fa-trash" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

