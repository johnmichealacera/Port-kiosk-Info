'use client';

import { useState, useEffect } from 'react';

interface KioskFooterProps {
  portOfficeNumber?: string;
}

export default function KioskFooter({ portOfficeNumber }: KioskFooterProps) {
  const [message, setMessage] = useState('System is operating normally');
  const [mounted, setMounted] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    setMounted(true);
    const messages = [
      'System is operating normally',
      'Welcome to Socorro Feeder Port',
      'Have a pleasant journey',
      'Safety is our priority',
      'Thank you for choosing our service',
    ];

    // Set random message only on client
    setMessage(messages[Math.floor(Math.random() * messages.length)]);

    // Force re-render every second for live time updates
    const interval = setInterval(() => {
      setForceUpdate(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Get current date/time directly for accurate display
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = now.toLocaleTimeString('en-US', {
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <footer className="flex justify-between items-center py-2 px-4 bg-gray-900/70 backdrop-blur-md border-t border-gray-700">
      <div className="flex gap-6 items-center">
        {/* Current Date and Time - Prominent Display */}
        <div className="flex items-center gap-3 bg-gray-800/40 px-3 py-1.5 rounded-lg border border-gray-600/50">
          <i className="fas fa-calendar-alt text-blue-400 text-base" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white">{formattedDate}</span>
            <span className="text-base font-mono font-bold text-cyan-300 tabular-nums">
              {mounted ? formattedTime : '--:--:-- --'}
            </span>
          </div>
        </div>

        {/* Prominent Port Office Contact */}
        <div className="flex items-center gap-2 bg-blue-600/20 px-3 py-1.5 rounded-lg border border-blue-500/30">
          <i className="fas fa-phone text-blue-400 text-sm" />
          <div className="flex flex-col">
            <span className="text-xs text-blue-300 font-medium">Port Office</span>
            <span className="text-xs font-bold text-white">{portOfficeNumber || 'Not configured'}</span>
          </div>
        </div>

        {/* Status Message */}
        <div className="flex items-center gap-2 text-gray-400 text-xs">
          <i className="fas fa-info-circle text-sm" />
          <span>{mounted ? message : 'System is operating normally'}</span>
        </div>
      </div>

      {/* Live Updates Indicator */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-xs text-gray-400">Live Updates Active</span>
      </div>
    </footer>
  );
}

