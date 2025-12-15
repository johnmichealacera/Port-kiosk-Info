import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getDayOfWeek, calculateScheduleStatus } from '@/lib/utils';
import { selectAdsForPlaylist } from '@/lib/ad-utils';
import { AdCampaign, MediaItemWithAd } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const kioskId = searchParams.get('kioskId') || 'default';

    // Get today's schedules
    const today = getDayOfWeek();
    console.log('🔍 Filtering schedules for day:', today);
    
    // Query schedules for today
    const schedulesResult = await pool.query(
      `SELECT * FROM schedules 
       WHERE $1 = ANY(days) 
       ORDER BY departure_time ASC`,
      [today]
    );
    
    console.log(`📅 Found ${schedulesResult.rows.length} schedules for ${today}`);
    
    // Debug: Log all schedules and their days
    if (schedulesResult.rows.length === 0) {
      const allSchedules = await pool.query('SELECT id, days, vessel FROM schedules');
      console.log('📋 All schedules in database:', allSchedules.rows);
    }

    // Get settings for status calculation
    const settingsResult = await pool.query(
      'SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ($1, $2)',
      ['boarding_time', 'last_call_time']
    );
    
    const settings: Record<string, number> = {};
    settingsResult.rows.forEach((row: { setting_key: string; setting_value: string }) => {
      settings[row.setting_key] = parseInt(row.setting_value) || 30;
    });

    // Calculate real-time status for each schedule
    const schedules = schedulesResult.rows.map((schedule) => {
      const scheduleData = {
        id: schedule.id,
        days: schedule.days,
        departureTime: schedule.departure_time,
        arrivalTime: schedule.arrival_time,
        timeDisplay: schedule.time_display,
        vessel: schedule.vessel,
        destination: schedule.destination,
        status: schedule.status,
        createdAt: schedule.created_at,
        updatedAt: schedule.updated_at,
        realTimeStatus: calculateScheduleStatus(
          { timeDisplay: schedule.time_display, status: schedule.status },
          settings.boarding_time || 30,
          settings.last_call_time || 5
        ),
      };
      return scheduleData;
    });

    // Get media playlist
    const mediaResult = await pool.query(
      'SELECT * FROM media_playlist ORDER BY order_index, created_at ASC'
    );
    
    // Map media from snake_case to camelCase
    const regularMedia = mediaResult.rows.map((row) => ({
      id: row.id,
      title: row.title,
      source: row.source,
      type: row.type,
      orderIndex: row.order_index,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    // Get video control state (needed for ad selection)
    const videoControlResult = await pool.query(
      'SELECT * FROM video_control WHERE kiosk_id = $1',
      [kioskId]
    );

    // Map video control from snake_case to camelCase
    let videoControl = null;
    if (videoControlResult.rows[0]) {
      const row = videoControlResult.rows[0];
      videoControl = {
        id: row.id,
        kioskId: row.kiosk_id,
        currentVideoIndex: row.current_video_index,
        isPlaying: row.is_playing,
        isLooping: row.is_looping,
        volume: row.volume,
        lastUpdated: row.last_updated,
      };
    }

    // Get current video index from video control to track total videos played
    const currentVideoIndex = videoControl?.currentVideoIndex || 0;

    // Get active campaigns with media and schedules
    const currentTime = new Date();
    const campaignsResult = await pool.query(
      `SELECT 
        c.*,
        a.company_name as advertiser_company_name
      FROM ad_campaigns c
      LEFT JOIN advertisers a ON c.advertiser_id = a.id
      WHERE c.status = 'active'
        AND c.start_date <= $1
        AND c.end_date >= $1
      ORDER BY c.priority DESC, c.created_at ASC`,
      [currentTime]
    );

    // Fetch media and schedules for each campaign
    const activeCampaigns: any[] = [];
    for (const row of campaignsResult.rows) {
      // Get media for this campaign
      const mediaResult = await pool.query(
        'SELECT * FROM ad_media WHERE campaign_id = $1 ORDER BY order_index, created_at ASC',
        [row.id]
      );

      // Get schedules for this campaign
      const schedulesResult = await pool.query(
        'SELECT * FROM ad_schedules WHERE campaign_id = $1 AND is_active = true',
        [row.id]
      );

      activeCampaigns.push({
        id: row.id,
        advertiserId: row.advertiser_id,
        advertiser: row.advertiser_company_name ? {
          id: row.advertiser_id,
          companyName: row.advertiser_company_name,
          status: 'active' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        } : undefined,
        name: row.name,
        description: row.description,
        status: row.status,
        startDate: row.start_date,
        endDate: row.end_date,
        dailyRate: parseFloat(row.daily_rate),
        monthlyRate: row.monthly_rate ? parseFloat(row.monthly_rate) : undefined,
        billingPeriod: row.billing_period,
        totalCost: row.total_cost ? parseFloat(row.total_cost) : undefined,
        priority: row.priority,
        frequencyType: row.frequency_type,
        frequencyValue: row.frequency_value,
        displayType: row.display_type,
        interstitialInterval: row.interstitial_interval,
        approvedAt: row.approved_at,
        approvedBy: row.approved_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        media: mediaResult.rows.map(m => ({
          id: m.id,
          campaignId: m.campaign_id,
          title: m.title,
          source: m.source,
          type: m.type,
          duration: m.duration,
          orderIndex: m.order_index,
          createdAt: m.created_at,
          updatedAt: m.updated_at,
        })),
        schedules: schedulesResult.rows.map(s => ({
          id: s.id,
          campaignId: s.campaign_id,
          dayOfWeek: s.day_of_week,
          startTime: s.start_time,
          endTime: s.end_time,
          isActive: s.is_active,
          createdAt: s.created_at,
        })),
      });
    }
    
    // Track total videos played (we'll estimate based on current index)
    // In a real implementation, you might want to track this separately
    const totalVideosPlayed = currentVideoIndex;

    // Merge ads with regular media
    const mergedMedia: MediaItemWithAd[] = await selectAdsForPlaylist(
      regularMedia,
      activeCampaigns,
      currentTime,
      kioskId,
      currentVideoIndex,
      totalVideosPlayed
    );

    // Debug logging
    console.log('📺 Media playlist:', {
      regularMediaCount: regularMedia.length,
      activeCampaignsCount: activeCampaigns.length,
      mergedMediaCount: mergedMedia.length,
      currentVideoIndex,
      totalVideosPlayed,
      adsInPlaylist: mergedMedia.filter(m => m.isAd).length,
      mediaBreakdown: mergedMedia.map((m, idx) => ({
        index: idx,
        title: m.title,
        isAd: m.isAd,
        campaignId: m.adCampaignId,
      })),
    });

    const media = mergedMedia;

    // Get system settings
    const systemSettingsResult = await pool.query(
      'SELECT setting_key, setting_value FROM system_settings'
    );
    const systemSettings: Record<string, string> = {};
    systemSettingsResult.rows.forEach((row: { setting_key: string; setting_value: string }) => {
      systemSettings[row.setting_key] = row.setting_value;
    });

    return NextResponse.json({
      schedules,
      media,
      videoControl,
      settings: systemSettings,
    });
  } catch (error) {
    console.error('Error fetching kiosk data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch kiosk data' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { kioskId = 'default', currentVideoIndex, isPlaying, isLooping, volume } = body;

    const result = await pool.query(
      `INSERT INTO video_control (kiosk_id, current_video_index, is_playing, is_looping, volume, last_updated)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (kiosk_id) 
       DO UPDATE SET 
         current_video_index = $2,
         is_playing = $3,
         is_looping = $4,
         volume = $5,
         last_updated = CURRENT_TIMESTAMP
       RETURNING *`,
      [kioskId, currentVideoIndex ?? 0, isPlaying ?? true, isLooping ?? false, volume ?? 80]
    );

    // Map response from snake_case to camelCase
    const row = result.rows[0];
    const videoControl = {
      id: row.id,
      kioskId: row.kiosk_id,
      currentVideoIndex: row.current_video_index,
      isPlaying: row.is_playing,
      isLooping: row.is_looping,
      volume: row.volume,
      lastUpdated: row.last_updated,
    };

    return NextResponse.json({ videoControl });
  } catch (error) {
    console.error('Error updating video control:', error);
    return NextResponse.json(
      { error: 'Failed to update video control' },
      { status: 500 }
    );
  }
}

