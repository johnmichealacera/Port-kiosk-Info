'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MediaItemWithAd, VideoControl } from '@/types';
import { convertYouTubeToEmbed, isYouTubeUrl, isDirectVideoUrl } from '@/lib/video-utils';

interface VideoPlayerProps {
  media: MediaItemWithAd[];
  videoControl: VideoControl | null;
  onControlUpdate: () => void;
  kioskId?: string;
}

// YouTube player states
const YT_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5
};

export default function VideoPlayer({
  media,
  videoControl,
  onControlUpdate,
  kioskId = 'default',
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [volume, setVolume] = useState(80);
  const adStartTimeRef = useRef<number | null>(null);
  const currentAdRef = useRef<{ campaignId: number; adMediaId: number } | null>(null);
  
  // New refs for better video tracking
  const videoStartTimeRef = useRef<number | null>(null);
  const videoDurationRef = useRef<number>(30); // Default 30 seconds for YouTube
  const progressCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoplayRetryCountRef = useRef<number>(0);
  const maxAutoplayRetries = 3;

  // Helper to extract YouTube video ID
  const getYouTubeVideoId = useCallback((url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  }, []);

  // Estimate video duration (30-60 seconds for ads/kiosk content typically)
  const estimateVideoDuration = useCallback((video: MediaItemWithAd): number => {
    // For ads, typically 15-30 seconds
    if (video.isAd) return 20;
    // For regular content, typically 30-60 seconds
    // You could fetch actual duration from YouTube API if needed
    return 30;
  }, []);

  // Sync control settings from server (but not autoplay state)
  useEffect(() => {
    if (videoControl) {
      const newIndex = videoControl.currentVideoIndex || 0;
      const newIsLooping = videoControl.isLooping ?? false;
      const newVolume = videoControl.volume ?? 80;

      // Only update if values actually changed
      if (newIndex !== currentIndex) {
        console.log(`🔄 Server requested video change: ${currentIndex} → ${newIndex}`);
        setCurrentIndex(newIndex);
      }
      if (newIsLooping !== isLooping) {
        setIsLooping(newIsLooping);
      }
      if (newVolume !== volume) {
        setVolume(newVolume);
        // Apply volume to video element if it exists
        if (videoRef.current) {
          videoRef.current.volume = newVolume / 100;
        }
      }
    }
  }, [videoControl, currentIndex, isLooping, volume]);

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
  }, [media, currentIndex, trackImpression]);

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
  }, [isLooping, currentIndex, trackImpression, kioskId, volume, onControlUpdate, media]);

  // Single useEffect for video management and autoplay
  useEffect(() => {
    if (!media.length || !media[currentIndex]) return;

    const currentVideo = media[currentIndex];
    const source = currentVideo.source;

    console.log('🎥 Processing video:', {
      index: currentIndex,
      title: currentVideo.title,
      isAd: currentVideo.isAd,
      source: source?.substring(0, 50),
    });

    // Reset autoplay retry counter for new video
    autoplayRetryCountRef.current = 0;
    
    // Set video start time and estimated duration
    videoStartTimeRef.current = Date.now();
    videoDurationRef.current = estimateVideoDuration(currentVideo);

    // Handle ad tracking
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
      trackImpression(currentVideo.adCampaignId, currentVideo.adMediaId, 0, false, false);
    } else {
      adStartTimeRef.current = null;
      currentAdRef.current = null;
    }

    // Cleanup function
    return () => {
      if (progressCheckIntervalRef.current) {
        clearInterval(progressCheckIntervalRef.current);
        progressCheckIntervalRef.current = null;
      }
    };

  }, [currentIndex, media, trackImpression, estimateVideoDuration]);

  // Separate effect for progress monitoring to avoid circular dependency
  useEffect(() => {
    if (!media.length || !media[currentIndex]) return;
    
    const currentVideo = media[currentIndex];
    const source = currentVideo.source;
    
    // Clear any existing progress check interval
    if (progressCheckIntervalRef.current) {
      clearInterval(progressCheckIntervalRef.current);
      progressCheckIntervalRef.current = null;
    }

    // For YouTube videos, set up progress monitoring
    if (isYouTubeUrl(source) && !isLooping) {
      console.log('⏱️ Setting up progress monitoring for YouTube video');
      
      // Check every second if the video should have ended
      progressCheckIntervalRef.current = setInterval(() => {
        if (!videoStartTimeRef.current) return;
        
        const elapsed = (Date.now() - videoStartTimeRef.current) / 1000;
        const duration = videoDurationRef.current;
        
        // Add 2 second buffer to account for loading time
        if (elapsed >= duration + 2) {
          console.log(`⏰ Video duration exceeded (${elapsed.toFixed(1)}s / ${duration}s), moving to next`);
          handleEnded();
        }
      }, 1000);
    }

    // Cleanup function
    return () => {
      if (progressCheckIntervalRef.current) {
        clearInterval(progressCheckIntervalRef.current);
        progressCheckIntervalRef.current = null;
      }
    };
  }, [currentIndex, media, isLooping, handleEnded]);

  // Helper function to get the current video source
  const getCurrentVideoSource = () => {
    if (!media.length || !media[currentIndex]) return '';
    const source = media[currentIndex].source;
    const isYT = isYouTubeUrl(source);
    console.log('🔗 Processing source:', { source, isYouTube: isYT, index: currentIndex });

    if (isYT) {
      const embedUrl = convertYouTubeToEmbed(source, isLooping, volume);
      console.log('🎥 YouTube embed URL:', embedUrl);
      return embedUrl || '';
    }
    return source;
  };

  // Helper function to check if current video is YouTube
  const isCurrentVideoYouTube = useMemo(() => {
    if (!media.length || !media[currentIndex]) return false;
    return isYouTubeUrl(media[currentIndex].source);
  }, [media, currentIndex]);


  // Listen for YouTube iframe messages (for video end detection)
  useEffect(() => {
    if (!isCurrentVideoYouTube) return;

    console.log('🎵 Setting up YouTube message listener');

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com') return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        // YouTube iframe API sends various events
        if (data.event === 'onStateChange') {
          console.log(`📊 YouTube state changed to: ${data.info}`);
          
          switch(data.info) {
            case YT_STATE.ENDED:
              console.log('🎬 YouTube video ended via API');
              if (!isLooping) {
                // Clear the progress interval since we got a proper end event
                if (progressCheckIntervalRef.current) {
                  clearInterval(progressCheckIntervalRef.current);
                  progressCheckIntervalRef.current = null;
                }
                handleEnded();
              }
              break;
            
            case YT_STATE.PLAYING:
              console.log('▶️ YouTube video playing');
              // Reset start time when video actually starts playing
              if (!videoStartTimeRef.current) {
                videoStartTimeRef.current = Date.now();
              }

              // Unmute YouTube video after it starts playing to enable audio
              setTimeout(() => {
                if (iframeRef.current) {
                  console.log('🔊 Unmuting YouTube video after autoplay started');
                  iframeRef.current.contentWindow?.postMessage(
                    '{"event":"command","func":"unMute","args":""}',
                    'https://www.youtube.com'
                  );
                  // Set volume after unmuting
                  setTimeout(() => {
                    iframeRef.current?.contentWindow?.postMessage(
                      `{"event":"command","func":"setVolume","args":[${volume}]}`,
                      'https://www.youtube.com'
                    );
                  }, 100);
                }
              }, 500);
              break;
            
            case YT_STATE.PAUSED:
              console.log('⏸️ YouTube video paused');
              break;
              
            case YT_STATE.BUFFERING:
              console.log('⏳ YouTube video buffering');
              break;
          }
        }
        
        // Listen for initial ready event
        if (data.event === 'initialDelivery' || data.event === 'onReady') {
          console.log('✅ YouTube player ready');
        }
      } catch (e) {
        // Not a JSON message, ignore silently
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isCurrentVideoYouTube, isLooping, handleEnded, volume]);

  // YouTube autoplay retry effect
  useEffect(() => {
    if (!isCurrentVideoYouTube || !iframeRef.current) return;
    
    let retryCount = 0;
    const maxRetries = 3;
    
    const attemptAutoplay = () => {
      if (!iframeRef.current) return;
      
      console.log(`🔄 Attempting YouTube autoplay (attempt ${retryCount + 1}/${maxRetries})`);
      
      // Try to play via postMessage
      iframeRef.current.contentWindow?.postMessage(
        '{"event":"command","func":"playVideo","args":""}',
        'https://www.youtube.com'
      );
      
      retryCount++;
      
      // If we haven't reached max retries, try again in 2 seconds
      if (retryCount < maxRetries) {
        setTimeout(attemptAutoplay, 2000);
      }
    };
    
    // Start first attempt after a delay
    const initialTimer = setTimeout(attemptAutoplay, 1500);
    
    return () => clearTimeout(initialTimer);
  }, [currentIndex, isCurrentVideoYouTube]);

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
        {isCurrentVideoYouTube && getCurrentVideoSource() ? (
          <iframe
            key={`youtube-${currentIndex}-${getCurrentVideoSource()}`}
            ref={iframeRef}
            src={getCurrentVideoSource()}
            className="w-full h-full"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            style={{ border: 'none' }}
            onError={handleError}
            onLoad={() => {
              console.log('📺 YouTube iframe loaded');
              // Start autoplay retry attempts after iframe loads
              // Try to play via postMessage after a short delay
              setTimeout(() => {
                if (iframeRef.current) {
                  console.log('🔄 Attempting YouTube autoplay via postMessage');
                  iframeRef.current.contentWindow?.postMessage(
                    '{"event":"command","func":"playVideo","args":""}',
                    'https://www.youtube.com'
                  );
                }
              }, 1000);
            }}
          />
        ) : (
          <video
            ref={videoRef}
            src={!isCurrentVideoYouTube ? getCurrentVideoSource() : undefined}
            className="w-full h-full object-contain"
            autoPlay
            muted
            playsInline
            loop={isLooping}
            onEnded={handleEnded}
            onError={handleError}
            onLoadedMetadata={(e) => {
              const video = e.currentTarget;
              console.log(`📊 Video metadata loaded, duration: ${video.duration}s`);
              // Update our duration reference with actual video duration
              if (video.duration && !isNaN(video.duration)) {
                videoDurationRef.current = video.duration;
              }
              // Set volume when metadata loads
              video.volume = volume / 100;
            }}
            onPlay={() => {
              console.log('▶️ Video started playing');
              if (!videoStartTimeRef.current) {
                videoStartTimeRef.current = Date.now();
              }

              // Unmute after video starts playing to enable audio while preserving autoplay
              setTimeout(() => {
                if (videoRef.current && videoRef.current.muted) {
                  console.log('🔊 Unmuting video after autoplay started');
                  videoRef.current.muted = false;
                  videoRef.current.volume = volume / 100;
                }
              }, 500);
            }}
            onPause={() => {
              console.log('⏸️ Video paused');
            }}
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

