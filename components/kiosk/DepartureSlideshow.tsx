'use client';

import { useState, useEffect } from 'react';
import { Schedule } from '@/types';
import StatusBadge from '@/components/shared/StatusBadge';
import { calculateScheduleStatus } from '@/lib/utils';

interface DepartureSlideshowProps {
  schedules: Schedule[];
  boardingTime: number;
  lastCallTime: number;
}

export default function DepartureSlideshow({
  schedules,
  boardingTime,
  lastCallTime,
}: DepartureSlideshowProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || schedules.length === 0) {
    return null;
  }

  // Filter out cancelled schedules
  const activeSchedules = schedules.filter((s) => s.status !== 'Cancelled');

  if (activeSchedules.length === 0) {
    return null;
  }

  // Duplicate schedules for seamless infinite scroll
  const duplicatedSchedules = [...activeSchedules, ...activeSchedules, ...activeSchedules];

  return (
    <div className="w-full bg-gray-900/90 backdrop-blur-md border-t border-gray-700 overflow-hidden shadow-lg">
      {/* Top Row - Clockwise (Left to Right) */}
      <div className="relative h-28 overflow-hidden bg-gradient-to-r from-gray-900/95 to-gray-800/95">
        {/* Gradient fade on left edge */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-gray-900/95 to-transparent z-10 pointer-events-none" />
        {/* Gradient fade on right edge */}
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-gray-900/95 to-transparent z-10 pointer-events-none" />
        
        <div className="absolute inset-0 flex animate-scroll-right">
          {duplicatedSchedules.map((schedule, idx) => {
            const [departure, arrival] = schedule.timeDisplay.split(' - ');
            const status = calculateScheduleStatus(schedule, boardingTime, lastCallTime);
            
            return (
              <div
                key={`top-${schedule.id}-${idx}`}
                className="flex-shrink-0 px-8 flex items-center gap-5 min-w-[450px] border-r border-gray-700/30 hover:bg-gray-800/30 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-3xl font-bold text-blue-400 min-w-[130px] drop-shadow-lg">
                    {departure}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-semibold text-white truncate">{schedule.vessel}</div>
                    <div className="text-sm text-gray-300 flex items-center gap-2 mt-1">
                      <i className="fas fa-map-marker-alt text-blue-400 text-xs" />
                      <span className="truncate">{schedule.destination}</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-300 min-w-[110px]">
                    <span className="text-gray-500">Arr:</span> {arrival}
                  </div>
                  <div className="flex-shrink-0">
                    <StatusBadge status={status} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Row - Counter-Clockwise (Right to Left) */}
      <div className="relative h-28 overflow-hidden border-t border-gray-700/50 bg-gradient-to-r from-gray-800/95 to-gray-900/95">
        {/* Gradient fade on left edge */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-gray-900/95 to-transparent z-10 pointer-events-none" />
        {/* Gradient fade on right edge */}
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-gray-900/95 to-transparent z-10 pointer-events-none" />
        
        <div className="absolute inset-0 flex animate-scroll-left">
          {duplicatedSchedules.map((schedule, idx) => {
            const [departure, arrival] = schedule.timeDisplay.split(' - ');
            const status = calculateScheduleStatus(schedule, boardingTime, lastCallTime);
            
            return (
              <div
                key={`bottom-${schedule.id}-${idx}`}
                className="flex-shrink-0 px-8 flex items-center gap-5 min-w-[450px] border-r border-gray-700/30 hover:bg-gray-800/30 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-3xl font-bold text-green-400 min-w-[130px] drop-shadow-lg">
                    {departure}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-semibold text-white truncate">{schedule.vessel}</div>
                    <div className="text-sm text-gray-300 flex items-center gap-2 mt-1">
                      <i className="fas fa-map-marker-alt text-green-400 text-xs" />
                      <span className="truncate">{schedule.destination}</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-300 min-w-[110px]">
                    <span className="text-gray-500">Arr:</span> {arrival}
                  </div>
                  <div className="flex-shrink-0">
                    <StatusBadge status={status} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
