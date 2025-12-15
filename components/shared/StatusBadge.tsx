import { ScheduleStatus } from '@/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: ScheduleStatus | string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusClass = status.toLowerCase().replace(' ', '');
  
  return (
    <span
      className={cn(
        'status-badge',
        `status-${statusClass}`,
        className
      )}
    >
      {status}
    </span>
  );
}

