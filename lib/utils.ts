import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatTime24to12(time24: string): string {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

export function formatTime12to24(time12: string): string {
  if (!time12) return '';
  const [time, period] = time12.split(' ');
  const [hours, minutes] = time.split(':');
  let hour = parseInt(hours);
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, '0')}:${minutes}`;
}

export function getDayOfWeek(): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
}

export function getTimeDifferenceInMinutes(scheduleTimeStr: string): number {
  const now = new Date();
  const [time, period] = scheduleTimeStr.split(' ');
  const [hours, minutes] = time.split(':');

  let hour = parseInt(hours);
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;

  const scheduleTime = new Date();
  scheduleTime.setHours(hour, parseInt(minutes), 0, 0);

  return (scheduleTime.getTime() - now.getTime()) / (1000 * 60);
}

export function calculateScheduleStatus(
  schedule: { timeDisplay: string; status: string },
  boardingTime: number,
  lastCallTime: number
): string {
  // Manually set statuses should always take precedence
  const manualStatuses = ['Cancelled', 'Delayed'];
  if (manualStatuses.includes(schedule.status)) {
    return schedule.status;
  }

  // Calculate real-time status based on time
  const [departureTime] = schedule.timeDisplay.split(' - ');
  const diffMinutes = getTimeDifferenceInMinutes(departureTime);

  if (diffMinutes > 0 && diffMinutes <= lastCallTime) {
    return 'Last Called';
  } else if (diffMinutes > lastCallTime && diffMinutes <= boardingTime) {
    return 'Boarding';
  } else if (diffMinutes <= 0) {
    return 'Departed';
  }

  // Default to On Time if no time-based status applies
  return 'Ontime';
}

