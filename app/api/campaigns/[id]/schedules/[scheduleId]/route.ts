import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { AdSchedule } from '@/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; scheduleId: string } }
) {
  try {
    const campaignId = parseInt(params.id);
    const scheduleId = parseInt(params.scheduleId);
    const body = await request.json();

    if (isNaN(campaignId) || isNaN(scheduleId)) {
      return NextResponse.json(
        { error: 'Invalid campaign or schedule ID' },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.dayOfWeek !== undefined) {
      updates.push(`day_of_week = $${paramIndex}`);
      values.push(body.dayOfWeek);
      paramIndex++;
    }
    if (body.startTime !== undefined) {
      updates.push(`start_time = $${paramIndex}`);
      values.push(body.startTime);
      paramIndex++;
    }
    if (body.endTime !== undefined) {
      updates.push(`end_time = $${paramIndex}`);
      values.push(body.endTime);
      paramIndex++;
    }
    if (body.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(body.isActive);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    values.push(campaignId, scheduleId);

    const query = `
      UPDATE ad_schedules 
      SET ${updates.join(', ')} 
      WHERE campaign_id = $${paramIndex} AND id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

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

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error('Error updating ad schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update ad schedule' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; scheduleId: string } }
) {
  try {
    const campaignId = parseInt(params.id);
    const scheduleId = parseInt(params.scheduleId);

    if (isNaN(campaignId) || isNaN(scheduleId)) {
      return NextResponse.json(
        { error: 'Invalid campaign or schedule ID' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      'DELETE FROM ad_schedules WHERE campaign_id = $1 AND id = $2 RETURNING *',
      [campaignId, scheduleId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting ad schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete ad schedule' },
      { status: 500 }
    );
  }
}
