'use client';

import { useState, useEffect } from 'react';
import { Schedule } from '@/types';
import StatusBadge from '@/components/shared/StatusBadge';
import { calculateScheduleStatus, getTimeDifferenceInMinutes } from '@/lib/utils';

interface ScheduleSlideshowProps {
  schedules: Schedule[];
  boardingTime: number;
  lastCallTime: number;
  systemName: string;
  logo?: string;
}

export default function ScheduleSlideshow({
  schedules,
  boardingTime,
  lastCallTime,
  systemName,
  logo,
}: ScheduleSlideshowProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [currentScheduleIndex, setCurrentScheduleIndex] = useState(0);
  const [nextSchedules, setNextSchedules] = useState<Schedule[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Update time every second
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Update next schedules every second
  useEffect(() => {
    const interval = setInterval(() => {
      const upcoming = schedules
        .filter((s) => s.status !== 'Cancelled')
        .sort((a, b) => {
          const diffA = getTimeDifferenceInMinutes(a.timeDisplay.split(' - ')[0]);
          const diffB = getTimeDifferenceInMinutes(b.timeDisplay.split(' - ')[0]);
          return diffA - diffB;
        })
        .filter((s) => {
          const diff = getTimeDifferenceInMinutes(s.timeDisplay.split(' - ')[0]);
          return diff > 0;
        })
        .slice(0, 3); // Show next 3 trips
      
      setNextSchedules(upcoming);
    }, 1000);

    return () => clearInterval(interval);
  }, [schedules]);

  // Slideshow: cycle through schedules every 5 seconds with transition animation
  useEffect(() => {
    if (schedules.length === 0) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      // Start fade out
      setTimeout(() => {
        setCurrentScheduleIndex((prev) => (prev + 1) % schedules.length);
        // Fade in after index change
        setTimeout(() => {
          setIsTransitioning(false);
        }, 50);
      }, 300); // Half of transition duration
    }, 5000); // Change schedule every 5 seconds

    return () => clearInterval(interval);
  }, [schedules.length]);

  const formattedDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = currentDate.toLocaleTimeString('en-US', {
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const currentSchedule = schedules[currentScheduleIndex];

  if (schedules.length === 0) {
    return (
      <div className="h-full flex flex-col bg-gray-900/30 border-r border-gray-700">
        {/* Header Section */}
        <div className="p-4 border-b border-gray-700 bg-gray-900/50">
          <div className="flex items-center gap-3 mb-3">
            {logo && (
              <img
                src={logo}
                alt="Logo"
                className="w-10 h-10 object-contain rounded-lg bg-gray-800 p-1"
              />
            )}
            <h1 className="text-lg font-bold">{systemName}</h1>
          </div>
          <div className="flex justify-between items-center text-xs">
            <div className="text-gray-400">{formattedDate}</div>
            {mounted ? (
              <div className="text-base font-semibold">{formattedTime}</div>
            ) : (
              <div className="text-base font-semibold">--:--:-- --</div>
            )}
          </div>
        </div>

        {/* Weather Section for Empty State */}
        <div className="p-4 border-b border-gray-700 bg-gray-900/40">
          <div className="glass-container rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <i className="fas fa-cloud-sun text-2xl text-yellow-400" />
                <div>
                  <div className="text-lg font-bold">28°C</div>
                  <div className="text-xs text-gray-400">Partly Cloudy</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">Wind</div>
                <div className="text-sm font-semibold">15 km/h</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-700 text-xs">
              <div>
                <div className="text-gray-400">Wave Height</div>
                <div className="font-semibold">0.5m</div>
              </div>
              <div>
                <div className="text-gray-400">Visibility</div>
                <div className="font-semibold">10 km</div>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center text-gray-400 min-h-0">
          <div className="text-center">
            <i className="fas fa-calendar-times text-4xl mb-2" />
            <p className="text-sm">No departures scheduled for today</p>
          </div>
        </div>
      </div>
    );
  }

  const [departure, arrival] = currentSchedule.timeDisplay.split(' - ');
  const realTimeStatus = calculateScheduleStatus(
    currentSchedule,
    boardingTime,
    lastCallTime
  );

  return (
    <div className="h-full flex flex-col bg-gray-900/30 border-r border-gray-700">
      {/* Header Section */}
      <div className="p-4 border-b border-gray-700 bg-gray-900/50">
        <div className="flex items-center gap-3 mb-3">
          {logo && (
            <img
              src={logo}
              alt="Logo"
              className="w-10 h-10 object-contain rounded-lg bg-gray-800 p-1"
            />
          )}
          <h1 className="text-lg font-bold">{systemName}</h1>
        </div>
        <div className="flex justify-between items-center text-xs">
          <div className="text-gray-400">{formattedDate}</div>
          {mounted ? (
            <div className="text-base font-semibold">{formattedTime}</div>
          ) : (
            <div className="text-base font-semibold">--:--:-- --</div>
          )}
        </div>
      </div>

      {/* Weather Section */}
      <div className="p-4 border-b border-gray-700 bg-gray-900/40">
        <div className="glass-container rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <i className="fas fa-cloud-sun text-2xl text-yellow-400" />
              <div>
                <div className="text-lg font-bold">28°C</div>
                <div className="text-xs text-gray-400">Partly Cloudy</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Wind</div>
              <div className="text-sm font-semibold">15 km/h</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-700 text-xs">
            <div>
              <div className="text-gray-400">Wave Height</div>
              <div className="font-semibold">0.5m</div>
            </div>
            <div>
              <div className="text-gray-400">Visibility</div>
              <div className="font-semibold">10 km</div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Schedule Display */}
      <div className="flex-1 p-4 flex flex-col min-h-0">
        <div 
          className={`glass-container rounded-lg p-6 flex-1 flex flex-col justify-between transition-all duration-500 ${
            isTransitioning 
              ? 'opacity-0 scale-95 transform translate-x-4' 
              : 'opacity-100 scale-100 transform translate-x-0 shadow-lg shadow-blue-500/20 border-2 border-blue-500/30'
          }`}
          key={currentScheduleIndex}
        >
          <div>
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <div className="text-4xl font-bold mb-3">{departure}</div>
                <div className="text-xl font-medium text-gray-300">{currentSchedule.vessel}</div>
              </div>
              <StatusBadge status={realTimeStatus} />
            </div>

            <div className="flex items-center gap-2 text-gray-400 text-lg mb-6">
              <i className="fas fa-map-marker-alt text-blue-400 text-xl" />
              <span>{currentSchedule.destination}</span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-6 border-t border-gray-700">
            <div className="text-base">
              <span className="text-gray-400">Arrival: </span>
              <span className="font-semibold text-lg">{arrival}</span>
            </div>
            <div className="text-gray-500 text-sm">
              {currentSchedule.days.length} day{currentSchedule.days.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Next Trips */}
        {nextSchedules.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-xs text-gray-400 uppercase mb-2">Upcoming Trips</div>
            {nextSchedules.slice(0, 3).map((schedule, idx) => {
              const [nextDep] = schedule.timeDisplay.split(' - ');
              return (
                <div
                  key={schedule.id}
                  className="glass-container rounded p-2 text-xs"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold">{nextDep}</span>
                      <span className="text-gray-400 ml-2">{schedule.vessel}</span>
                    </div>
                    <StatusBadge status={calculateScheduleStatus(schedule, boardingTime, lastCallTime)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide Indicator */}
      {schedules.length > 1 && (
        <div className="p-3 border-t border-gray-700 bg-gray-900/50">
          <div className="flex justify-center items-center gap-2 mb-2">
            {schedules.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentScheduleIndex
                    ? 'bg-blue-500 w-8 shadow-lg shadow-blue-500/50'
                    : 'bg-gray-600 w-2'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="text-center text-xs text-gray-400">
              <span className="font-semibold text-blue-400">{currentScheduleIndex + 1}</span> of <span>{schedules.length}</span>
            </div>
            {isTransitioning && (
              <div className="flex items-center gap-1 text-xs text-blue-400 animate-pulse">
                <i className="fas fa-sync-alt animate-spin" />
                <span>Updating...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

