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
  time_display?: string;
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
  portOfficeNumber: string;
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

// Ads System Types
export type AdCampaignStatus = 'pending' | 'active' | 'paused' | 'completed' | 'expired' | 'rejected';
export type BillingPeriod = 'daily' | 'monthly';
export type FrequencyType = 'interval' | 'per_hour' | 'per_day';
export type DisplayType = 'mixed' | 'interstitial' | 'scheduled';

export interface Advertiser {
  id: number;
  companyName: string;
  contactName?: string;
  email: string;
  phone?: string;
  address?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

export interface AdCampaign {
  id: number;
  advertiserId: number;
  advertiser?: Advertiser;
  name: string;
  description?: string;
  status: AdCampaignStatus;
  startDate: Date;
  endDate: Date;
  dailyRate: number;
  monthlyRate?: number;
  billingPeriod: BillingPeriod;
  totalCost?: number;
  priority: number;
  frequencyType: FrequencyType;
  frequencyValue: number;
  displayType: DisplayType;
  interstitialInterval?: number;
  approvedAt?: Date;
  approvedBy?: number;
  createdAt: Date;
  updatedAt: Date;
  media?: AdMedia[];
  schedules?: AdSchedule[];
}

export interface AdSchedule {
  id: number;
  campaignId: number;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface AdMedia {
  id: number;
  campaignId: number;
  title: string;
  source: string;
  type: 'url' | 'file';
  duration?: number;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdImpression {
  id: number;
  campaignId: number;
  adMediaId: number;
  kioskId: string;
  impressionTime: Date;
  playDuration?: number;
  completed: boolean;
  skipped: boolean;
}

export interface AdRevenue {
  id: number;
  campaignId: number;
  date: Date;
  impressions: number;
  revenue: number;
  revenueModel: string;
  createdAt: Date;
}

// Extended MediaItem to support ads
export interface MediaItemWithAd extends MediaItem {
  isAd?: boolean;
  adCampaignId?: number;
  adMediaId?: number;
  adCampaignName?: string;
}

// Input types for ads
export interface CreateAdvertiserInput {
  companyName: string;
  contactName?: string;
  email: string;
  phone?: string;
  address?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface UpdateAdvertiserInput extends Partial<CreateAdvertiserInput> {
  id: number;
}

export interface CreateAdCampaignInput {
  advertiserId: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  dailyRate: number;
  monthlyRate?: number;
  billingPeriod: BillingPeriod;
  priority?: number;
  frequencyType: FrequencyType;
  frequencyValue: number;
  displayType: DisplayType;
  interstitialInterval?: number;
}

export interface UpdateAdCampaignInput extends Partial<CreateAdCampaignInput> {
  id: number;
}

export interface CreateAdMediaInput {
  campaignId: number;
  title: string;
  source: string;
  type: 'url' | 'file';
  duration?: number;
}

export interface CreateAdScheduleInput {
  campaignId: number;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  isActive?: boolean;
}

export interface CreateAdImpressionInput {
  campaignId: number;
  adMediaId: number;
  kioskId?: string;
  playDuration?: number;
  completed?: boolean;
  skipped?: boolean;
}

