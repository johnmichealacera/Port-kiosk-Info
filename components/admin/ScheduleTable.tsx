'use client';

import { useState } from 'react';
import { Schedule } from '@/types';
import StatusBadge from '@/components/shared/StatusBadge';
import ScheduleForm from './ScheduleForm';

interface ScheduleTableProps {
  schedules: Schedule[];
  onDeleted: () => void;
  onUpdated: () => void;
}

export default function ScheduleTable({
  schedules,
  onDeleted,
  onUpdated,
}: ScheduleTableProps) {
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/schedules?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete schedule');
      }

      onDeleted();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Failed to delete schedule');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (schedules.length === 0) {
    return (
      <div className="glass-container rounded-lg p-12 text-center">
        <i className="fas fa-calendar-times text-5xl text-gray-500 mb-4" />
        <p className="text-gray-400">No schedules found. Add a new schedule using the form above.</p>
      </div>
    );
  }

  return (
    <div className="glass-container rounded-lg overflow-hidden">
      {editingSchedule && (
        <div className="p-6 border-b border-gray-700">
          <ScheduleForm
            schedule={editingSchedule}
            onCreated={() => {
              setEditingSchedule(null);
              onUpdated();
            }}
            onUpdated={() => {
              setEditingSchedule(null);
              onUpdated();
            }}
          />
          <button
            onClick={() => setEditingSchedule(null)}
            className="mt-4 text-gray-400 hover:text-white"
          >
            Cancel Edit
          </button>
        </div>
      )}

      <table className="w-full">
        <thead className="bg-gray-800/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Days</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Time</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Vessel</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Destination</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {schedules.map((schedule) => (
            <tr key={schedule.id} className="hover:bg-gray-800/30">
              <td className="px-6 py-4 text-sm">{schedule.days.join(', ')}</td>
              <td className="px-6 py-4 text-sm">{schedule.timeDisplay}</td>
              <td className="px-6 py-4 text-sm">{schedule.vessel}</td>
              <td className="px-6 py-4 text-sm">{schedule.destination}</td>
              <td className="px-6 py-4">
                <StatusBadge status={schedule.status} />
              </td>
              <td className="px-6 py-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(schedule)}
                    className="p-2 text-blue-400 hover:text-blue-300"
                    title="Edit"
                  >
                    <i className="fas fa-edit" />
                  </button>
                  <button
                    onClick={() => handleDelete(schedule.id)}
                    disabled={deletingId === schedule.id}
                    className="p-2 text-red-400 hover:text-red-300 disabled:opacity-50"
                    title="Delete"
                  >
                    <i className="fas fa-trash" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

