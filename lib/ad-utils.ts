import pool from './db';
import { AdCampaign, AdCampaignStatus, BillingPeriod, FrequencyType, MediaItem, MediaItemWithAd } from '@/types';

/**
 * Calculate total revenue for a campaign period
 * Simple fixed daily/monthly rate model
 */
export function calculateCampaignRevenue(
  startDate: Date,
  endDate: Date,
  dailyRate: number,
  billingPeriod: BillingPeriod
): number {
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  if (billingPeriod === 'monthly') {
    // For monthly, we calculate based on actual days
    return dailyRate * daysDiff;
  } else {
    // Daily rate: multiply by number of days
    return dailyRate * daysDiff;
  }
}

/**
 * Check if ad should be shown based on frequency configuration
 * Frequency is a display setting, not a billing cap
 */
export async function shouldShowAd(
  campaign: AdCampaign,
  kioskId: string,
  currentVideoIndex: number,
  totalVideosPlayed: number
): Promise<boolean> {
  switch (campaign.frequencyType) {
    case 'interval':
      // Show after every Nth video (e.g., after every 3rd video)
      // For frequencyValue = 1: show after videos 1, 2, 3, 4... (totalVideosPlayed = 1, 2, 3, 4...)
      // For frequencyValue = 3: show after videos 3, 6, 9... (totalVideosPlayed = 3, 6, 9...)
      // We want to show when: totalVideosPlayed > 0 AND totalVideosPlayed is a multiple of frequencyValue
      // But also consider: if we're at position i in playlist, and we've played i videos, check if ad should be next
      if (totalVideosPlayed === 0) return false;
      return (totalVideosPlayed % campaign.frequencyValue) === 0;
    
    case 'per_hour':
      // Check impressions in last hour
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const impressionsLastHour = await getImpressionCount(
        campaign.id, 
        kioskId, 
        hourAgo
      );
      return impressionsLastHour < campaign.frequencyValue;
    
    case 'per_day':
      // Check impressions today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const impressionsToday = await getImpressionCount(
        campaign.id, 
        kioskId, 
        today
      );
      return impressionsToday < campaign.frequencyValue;
    
    default:
      return true;
  }
}

/**
 * Get impression count for a campaign since a given date
 */
async function getImpressionCount(
  campaignId: number,
  kioskId: string,
  since: Date
): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) as count 
     FROM ad_impressions 
     WHERE campaign_id = $1 
     AND kiosk_id = $2 
     AND impression_time >= $3`,
    [campaignId, kioskId, since]
  );
  return parseInt(result.rows[0]?.count || '0', 10);
}

/**
 * Filter campaigns by scheduling rules (time of day, day of week)
 */
export async function filterBySchedule(
  campaigns: AdCampaign[],
  currentTime: Date
): Promise<AdCampaign[]> {
  const currentDay = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  const filtered: AdCampaign[] = [];

  for (const campaign of campaigns) {
    // If campaign has no schedules, it's valid for all times
    if (!campaign.schedules || campaign.schedules.length === 0) {
      filtered.push(campaign);
      continue;
    }

    // Check if any schedule matches current time
    const hasMatchingSchedule = campaign.schedules.some(schedule => {
      if (!schedule.isActive) return false;

      // Check day of week
      if (schedule.dayOfWeek && schedule.dayOfWeek !== currentDay) {
        return false;
      }

      // Check time window
      if (schedule.startTime && schedule.endTime) {
        const [startHour, startMin] = schedule.startTime.split(':').map(Number);
        const [endHour, endMin] = schedule.endTime.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        if (currentTimeMinutes < startMinutes || currentTimeMinutes > endMinutes) {
          return false;
        }
      }

      return true;
    });

    if (hasMatchingSchedule || campaign.displayType !== 'scheduled') {
      filtered.push(campaign);
    }
  }

  return filtered;
}

/**
 * Selects which ads to display based on various rules
 */
export async function selectAdsForPlaylist(
  regularMedia: MediaItem[],
  activeCampaigns: AdCampaign[],
  currentTime: Date,
  kioskId: string,
  currentVideoIndex: number,
  totalVideosPlayed: number
): Promise<MediaItemWithAd[]> {
  // 1. Filter active campaigns (date range, status = 'active')
  const active = activeCampaigns.filter(c => 
    c.status === 'active' &&
    currentTime >= new Date(c.startDate) &&
    currentTime <= new Date(c.endDate)
  );
  
  // 2. Apply scheduling rules (time of day, day of week)
  const scheduled = await filterBySchedule(active, currentTime);
  
  // 3. For interval-based ads, we need to build the playlist with ads inserted
  // For per_hour/per_day, we check frequency limits
  const intervalCampaigns: AdCampaign[] = [];
  const timeBasedCampaigns: AdCampaign[] = [];
  
  for (const campaign of scheduled) {
    if (campaign.frequencyType === 'interval') {
      intervalCampaigns.push(campaign);
    } else {
      // For per_hour and per_day, check if we should show now
      const shouldShow = await shouldShowAd(
        campaign, 
        kioskId, 
        currentVideoIndex,
        totalVideosPlayed
      );
      if (shouldShow) {
        timeBasedCampaigns.push(campaign);
      }
    }
  }
  
  // 4. Merge with regular media based on display type
  // For interval campaigns, we'll insert them based on frequency in mergeAdsWithMedia
  const allEligibleCampaigns = [...intervalCampaigns, ...timeBasedCampaigns];
  return mergeAdsWithMedia(regularMedia, allEligibleCampaigns, currentVideoIndex, totalVideosPlayed);
}

/**
 * Merge ads with regular media based on display type
 */
function mergeAdsWithMedia(
  regularMedia: MediaItem[],
  campaigns: AdCampaign[],
  currentVideoIndex: number,
  totalVideosPlayed: number = 0
): MediaItemWithAd[] {
  const merged: MediaItemWithAd[] = [];
  
  // Convert regular media to MediaItemWithAd
  const regularWithAd: MediaItemWithAd[] = regularMedia.map(item => ({
    ...item,
    isAd: false,
  }));

  // Group campaigns by display type
  const interstitialCampaigns = campaigns.filter(c => c.displayType === 'interstitial');
  const mixedCampaigns = campaigns.filter(c => c.displayType === 'mixed');
  const scheduledCampaigns = campaigns.filter(c => c.displayType === 'scheduled');

  // Handle interstitial ads
  if (interstitialCampaigns.length > 0) {
    // Sort by priority and frequency
    const sortedInterstitial = [...interstitialCampaigns].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.frequencyValue - b.frequencyValue;
    });
    
    for (let i = 0; i < regularWithAd.length; i++) {
      merged.push(regularWithAd[i]);
      
      // Check if we should insert an ad after this video
      // For frequencyValue = 1: insert after every video (i = 0, 1, 2, 3...)
      // For frequencyValue = 3: insert after videos at index 2, 5, 8... (every 3rd)
      // We insert after video at position i, so check if (i + 1) is a multiple of frequencyValue
      for (const campaign of sortedInterstitial) {
        const interval = campaign.frequencyValue || campaign.interstitialInterval || 3;
        // Insert ad after video if (i + 1) is a multiple of interval
        // For interval = 1: insert after videos 0, 1, 2, 3... (after every video)
        // For interval = 3: insert after videos 2, 5, 8... (after every 3rd video)
        if ((i + 1) % interval === 0 && campaign.media && campaign.media.length > 0) {
          // Get first media item from campaign (or rotate)
          const adMedia = campaign.media[0];
          merged.push({
            id: adMedia.id,
            title: adMedia.title,
            source: adMedia.source,
            type: adMedia.type,
            orderIndex: merged.length,
            createdAt: adMedia.createdAt,
            updatedAt: adMedia.updatedAt,
            isAd: true,
            adCampaignId: campaign.id,
            adMediaId: adMedia.id,
            adCampaignName: campaign.name,
          });
          break; // Only insert one ad per position
        }
      }
    }
  } else {
    // No interstitial ads, start with regular media
    merged.push(...regularWithAd);
  }

  // Handle mixed ads (interleave based on frequency and priority)
  if (mixedCampaigns.length > 0) {
    // Sort by priority (higher first), then by frequency (lower frequency = more frequent)
    const sortedCampaigns = [...mixedCampaigns].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.frequencyValue - b.frequencyValue;
    });
    
    // For mixed, we add ads between regular media items based on frequency
    const mixedResult: MediaItemWithAd[] = [];
    let campaignIndex = 0;
    
    for (let i = 0; i < merged.length; i++) {
      mixedResult.push(merged[i]);
      
      // Check each campaign to see if an ad should be inserted after this video
      // For frequencyValue = 1: insert after videos at index 0, 1, 2, 3... (after every video)
      // For frequencyValue = 3: insert after videos at index 2, 5, 8... (after every 3rd video)
      // We insert after video at position i, so check if (i + 1) is a multiple of frequencyValue
      for (const campaign of sortedCampaigns) {
        const interval = campaign.frequencyValue || 1;
        if ((i + 1) % interval === 0 && campaign.media && campaign.media.length > 0) {
          // Get media item from campaign (rotate through if multiple)
          const mediaIndex = campaignIndex % campaign.media.length;
          const adMedia = campaign.media[mediaIndex];
          mixedResult.push({
            id: adMedia.id,
            title: adMedia.title,
            source: adMedia.source,
            type: adMedia.type,
            orderIndex: mixedResult.length,
            createdAt: adMedia.createdAt,
            updatedAt: adMedia.updatedAt,
            isAd: true,
            adCampaignId: campaign.id,
            adMediaId: adMedia.id,
            adCampaignName: campaign.name,
          });
          campaignIndex++;
          break; // Only insert one ad per position
        }
      }
    }
    
    return mixedResult;
  }

  // Handle scheduled ads (already filtered, just add them)
  if (scheduledCampaigns.length > 0) {
    for (const campaign of scheduledCampaigns) {
      if (campaign.media && campaign.media.length > 0) {
        for (const adMedia of campaign.media) {
          merged.push({
            id: adMedia.id,
            title: adMedia.title,
            source: adMedia.source,
            type: adMedia.type,
            orderIndex: merged.length,
            createdAt: adMedia.createdAt,
            updatedAt: adMedia.updatedAt,
            isAd: true,
            adCampaignId: campaign.id,
            adMediaId: adMedia.id,
            adCampaignName: campaign.name,
          });
        }
      }
    }
  }

  return merged;
}

/**
 * Update campaign status based on dates
 */
export async function updateCampaignStatus(
  campaign: AdCampaign
): Promise<AdCampaignStatus> {
  const now = new Date();
  const startDate = new Date(campaign.startDate);
  const endDate = new Date(campaign.endDate);
  
  if (now < startDate) return 'pending';
  if (now > endDate) return 'expired';
  if (campaign.status === 'paused') return 'paused';
  if (campaign.status === 'rejected') return 'rejected';
  if (campaign.status === 'completed') return 'completed';
  
  return 'active';
}

