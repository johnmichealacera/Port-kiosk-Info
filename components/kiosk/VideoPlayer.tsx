'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MediaItemWithAd, VideoControl } from '@/types';
import { convertYouTubeToEmbed, isYouTubeUrl, isDirectVideoUrl } from '@/lib/video-utils';

interface VideoPlayerProps {
  media: MediaItemWithAd[];
  videoControl: VideoControl | null;
  onControlUpdate: () => void;
  kioskId?: string;
}

export default function VideoPlayer({
  media,
  videoControl,
  onControlUpdate,
  kioskId = 'default',
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLooping, setIsLooping] = useState(false);
  const [volume, setVolume] = useState(80);
  const [currentVideoSource, setCurrentVideoSource] = useState<string>('');
  const [isYouTube, setIsYouTube] = useState(false);
  const adStartTimeRef = useRef<number | null>(null);
  const currentAdRef = useRef<{ campaignId: number; adMediaId: number } | null>(null);
  const lastLoadedSourceRef = useRef<string>('');

  useEffect(() => {
    if (videoControl) {
      const newIndex = videoControl.currentVideoIndex || 0;
      const newIsPlaying = videoControl.isPlaying ?? true;
      const newIsLooping = videoControl.isLooping ?? false;
      const newVolume = videoControl.volume ?? 80;
      
      // Only update if values actually changed
      if (newIndex !== currentIndex) {
        console.log(`🔄 Changing video from index ${currentIndex} to ${newIndex}`);
        setCurrentIndex(newIndex);
      }
      if (newIsPlaying !== isPlaying) {
        setIsPlaying(newIsPlaying);
      }
      if (newIsLooping !== isLooping) {
        setIsLooping(newIsLooping);
      }
      if (newVolume !== volume) {
        setVolume(newVolume);
      }
    }
  }, [videoControl]);

  // Track ad impressions
  const trackImpression = useCallback(async (
    campaignId: number,
    adMediaId: number,
    playDuration?: number,
    completed: boolean = false,
    skipped: boolean = false
  ) => {
    try {
      await fetch('/api/kiosk/impression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          adMediaId,
          kioskId,
          playDuration,
          completed,
          skipped,
        }),
      });
    } catch (error) {
      console.error('Error tracking impression:', error);
    }
  }, [kioskId]);

  const handleError = useCallback(() => {
    // Track ad skip if it's an ad
    if (currentAdRef.current && adStartTimeRef.current) {
      const playDuration = Math.floor((Date.now() - adStartTimeRef.current) / 1000);
      trackImpression(
        currentAdRef.current.campaignId,
        currentAdRef.current.adMediaId,
        playDuration,
        false,
        true // skipped
      );
      adStartTimeRef.current = null;
      currentAdRef.current = null;
    }

    console.error('Video error, trying next video');
    if (media.length > 0) {
      setTimeout(() => {
        const nextIndex = (currentIndex + 1) % media.length;
        setCurrentIndex(nextIndex);
      }, 3000);
    }
  }, [media.length, currentIndex, trackImpression]);

  useEffect(() => {
    if (media.length > 0) {
      const currentVideo = media[currentIndex];
      if (currentVideo) {
        const source = currentVideo.source;
        
        console.log('🎥 Loading video:', {
          index: currentIndex,
          title: currentVideo.title,
          isAd: currentVideo.isAd,
          source: source?.substring(0, 50),
        });

        // Track ad impression when ad starts
        if (currentVideo.isAd && currentVideo.adCampaignId && currentVideo.adMediaId) {
          console.log('📢 Ad detected:', {
            campaignId: currentVideo.adCampaignId,
            adMediaId: currentVideo.adMediaId,
            title: currentVideo.title,
          });
          adStartTimeRef.current = Date.now();
          currentAdRef.current = {
            campaignId: currentVideo.adCampaignId,
            adMediaId: currentVideo.adMediaId,
          };
          // Track impression start (we'll update with duration on end/error)
          trackImpression(
            currentVideo.adCampaignId,
            currentVideo.adMediaId,
            0,
            false,
            false
          );
        } else {
          // Not an ad, clear ad tracking
          adStartTimeRef.current = null;
          currentAdRef.current = null;
        }

        // Check if it's a YouTube URL
        if (isYouTubeUrl(source)) {
          const embedUrl = convertYouTubeToEmbed(source, isLooping, volume);
          if (embedUrl) {
            lastLoadedSourceRef.current = source;
            setCurrentVideoSource(embedUrl);
            setIsYouTube(true);
          } else {
            console.error('Failed to convert YouTube URL to embed format');
            handleError();
          }
        } else {
          // Direct video file
          lastLoadedSourceRef.current = source;
          setIsYouTube(false);
          setCurrentVideoSource(source);
        }
      }
    }
  }, [currentIndex, media]);

  // Handle direct video file loading and autoplay
  useEffect(() => {
    if (!isYouTube && currentVideoSource && videoRef.current) {
      const video = videoRef.current;
      
      // Only reload if source actually changed
      if (video.src !== currentVideoSource) {
        video.src = currentVideoSource;
        video.volume = volume / 100;
        video.loop = isLooping;
        video.muted = true; // Start muted for autoplay
        
        const playVideo = async () => {
          if (!video || !isPlaying) return;
          
          try {
            await video.play();
            console.log('✅ Video started playing');
            // Unmute after video starts
            setTimeout(() => {
              if (video) {
                video.muted = false;
                console.log('🔊 Video unmuted');
              }
            }, 500);
          } catch (error) {
            console.error('❌ Autoplay failed, retrying:', error);
            // Retry after a delay
            setTimeout(async () => {
              if (video && isPlaying) {
                try {
                  await video.play();
                  if (video) {
                    video.muted = false;
                  }
                } catch (e) {
                  console.error('❌ Retry failed:', e);
                }
              }
            }, 1000);
          }
        };

        // Try multiple events to ensure playback
        video.addEventListener('loadeddata', playVideo, { once: true });
        video.addEventListener('canplay', playVideo, { once: true });
        video.addEventListener('loadedmetadata', playVideo, { once: true });
        video.load();
        
        // Also try immediately
        setTimeout(playVideo, 200);
      } else {
        // Source is the same, just update properties
        video.volume = volume / 100;
        video.loop = isLooping;
        // Ensure it's playing if it should be
        if (isPlaying && video.paused) {
          video.play().catch(console.error);
        }
      }
    }
  }, [isYouTube, currentVideoSource, isPlaying, isLooping, volume]);

  const handleEnded = useCallback(async () => {
    console.log('🎬 Video ended:', {
      currentIndex,
      mediaLength: media.length,
      isLooping,
      currentVideo: media[currentIndex],
    });

    // Track ad completion if it's an ad
    if (currentAdRef.current && adStartTimeRef.current) {
      const playDuration = Math.floor((Date.now() - adStartTimeRef.current) / 1000);
      console.log('📊 Tracking ad completion:', {
        campaignId: currentAdRef.current.campaignId,
        adMediaId: currentAdRef.current.adMediaId,
        playDuration,
      });
      trackImpression(
        currentAdRef.current.campaignId,
        currentAdRef.current.adMediaId,
        playDuration,
        true, // completed
        false
      );
      adStartTimeRef.current = null;
      currentAdRef.current = null;
    }

    if (!isLooping && media.length > 0) {
      const nextIndex = (currentIndex + 1) % media.length;
      console.log(`⏭️ Moving to next video: ${currentIndex} → ${nextIndex}`, {
        nextVideo: media[nextIndex],
        isAd: media[nextIndex]?.isAd,
      });
      
      setCurrentIndex(nextIndex);
      
      // Update video control on server
      try {
        const response = await fetch('/api/kiosk', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kioskId,
            currentVideoIndex: nextIndex,
            isPlaying: true,
            isLooping: false,
            volume: volume,
          }),
        });
        
        if (response.ok) {
          console.log('✅ Video control updated on server');
          onControlUpdate();
        } else {
          console.error('❌ Failed to update video control:', response.status);
        }
      } catch (error) {
        console.error('❌ Error updating video control:', error);
      }
    } else {
      console.log('⏸️ Not advancing:', { isLooping, mediaLength: media.length });
    }
  }, [isLooping, media.length, currentIndex, trackImpression, kioskId, volume, onControlUpdate, media]);

  // Update YouTube embed URL when looping or volume changes (but only if source hasn't changed)
  useEffect(() => {
    if (isYouTube && media.length > 0 && currentVideoSource) {
      const currentVideo = media[currentIndex];
      if (currentVideo && isYouTubeUrl(currentVideo.source) && lastLoadedSourceRef.current === currentVideo.source) {
        const embedUrl = convertYouTubeToEmbed(currentVideo.source, isLooping, volume);
        if (embedUrl && embedUrl !== currentVideoSource) {
          setCurrentVideoSource(embedUrl);
        }
      }
    }
  }, [isLooping, volume]);

  // Listen for YouTube iframe messages (for video end detection)
  useEffect(() => {
    if (!isYouTube) return;

    const handleMessage = (event: MessageEvent) => {
      // YouTube iframe sends messages when video state changes
      // We're looking for video end events
      if (event.origin !== 'https://www.youtube.com') return;
      
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        // YouTube iframe API sends 'onStateChange' events
        // State 0 = ended, 1 = playing, 2 = paused, 3 = buffering, 5 = cued
        if (data.event === 'onStateChange' && data.info === 0) {
          // Video ended
          if (!isLooping) {
            handleEnded();
          }
        }
      } catch (e) {
        // Not a JSON message, ignore
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isYouTube, isLooping, handleEnded]);

  // Fallback: Use interval to check if YouTube video ended (if message API doesn't work)
  useEffect(() => {
    if (!isYouTube || isLooping) return;

    const checkInterval = setInterval(() => {
      // Try to detect if YouTube video ended by checking iframe
      // This is a fallback method
      if (iframeRef.current) {
        try {
          // YouTube iframes don't expose duration easily, so we use a timeout approach
          // For now, we'll rely on the message API above
        } catch (e) {
          // Cross-origin restrictions prevent direct access
        }
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [isYouTube, isLooping]);

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
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            style={{ border: 'none' }}
            onError={handleError}
            onLoad={() => {
              console.log('📺 YouTube iframe loaded:', currentVideoSource);
              // YouTube iframe with autoplay=1&mute=1 should autoplay automatically
              // Send commands to ensure it plays and unmutes
              const sendPlayCommand = () => {
                if (iframeRef.current?.contentWindow) {
                  try {
                    iframeRef.current.contentWindow.postMessage(
                      JSON.stringify({ event: 'command', func: 'playVideo', args: '' }),
                      'https://www.youtube.com'
                    );
                    console.log('▶️ Sent playVideo command to YouTube iframe');
                  } catch (e) {
                    console.error('Error sending play command:', e);
                  }
                }
              };

              const sendUnmuteCommand = () => {
                if (iframeRef.current?.contentWindow) {
                  try {
                    iframeRef.current.contentWindow.postMessage(
                      JSON.stringify({ event: 'command', func: 'unMute', args: '' }),
                      'https://www.youtube.com'
                    );
                    console.log('🔊 Sent unmute command to YouTube iframe');
                  } catch (e) {
                    console.error('Error sending unmute command:', e);
                  }
                }
              };

              // Send play command multiple times to ensure it works
              setTimeout(sendPlayCommand, 300);
              setTimeout(sendPlayCommand, 1000);
              setTimeout(sendPlayCommand, 2000);
              
              // Unmute after video starts
              setTimeout(sendUnmuteCommand, 2000);
              setTimeout(sendUnmuteCommand, 3000);
            }}
          />
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            autoPlay
            muted
            playsInline
            onEnded={handleEnded}
            onError={handleError}
            onPlay={() => {
              setIsPlaying(true);
              // Unmute after playback starts
              if (videoRef.current) {
                setTimeout(() => {
                  if (videoRef.current) {
                    videoRef.current.muted = false;
                  }
                }, 300);
              }
            }}
            onPause={() => setIsPlaying(false)}
          />
        )}
      </div>

      <div className="p-2 bg-gray-800/30 rounded-lg border border-gray-700/50">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span>Playing: {currentVideo?.title || 'Loading...'}</span>
            {currentVideo?.isAd && (
              <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-[10px]">
                AD
              </span>
            )}
          </div>
          <div className="text-gray-500">
            {currentIndex + 1}/{media.length}
          </div>
        </div>
      </div>
    </div>
  );
}

