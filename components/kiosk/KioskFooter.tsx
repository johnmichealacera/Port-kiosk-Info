'use client';

import { useState, useEffect } from 'react';

export default function KioskFooter() {
  const [message, setMessage] = useState('System is operating normally');
  const [mounted, setMounted] = useState(false);

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
  }, []);

  return (
    <footer className="flex justify-between items-center p-3 bg-gray-900/70 backdrop-blur-md border-t border-gray-700">
      <div className="flex gap-6">
        <div className="flex items-center gap-1.5 text-gray-400 text-xs">
          <i className="fas fa-phone text-xs" />
          <span>Port Office: 123-456-7890</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-400 text-xs">
          <i className="fas fa-exclamation-triangle text-xs" />
          <span>{mounted ? message : 'System is operating normally'}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-xs text-gray-400">Live Updates Active</span>
      </div>
    </footer>
  );
}

