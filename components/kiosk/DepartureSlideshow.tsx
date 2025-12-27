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

  return (
    <div className="w-full bg-gray-900/90 backdrop-blur-md border-t border-gray-700 overflow-hidden shadow-lg">
      {/* Top Row - Clockwise (Left to Right) - 4 trips */}
      <div className="relative h-24 overflow-hidden bg-gradient-to-r from-gray-900/95 to-gray-800/95">
        {/* Gradient fade on left edge */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-gray-900/95 to-transparent z-10 pointer-events-none" />
        {/* Gradient fade on right edge */}
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-gray-900/95 to-transparent z-10 pointer-events-none" />

        <div className="absolute inset-0 flex animate-scroll-right">
          {schedules.map((schedule, idx) => {
            const [departure, arrival] = schedule.timeDisplay.split(' - ');
            const status = calculateScheduleStatus(schedule, boardingTime, lastCallTime);

            return (
              <div
                key={`top-${schedule.id}-${idx}`}
                className="flex-shrink-0 px-4 flex items-center gap-2 min-w-[300px] border-r border-gray-700/30 hover:bg-gray-800/30 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1">
                  <div className="text-2xl font-bold text-blue-400 min-w-[85px] drop-shadow-lg">
                    {departure}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xl font-black text-cyan-300 truncate leading-tight drop-shadow-lg px-1 py-0.5 rounded-sm animate-pulse" style={{
                      textShadow: '0 0 8px rgba(0,150,200,1), 0 0 16px rgba(0,120,180,0.8), 0 0 24px rgba(0,100,160,0.6), 0 0 32px rgba(0,80,140,0.4), 0 2px 4px rgba(0,0,0,0.5)',
                      background: 'linear-gradient(45deg, rgba(0,255,255,0.03) 0%, rgba(0,255,255,0.01) 50%, transparent 100%)',
                      border: '1px solid rgba(0,255,255,0.3)',
                      boxShadow: '0 0 10px rgba(0,255,255,0.3), inset 0 0 10px rgba(0,255,255,0.1)'
                    }}>{schedule.vessel}</div>
                    <div className="text-xs text-gray-300 flex items-center gap-1">
                      <i className="fas fa-map-marker-alt text-blue-400 text-xs" />
                      <span className="truncate">{schedule.destination}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 min-w-[80px]">
                    <div className="text-xs text-gray-300 leading-tight">
                      Arr: {arrival}
                    </div>
                    <StatusBadge status={status} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Row - Counter-Clockwise (Right to Left) - 3 trips */}
      <div className="relative h-24 overflow-hidden border-t border-gray-700/50 bg-gradient-to-r from-gray-800/95 to-gray-900/95">
        {/* Gradient fade on left edge */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-gray-900/95 to-transparent z-10 pointer-events-none" />
        {/* Gradient fade on right edge */}
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-gray-900/95 to-transparent z-10 pointer-events-none" />

        <div className="absolute inset-0 flex animate-scroll-left">
          {schedules.map((schedule, idx) => {
            const [departure, arrival] = schedule.timeDisplay.split(' - ');
            const status = calculateScheduleStatus(schedule, boardingTime, lastCallTime);

            return (
              <div
                key={`bottom-${schedule.id}-${idx}`}
                className="flex-shrink-0 px-4 flex items-center gap-2 min-w-[300px] border-r border-gray-700/30 hover:bg-gray-800/30 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1">
                  <div className="text-2xl font-bold text-green-400 min-w-[85px] drop-shadow-lg">
                    {departure}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xl font-black text-cyan-300 truncate leading-tight drop-shadow-lg px-1 py-0.5 rounded-sm animate-pulse" style={{
                      textShadow: '0 0 8px rgba(0,150,200,1), 0 0 16px rgba(0,120,180,0.8), 0 0 24px rgba(0,100,160,0.6), 0 0 32px rgba(0,80,140,0.4), 0 2px 4px rgba(0,0,0,0.5)',
                      background: 'linear-gradient(45deg, rgba(0,255,255,0.03) 0%, rgba(0,255,255,0.01) 50%, transparent 100%)',
                      border: '1px solid rgba(0,255,255,0.3)',
                      boxShadow: '0 0 10px rgba(0,255,255,0.3), inset 0 0 10px rgba(0,255,255,0.1)'
                    }}>{schedule.vessel}</div>
                    <div className="text-xs text-gray-300 flex items-center gap-1">
                      <i className="fas fa-map-marker-alt text-green-400 text-xs" />
                      <span className="truncate">{schedule.destination}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 min-w-[80px]">
                    <div className="text-xs text-gray-300 leading-tight">
                      Arr: {arrival}
                    </div>
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
