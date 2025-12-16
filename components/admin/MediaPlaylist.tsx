'use client';

import { useState } from 'react';
import { MediaItem } from '@/types';
import { getVideoThumbnail, isYouTubeUrl, isDirectVideoUrl } from '@/lib/video-utils';

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
  const [videoTitle, setVideoTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-generate title from URL when URL changes
  const handleUrlChange = (url: string) => {
    setVideoUrl(url);
    
    // Auto-generate title if not manually set
    if (!videoTitle && url) {
      if (isYouTubeUrl(url)) {
        // Try to extract meaningful title from YouTube URL
        const urlParts = url.split('/');
        const lastPart = urlParts[urlParts.length - 1];
        if (lastPart.includes('watch?v=')) {
          const videoId = lastPart.split('watch?v=')[1]?.split('&')[0];
          setVideoTitle(`YouTube Video ${videoId ? `(${videoId})` : ''}`);
        } else {
          setVideoTitle('YouTube Video');
        }
      } else if (isDirectVideoUrl(url)) {
        // Extract filename from URL
        const filename = url.split('/').pop()?.split('?')[0] || 'Video';
        setVideoTitle(filename);
      } else {
        setVideoTitle('Video from URL');
      }
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!videoUrl.trim()) {
      alert('Please enter a video URL');
      return;
    }

    const title = videoTitle.trim() || videoUrl.split('/').pop() || 'Video from URL';

    setIsAdding(true);
    try {
      const response = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title,
          source: videoUrl,
          type: 'url',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add media');
      }

      setVideoUrl('');
      setVideoTitle('');
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
            <label className="block text-sm font-medium mb-2">Video Name/Title</label>
            <input
              type="text"
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              placeholder="Enter a name for this video (e.g., Welcome Video)"
            />
            <p className="text-xs text-gray-400 mt-1">
              A descriptive name to identify this video in the playlist
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Video URL</label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              placeholder="https://example.com/video.mp4 or https://youtube.com/watch?v=..."
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Supports YouTube URLs and direct video file URLs (mp4, webm, etc.)
            </p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {media.map((item, index) => {
              const thumbnailUrl = getVideoThumbnail(item.source);
              const isYouTube = isYouTubeUrl(item.source);
              const isDirectVideo = isDirectVideoUrl(item.source);
              
              return (
                <div
                  key={item.id}
                  className={`relative rounded-lg overflow-hidden transition-all ${
                    playingIndex === index
                      ? 'ring-2 ring-green-500 shadow-lg shadow-green-500/50'
                      : 'bg-gray-800/50 hover:bg-gray-800/70'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-gray-900 overflow-hidden">
                    {thumbnailUrl ? (
                      <>
                        {isYouTube ? (
                          <img
                            src={thumbnailUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : isDirectVideo ? (
                          <video
                            src={item.source}
                            className="w-full h-full object-cover"
                            muted
                            preload="metadata"
                            onLoadedMetadata={(e) => {
                              const video = e.currentTarget;
                              video.currentTime = 1; // Seek to 1 second for thumbnail
                            }}
                          />
                        ) : (
                          <img
                            src={thumbnailUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                        {/* Play overlay for direct videos */}
                        {isDirectVideo && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <i className="fas fa-play text-4xl text-white opacity-70" />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-900">
                        <i className="fas fa-video text-4xl text-gray-600" />
                      </div>
                    )}
                    
                    {/* Position badge */}
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded">
                      #{index + 1}
                    </div>
                    
                    {/* Playing indicator */}
                    {playingIndex === index && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded flex items-center gap-1">
                        <i className="fas fa-circle text-xs animate-pulse" />
                        Playing
                      </div>
                    )}
                  </div>
                  
                  {/* Video Info */}
                  <div className="p-4">
                    <h4 
                      className="font-semibold text-white mb-2 overflow-hidden text-ellipsis" 
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: '1.5',
                        maxHeight: '3em'
                      }}
                      title={item.title}
                    >
                      {item.title}
                    </h4>
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                      <span className="flex items-center gap-1">
                        {isYouTube && <i className="fab fa-youtube text-red-500" />}
                        {isDirectVideo && <i className="fas fa-file-video" />}
                        {!isYouTube && !isDirectVideo && <i className="fas fa-link" />}
                        {isYouTube ? 'YouTube' : isDirectVideo ? 'Direct Video' : 'URL'}
                      </span>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePlayOnKiosk(index)}
                        disabled={isPlaying}
                        className={`flex-1 px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors ${
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
                        className="px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg disabled:opacity-50 transition-colors"
                        title="Delete"
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

