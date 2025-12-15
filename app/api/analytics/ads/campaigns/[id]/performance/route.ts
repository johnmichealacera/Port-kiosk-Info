import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = parseInt(params.id);

    if (isNaN(campaignId)) {
      return NextResponse.json(
        { error: 'Invalid campaign ID' },
        { status: 400 }
      );
    }

    // Get campaign details
    const campaignResult = await pool.query(
      `SELECT 
        c.*,
        a.company_name as advertiser_name
      FROM ad_campaigns c
      LEFT JOIN advertisers a ON c.advertiser_id = a.id
      WHERE c.id = $1`,
      [campaignId]
    );

    if (campaignResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const campaign = campaignResult.rows[0];

    // Get impression statistics
    const impressionsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_impressions,
        COUNT(DISTINCT kiosk_id) as unique_kiosks,
        COUNT(DISTINCT ad_media_id) as unique_media,
        SUM(CASE WHEN completed = true THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN skipped = true THEN 1 ELSE 0 END) as skipped_count,
        AVG(play_duration) as avg_duration,
        MIN(impression_time) as first_impression,
        MAX(impression_time) as last_impression
      FROM ad_impressions
      WHERE campaign_id = $1`,
      [campaignId]
    );

    const stats = impressionsResult.rows[0] || {
      total_impressions: 0,
      unique_kiosks: 0,
      unique_media: 0,
      completed_count: 0,
      skipped_count: 0,
      avg_duration: 0,
      first_impression: null,
      last_impression: null,
    };

    // Get impressions by day
    const dailyImpressionsResult = await pool.query(
      `SELECT 
        DATE(impression_time) as date,
        COUNT(*) as impressions,
        SUM(CASE WHEN completed = true THEN 1 ELSE 0 END) as completed
      FROM ad_impressions
      WHERE campaign_id = $1
      GROUP BY DATE(impression_time)
      ORDER BY date DESC
      LIMIT 30`,
      [campaignId]
    );

    const dailyImpressions = dailyImpressionsResult.rows.map((row) => ({
      date: row.date,
      impressions: parseInt(row.impressions) || 0,
      completed: parseInt(row.completed) || 0,
    }));

    // Get impressions by media
    const mediaImpressionsResult = await pool.query(
      `SELECT 
        m.id,
        m.title,
        COUNT(i.id) as impressions,
        SUM(CASE WHEN i.completed = true THEN 1 ELSE 0 END) as completed
      FROM ad_media m
      LEFT JOIN ad_impressions i ON m.id = i.ad_media_id
      WHERE m.campaign_id = $1
      GROUP BY m.id, m.title
      ORDER BY impressions DESC`,
      [campaignId]
    );

    const mediaImpressions = mediaImpressionsResult.rows.map((row) => ({
      mediaId: row.id,
      title: row.title,
      impressions: parseInt(row.impressions) || 0,
      completed: parseInt(row.completed) || 0,
    }));

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        advertiserName: campaign.advertiser_name,
        status: campaign.status,
        startDate: campaign.start_date,
        endDate: campaign.end_date,
        dailyRate: parseFloat(campaign.daily_rate),
        totalCost: parseFloat(campaign.total_cost),
      },
      statistics: {
        totalImpressions: parseInt(stats.total_impressions) || 0,
        uniqueKiosks: parseInt(stats.unique_kiosks) || 0,
        uniqueMedia: parseInt(stats.unique_media) || 0,
        completedImpressions: parseInt(stats.completed_count) || 0,
        skippedImpressions: parseInt(stats.skipped_count) || 0,
        avgPlayDuration: parseFloat(stats.avg_duration) || 0,
        firstImpression: stats.first_impression,
        lastImpression: stats.last_impression,
      },
      dailyImpressions,
      mediaImpressions,
    });
  } catch (error) {
    console.error('Error fetching campaign performance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign performance' },
      { status: 500 }
    );
  }
}
