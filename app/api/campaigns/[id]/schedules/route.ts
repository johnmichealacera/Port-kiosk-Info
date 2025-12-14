import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { CreateAdScheduleInput, AdSchedule } from '@/types';

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

    const result = await pool.query(
      'SELECT * FROM ad_schedules WHERE campaign_id = $1 ORDER BY created_at ASC',
      [campaignId]
    );

    const schedules: AdSchedule[] = result.rows.map((row) => ({
      id: row.id,
      campaignId: row.campaign_id,
      dayOfWeek: row.day_of_week,
      startTime: row.start_time,
      endTime: row.end_time,
      isActive: row.is_active,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error('Error fetching ad schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ad schedules' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = parseInt(params.id);
    const body: CreateAdScheduleInput = await request.json();
    const { dayOfWeek, startTime, endTime, isActive = true } = body;

    if (isNaN(campaignId)) {
      return NextResponse.json(
        { error: 'Invalid campaign ID' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO ad_schedules (campaign_id, day_of_week, start_time, end_time, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING *`,
      [campaignId, dayOfWeek || null, startTime || null, endTime || null, isActive]
    );

    const row = result.rows[0];
    const schedule: AdSchedule = {
      id: row.id,
      campaignId: row.campaign_id,
      dayOfWeek: row.day_of_week,
      startTime: row.start_time,
      endTime: row.end_time,
      isActive: row.is_active,
      createdAt: row.created_at,
    };

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating ad schedule:', error);
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'Invalid campaign ID' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create ad schedule' },
      { status: 500 }
    );
  }
}
