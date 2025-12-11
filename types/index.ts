export type UserRole = 'admin' | 'port';

export type Permission = 'schedules' | 'media' | 'settings';

export type ScheduleStatus = 'Ontime' | 'Boarding' | 'Last Called' | 'Departed' | 'Delayed' | 'Cancelled';

export type Theme = 'windows-glass' | 'dark-mode' | 'light-mode';

export interface User {
  id: number;
  username: string;
  role: UserRole;
  permissions: Permission[];
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Schedule {
  id: number;
  days: string[];
  departureTime: string;
  arrivalTime: string;
  timeDisplay: string;
  vessel: string;
  destination: string;
  status: ScheduleStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaItem {
  id: number;
  title: string;
  source: string;
  type: 'url' | 'file';
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VideoControl {
  id: number;
  kioskId: string;
  currentVideoIndex: number;
  isPlaying: boolean;
  isLooping: boolean;
  volume: number;
  lastUpdated: Date;
}

export interface SystemSettings {
  systemName: string;
  logo: string;
  boardingTime: number;
  lastCallTime: number;
  fadeInterval: number;
  theme: Theme;
}

export interface CreateScheduleInput {
  days: string[];
  departureTime: string;
  arrivalTime: string;
  vessel: string;
  destination: string;
  status: ScheduleStatus;
}

export interface UpdateScheduleInput extends Partial<CreateScheduleInput> {
  id: number;
}

export interface CreateMediaInput {
  title: string;
  source: string;
  type: 'url' | 'file';
}

export interface CreateUserInput {
  username: string;
  password: string;
  role: UserRole;
  permissions: Permission[];
}

