'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface NotificationProps {
  message: string;
  type?: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export default function Notification({
  message,
  type = 'success',
  onClose,
  duration = 3000,
}: NotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={cn(
        'fixed top-5 right-5 z-50 px-6 py-4 rounded-lg backdrop-blur-md border flex items-center gap-3 animate-slide-in',
        type === 'success'
          ? 'bg-green-900/80 border-green-500'
          : 'bg-red-900/80 border-red-500'
      )}
    >
      <i
        className={cn(
          'fas',
          type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'
        )}
      />
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-2 hover:opacity-70 transition-opacity"
      >
        <i className="fas fa-times" />
      </button>
    </div>
  );
}

