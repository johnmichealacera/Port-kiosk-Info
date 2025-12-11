'use client';

import { useState, useEffect, useRef } from 'react';
import { MediaItem, VideoControl } from '@/types';
import { convertYouTubeToEmbed, isYouTubeUrl, isDirectVideoUrl } from '@/lib/video-utils';

interface VideoPlayerProps {
  media: MediaItem[];
  videoControl: VideoControl | null;
  onControlUpdate: () => void;
}

export default function VideoPlayer({
  media,
  videoControl,
  onControlUpdate,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLooping, setIsLooping] = useState(false);
  const [volume, setVolume] = useState(80);
  const [currentVideoSource, setCurrentVideoSource] = useState<string>('');
  const [isYouTube, setIsYouTube] = useState(false);

  useEffect(() => {
    if (videoControl) {
      const newIndex = videoControl.currentVideoIndex || 0;
      console.log('🎥 VideoPlayer received videoControl update:', {
        currentIndex: currentIndex,
        newIndex,
        isPlaying: videoControl.isPlaying,
        videoControl,
      });
      
      if (newIndex !== currentIndex) {
        console.log(`🔄 Changing video from index ${currentIndex} to ${newIndex}`);
      }
      
      setCurrentIndex(newIndex);
      setIsPlaying(videoControl.isPlaying ?? true);
      setIsLooping(videoControl.isLooping ?? false);
      setVolume(videoControl.volume ?? 80);
    }
  }, [videoControl]);

  useEffect(() => {
    if (media.length > 0) {
      const currentVideo = media[currentIndex];
      if (currentVideo) {
        const source = currentVideo.source;
        
        // Check if it's a YouTube URL
        if (isYouTubeUrl(source)) {
          const embedUrl = convertYouTubeToEmbed(source, isLooping, volume);
          if (embedUrl) {
            setCurrentVideoSource(embedUrl);
            setIsYouTube(true);
          } else {
            console.error('Failed to convert YouTube URL to embed format');
            handleError();
          }
        } else {
          // Direct video file
          setIsYouTube(false);
          setCurrentVideoSource(source);
          
          if (videoRef.current) {
            videoRef.current.src = source;
            videoRef.current.volume = volume / 100; // Convert 0-100 to 0-1
            videoRef.current.load();

            if (isPlaying) {
              videoRef.current.play().catch(console.error);
            }
          }
        }
      }
    }
  }, [currentIndex, media, isPlaying, isLooping, volume]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.loop = isLooping;
      videoRef.current.volume = volume / 100; // Update volume when it changes
    }
  }, [isLooping, volume]);

  const handleEnded = () => {
    if (!isLooping && media.length > 0) {
      const nextIndex = (currentIndex + 1) % media.length;
      setCurrentIndex(nextIndex);
    }
  };

  const handleError = () => {
    console.error('Video error, trying next video');
    if (media.length > 0) {
      setTimeout(() => {
        const nextIndex = (currentIndex + 1) % media.length;
        setCurrentIndex(nextIndex);
      }, 3000);
    }
  };

  // Update YouTube embed URL when looping or volume changes
  useEffect(() => {
    if (isYouTube && media.length > 0 && currentVideoSource) {
      const currentVideo = media[currentIndex];
      if (currentVideo && isYouTubeUrl(currentVideo.source)) {
        const embedUrl = convertYouTubeToEmbed(currentVideo.source, isLooping, volume);
        if (embedUrl && embedUrl !== currentVideoSource) {
          setCurrentVideoSource(embedUrl);
        }
      }
    }
  }, [isLooping, volume, currentIndex, isYouTube, media, currentVideoSource]);

  if (media.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black rounded-lg">
        <div className="text-center text-gray-400">
          <i className="fas fa-film text-4xl mb-4" />
          <p>No videos in playlist</p>
        </div>
      </div>
    );
  }

  const currentVideo = media[currentIndex];

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 bg-black rounded-lg overflow-hidden mb-4 relative">
        {isYouTube && currentVideoSource ? (
          <iframe
            key={`youtube-${currentIndex}-${currentVideoSource}`}
            ref={iframeRef}
            src={currentVideoSource}
            className="w-full h-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
            style={{ border: 'none' }}
            onError={handleError}
          />
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            autoPlay
            playsInline
            onEnded={handleEnded}
            onError={handleError}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        )}
      </div>

      <div className="p-2 bg-gray-800/30 rounded-lg border border-gray-700/50">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span>Playing: {currentVideo?.title || 'Loading...'}</span>
          </div>
          <div className="text-gray-500">
            {currentIndex + 1}/{media.length}
          </div>
        </div>
      </div>
    </div>
  );
}

