'use client';

import { useState, useEffect } from 'react';
import { Schedule } from '@/types';
import { formatTime24to12, getTimeDifferenceInMinutes } from '@/lib/utils';

interface KioskHeaderProps {
  systemName: string;
  logo?: string;
  schedules: Schedule[];
  currentDate: Date;
}

export default function KioskHeader({
  systemName,
  logo,
  schedules,
  currentDate: initialDate,
}: KioskHeaderProps) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Update time every second
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Find next departure
  const nextSchedule = schedules
    .filter((s) => s.status !== 'Cancelled')
    .sort((a, b) => {
      const diffA = getTimeDifferenceInMinutes(a.timeDisplay.split(' - ')[0]);
      const diffB = getTimeDifferenceInMinutes(b.timeDisplay.split(' - ')[0]);
      return diffA - diffB;
    })
    .find((s) => {
      const diff = getTimeDifferenceInMinutes(s.timeDisplay.split(' - ')[0]);
      return diff > 0;
    });

  const nextDepartureTime = nextSchedule
    ? nextSchedule.timeDisplay.split(' - ')[0]
    : '--:-- --';

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

  return (
    <header className="flex justify-between items-center p-4 bg-gray-900/70 backdrop-blur-md border-b border-gray-700">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          {logo && (
            <img
              src={logo}
              alt="Logo"
              className="w-12 h-12 object-contain rounded-lg bg-gray-800 p-1.5"
            />
          )}
          <h1 className="text-xl font-bold">{systemName}</h1>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg">
          <span className="text-gray-200 text-xs">Next:</span>
          <span className="text-lg font-semibold">{nextDepartureTime}</span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5">
        <div className="text-right">
          <div className="text-gray-400 text-xs">{formattedDate}</div>
          {mounted ? (
            <div className="text-2xl font-semibold">{formattedTime}</div>
          ) : (
            <div className="text-2xl font-semibold">--:--:-- --</div>
          )}
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-800 rounded-full text-xs">
          <i className="fas fa-sun text-yellow-400 text-xs" />
          <span>Weather</span>
        </div>
      </div>
    </header>
  );
}

