import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const kioskId = searchParams.get('kioskId');

    // Get impressions
    let impressionsQuery = `
      SELECT 
        i.*,
        c.name as campaign_name,
        m.title as media_title
      FROM ad_impressions i
      LEFT JOIN ad_campaigns c ON i.campaign_id = c.id
      LEFT JOIN ad_media m ON i.ad_media_id = m.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (campaignId) {
      impressionsQuery += ` AND i.campaign_id = $${paramIndex}`;
      params.push(parseInt(campaignId));
      paramIndex++;
    }

    if (startDate) {
      impressionsQuery += ` AND i.impression_time >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      impressionsQuery += ` AND i.impression_time <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    if (kioskId) {
      impressionsQuery += ` AND i.kiosk_id = $${paramIndex}`;
      params.push(kioskId);
      paramIndex++;
    }

    impressionsQuery += ' ORDER BY i.impression_time DESC';

    const impressionsResult = await pool.query(impressionsQuery, params);

    const impressions = impressionsResult.rows.map((row) => ({
      id: row.id,
      campaignId: row.campaign_id,
      adMediaId: row.ad_media_id,
      kioskId: row.kiosk_id,
      impressionTime: row.impression_time,
      playDuration: row.play_duration,
      completed: row.completed,
      skipped: row.skipped,
      campaignName: row.campaign_name,
      mediaTitle: row.media_title,
    }));

    // Get summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_impressions,
        COUNT(DISTINCT campaign_id) as unique_campaigns,
        COUNT(DISTINCT kiosk_id) as unique_kiosks,
        SUM(CASE WHEN completed = true THEN 1 ELSE 0 END) as completed_impressions,
        SUM(CASE WHEN skipped = true THEN 1 ELSE 0 END) as skipped_impressions,
        AVG(play_duration) as avg_play_duration
      FROM ad_impressions
      WHERE 1=1
      ${campaignId ? `AND campaign_id = $${params.length + 1}` : ''}
      ${startDate ? `AND impression_time >= $${params.length + (campaignId ? 2 : 1)}` : ''}
      ${endDate ? `AND impression_time <= $${params.length + (campaignId ? 2 : 1) + (startDate ? 1 : 0)}` : ''}
      ${kioskId ? `AND kiosk_id = $${params.length + (campaignId ? 2 : 1) + (startDate ? 1 : 0) + (endDate ? 1 : 0)}` : ''}
    `;

    const summaryParams: any[] = [];
    if (campaignId) summaryParams.push(parseInt(campaignId));
    if (startDate) summaryParams.push(startDate);
    if (endDate) summaryParams.push(endDate);
    if (kioskId) summaryParams.push(kioskId);

    const summaryResult = await pool.query(summaryQuery, summaryParams);
    const summary = summaryResult.rows[0] || {
      total_impressions: 0,
      unique_campaigns: 0,
      unique_kiosks: 0,
      completed_impressions: 0,
      skipped_impressions: 0,
      avg_play_duration: 0,
    };

    return NextResponse.json({
      impressions,
      summary: {
        totalImpressions: parseInt(summary.total_impressions) || 0,
        uniqueCampaigns: parseInt(summary.unique_campaigns) || 0,
        uniqueKiosks: parseInt(summary.unique_kiosks) || 0,
        completedImpressions: parseInt(summary.completed_impressions) || 0,
        skippedImpressions: parseInt(summary.skipped_impressions) || 0,
        avgPlayDuration: parseFloat(summary.avg_play_duration) || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching ad analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ad analytics' },
      { status: 500 }
    );
  }
}
