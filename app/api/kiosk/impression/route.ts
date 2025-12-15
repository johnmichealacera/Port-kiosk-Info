import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { CreateAdImpressionInput } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: CreateAdImpressionInput = await request.json();
    const {
      campaignId,
      adMediaId,
      kioskId = 'default',
      playDuration,
      completed = false,
      skipped = false,
    } = body;

    if (!campaignId || !adMediaId) {
      return NextResponse.json(
        { error: 'Campaign ID and ad media ID are required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO ad_impressions (
        campaign_id, ad_media_id, kiosk_id, impression_time, 
        play_duration, completed, skipped
      )
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6)
      RETURNING *`,
      [campaignId, adMediaId, kioskId, playDuration || null, completed, skipped]
    );

    const row = result.rows[0];
    const impression = {
      id: row.id,
      campaignId: row.campaign_id,
      adMediaId: row.ad_media_id,
      kioskId: row.kiosk_id,
      impressionTime: row.impression_time,
      playDuration: row.play_duration,
      completed: row.completed,
      skipped: row.skipped,
    };

    return NextResponse.json({ impression }, { status: 201 });
  } catch (error: any) {
    console.error('Error recording impression:', error);
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'Invalid campaign or media ID' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to record impression' },
      { status: 500 }
    );
  }
}
