'use client';

import { Schedule } from '@/types';
import StatusBadge from '@/components/shared/StatusBadge';
import { calculateScheduleStatus } from '@/lib/utils';

interface ScheduleGridProps {
  schedules: Schedule[];
  boardingTime: number;
  lastCallTime: number;
}

export default function ScheduleGrid({
  schedules,
  boardingTime,
  lastCallTime,
}: ScheduleGridProps) {
  if (schedules.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <i className="fas fa-calendar-times text-6xl mb-4" />
        <p className="text-xl">No departures scheduled for today</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {schedules.map((schedule) => {
        const [departure, arrival] = schedule.timeDisplay.split(' - ');
        const realTimeStatus = calculateScheduleStatus(
          schedule,
          boardingTime,
          lastCallTime
        );
        const statusClass = realTimeStatus.toLowerCase().replace(' ', '');

        return (
          <div
            key={schedule.id}
            className="glass-container rounded-lg p-3 hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                <div className="text-lg font-bold mb-0.5">{departure}</div>
                <div className="text-sm font-medium text-gray-300 truncate">{schedule.vessel}</div>
              </div>
              <StatusBadge status={realTimeStatus} />
            </div>

            <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-2">
              <i className="fas fa-map-marker-alt text-blue-400 text-xs" />
              <span className="truncate">{schedule.destination}</span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-gray-700 text-xs">
              <div>
                <span className="text-gray-400">Arrival: </span>
                <span className="font-medium">{arrival}</span>
              </div>
              <div className="text-gray-500">
                {schedule.days.length} day{schedule.days.length > 1 ? 's' : ''}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

