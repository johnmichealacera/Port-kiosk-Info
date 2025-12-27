'use client';

import { useState, useEffect, useRef } from 'react';
import { Schedule, MediaItemWithAd, VideoControl } from '@/types';
import ScheduleSlideshow from '@/components/kiosk/ScheduleSlideshow';
import VideoPlayer from '@/components/kiosk/VideoPlayer';
import KioskFooter from '@/components/kiosk/KioskFooter';
import DepartureSlideshow from '@/components/kiosk/DepartureSlideshow';

export default function KioskPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [media, setMedia] = useState<MediaItemWithAd[]>([]);
  const [videoControl, setVideoControl] = useState<VideoControl | null>(null);
  const [settings, setSettings] = useState<any>({});
  const [kioskId, setKioskId] = useState<string>('default');
  const fullIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoControlIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastVideoControlUpdate = useRef<Date | null>(null);

  const requestFullscreen = () => {
    if (document.fullscreenElement) return;
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    // Get kioskId from URL params or use default
    const params = new URLSearchParams(window.location.search);
    const id = params.get('kioskId') || 'default';
    setKioskId(id);

    // Initial fetch
    fetchKioskData(id);
    
    // Fetch all data more frequently to catch status updates
    fullIntervalRef.current = setInterval(() => {
      fetchKioskData(id);
    }, 10000); // Check every 10 seconds instead of 30

    // Check for video control updates every 1.5 seconds for immediate response
    videoControlIntervalRef.current = setInterval(() => {
      checkVideoControlUpdate(id);
    }, 1500);

    // Auto fullscreen
    // Prompt fullscreen shortly after load (may be blocked without user gesture)
    setTimeout(() => {
      requestFullscreen();
    }, 800);

    return () => {
      if (fullIntervalRef.current) clearInterval(fullIntervalRef.current);
      if (videoControlIntervalRef.current) clearInterval(videoControlIntervalRef.current);
    };
  }, []);

  const fetchKioskData = async (id: string = kioskId) => {
    try {
      // Add timestamp to prevent caching
      const timestamp = Date.now();
      const response = await fetch(`/api/kiosk?kioskId=${id}&t=${timestamp}`);
      const data = await response.json();
      
      console.log('📊 Kiosk data received:', {
        schedulesCount: data.schedules?.length || 0,
        schedules: data.schedules?.map((s: any) => ({
          id: s.id,
          vessel: s.vessel,
          status: s.status,
          realTimeStatus: s.realTimeStatus,
        })),
        mediaCount: data.media?.length || 0,
        timestamp: new Date().toISOString(),
      });
      
      setSchedules(data.schedules || []);
      setMedia(data.media || []);
      
      // Update video control and track last update time
      if (data.videoControl) {
        const newUpdateTime = new Date(data.videoControl.lastUpdated);
        if (!lastVideoControlUpdate.current || newUpdateTime > lastVideoControlUpdate.current) {
          setVideoControl(data.videoControl);
          lastVideoControlUpdate.current = newUpdateTime;
        }
      }
      
      setSettings(data.settings || {});
    } catch (error) {
      console.error('Error fetching kiosk data:', error);
    }
  };

  const checkVideoControlUpdate = async (id: string = kioskId) => {
    try {
      const response = await fetch(`/api/kiosk?kioskId=${id}`);
      const data = await response.json();
      
      // Only update if video control has changed
      if (data.videoControl) {
        const newUpdateTime = new Date(data.videoControl.lastUpdated);
        const currentUpdateTime = videoControl?.lastUpdated 
          ? new Date(videoControl.lastUpdated) 
          : null;
        
        // Also check if the index changed (in case timestamps are the same)
        const indexChanged = videoControl?.currentVideoIndex !== data.videoControl.currentVideoIndex;
        
        // Update if it's a new control, timestamp is newer, or index changed
        if (!currentUpdateTime || newUpdateTime > currentUpdateTime || indexChanged) {
          console.log('🎬 Video control updated:', {
            oldIndex: videoControl?.currentVideoIndex,
            newIndex: data.videoControl.currentVideoIndex,
            isPlaying: data.videoControl.isPlaying,
            lastUpdated: data.videoControl.lastUpdated,
            indexChanged,
          });
          setVideoControl(data.videoControl);
          lastVideoControlUpdate.current = newUpdateTime;
          
          // Also update media if it changed (in case new video was added)
          if (data.media) {
            setMedia(data.media);
          }
        }
      } else if (videoControl) {
        // If we had a video control but now it's null, reset
        console.log('⚠️ Video control removed');
        setVideoControl(null);
      }
    } catch (error) {
      console.error('Error checking video control update:', error);
    }
  };

  return (
    <div className="h-screen flex flex-col glass-container overflow-hidden relative bg-black">
      <button
        onClick={requestFullscreen}
        className="fixed top-3 right-3 z-20 px-3 py-1.5 text-xs rounded-md bg-gray-800/80 border border-gray-700 text-gray-200 hover:bg-gray-700 transition"
      >
        Fullscreen
      </button>
      <button
        onClick={() => fetchKioskData(kioskId)}
        className="fixed top-3 right-20 z-20 px-3 py-1.5 text-xs rounded-md bg-blue-600/80 border border-blue-500 text-white hover:bg-blue-500 transition"
      >
        Refresh
      </button>
      <main className="flex-1 flex overflow-hidden">
        <div className="w-80">
          <ScheduleSlideshow
            schedules={schedules}
            boardingTime={parseInt(settings.boarding_time) || 30}
            lastCallTime={parseInt(settings.last_call_time) || 5}
            systemName={settings.system_name || 'Socorro Feeder Port'}
            logo={settings.logo}
          />
        </div>

        <div className="flex-1 p-6 bg-gray-900/50 flex flex-col">
          <VideoPlayer
            media={media}
            videoControl={videoControl}
            onControlUpdate={() => fetchKioskData(kioskId)}
            kioskId={kioskId}
          />
        </div>
      </main>

      <DepartureSlideshow
        schedules={schedules}
        boardingTime={parseInt(settings.boarding_time) || 30}
        lastCallTime={parseInt(settings.last_call_time) || 5}
      />

      <KioskFooter portOfficeNumber={settings.port_office_number} />
    </div>
  );
}

