'use client';

import { useState } from 'react';
import { Schedule, CreateScheduleInput, ScheduleStatus } from '@/types';

interface ScheduleFormProps {
  onCreated: () => void;
  onUpdated: () => void;
  schedule?: Schedule | null;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const STATUSES: ScheduleStatus[] = ['Ontime', 'Boarding', 'Last Called', 'Departed', 'Delayed', 'Cancelled'];

export default function ScheduleForm({ onCreated, onUpdated, schedule }: ScheduleFormProps) {
  const [days, setDays] = useState<string[]>(schedule?.days || []);
  const [departureTime, setDepartureTime] = useState(
    schedule?.departureTime || '08:00'
  );
  const [arrivalTime, setArrivalTime] = useState(schedule?.arrivalTime || '10:00');
  const [vessel, setVessel] = useState(schedule?.vessel || '');
  const [destination, setDestination] = useState(schedule?.destination || '');
  const [status, setStatus] = useState<ScheduleStatus>(schedule?.status || 'Ontime');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleDay = (day: string) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (days.length === 0) {
      alert('Please select at least one day');
      return;
    }

    if (!vessel || !destination) {
      alert('Please fill in vessel name and destination');
      return;
    }

    setIsSubmitting(true);

    try {
      const data: CreateScheduleInput = {
        days,
        departureTime,
        arrivalTime,
        vessel,
        destination,
        status,
      };

      const url = schedule ? '/api/schedules' : '/api/schedules';
      const method = schedule ? 'PUT' : 'POST';
      const body = schedule ? { ...data, id: schedule.id } : data;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to save schedule');
      }

      // Reset form
      if (!schedule) {
        setDays([]);
        setVessel('');
        setDestination('');
        setDepartureTime('08:00');
        setArrivalTime('10:00');
        setStatus('Ontime');
      }

      // Show success message with kiosk update info
      const criticalStatuses = ['Cancelled', 'Delayed'];
      const isCriticalUpdate = criticalStatuses.includes(status);
      const message = schedule
        ? `Schedule updated successfully!${isCriticalUpdate ? ' Status will appear on kiosk within 10 seconds.' : ''}`
        : 'Schedule created successfully!';

      alert(message);
      schedule ? onUpdated() : onCreated();
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Failed to save schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-container rounded-lg p-6 mb-6">
      <h3 className="text-xl font-semibold mb-4">
        {schedule ? 'Edit Schedule' : 'Add New Schedule'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Days *</label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <label
                key={day}
                className={`px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                  days.includes(day)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={days.includes(day)}
                  onChange={() => toggleDay(day)}
                  className="hidden"
                />
                {day.slice(0, 3)}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Departure Time *</label>
            <input
              type="time"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Arrival Time *</label>
            <input
              type="time"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Vessel Name *</label>
            <input
              type="text"
              value={vessel}
              onChange={(e) => setVessel(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              placeholder="Enter vessel name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Destination *</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              placeholder="Enter destination"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Status *</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ScheduleStatus)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            required
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : schedule ? 'Update' : 'Save'} Schedule
          </button>
        </div>
      </form>
    </div>
  );
}

