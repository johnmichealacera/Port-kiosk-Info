import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { formatTime24to12 } from '@/lib/utils';
import { CreateScheduleInput, UpdateScheduleInput } from '@/types';

export async function GET() {
  try {
    const result = await pool.query(
      'SELECT * FROM schedules ORDER BY departure_time, created_at DESC'
    );
    return NextResponse.json({ schedules: result.rows });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateScheduleInput = await request.json();
    const { days, departureTime, arrivalTime, vessel, destination, status } = body;

    const timeDisplay = `${formatTime24to12(departureTime)} - ${formatTime24to12(arrivalTime)}`;

    const result = await pool.query(
      `INSERT INTO schedules (days, departure_time, arrival_time, time_display, vessel, destination, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [days, departureTime, arrivalTime, timeDisplay, vessel, destination, status]
    );

    return NextResponse.json({ schedule: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to create schedule' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: UpdateScheduleInput = await request.json();
    const { id, days, departureTime, arrivalTime, vessel, destination, status } = body;

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (days) {
      updates.push(`days = $${paramCount++}`);
      values.push(days);
    }
    if (departureTime) {
      updates.push(`departure_time = $${paramCount++}`);
      values.push(departureTime);
    }
    if (arrivalTime) {
      updates.push(`arrival_time = $${paramCount++}`);
      values.push(arrivalTime);
    }
    if (vessel) {
      updates.push(`vessel = $${paramCount++}`);
      values.push(vessel);
    }
    if (destination) {
      updates.push(`destination = $${paramCount++}`);
      values.push(destination);
    }
    if (status) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }

    if (departureTime || arrivalTime) {
      const depTime = departureTime || (await pool.query('SELECT departure_time FROM schedules WHERE id = $1', [id])).rows[0]?.departure_time;
      const arrTime = arrivalTime || (await pool.query('SELECT arrival_time FROM schedules WHERE id = $1', [id])).rows[0]?.arrival_time;
      updates.push(`time_display = $${paramCount++}`);
      values.push(`${formatTime24to12(depTime)} - ${formatTime24to12(arrTime)}`);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE schedules SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json({ schedule: result.rows[0] });
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 });
    }

    const result = await pool.query('DELETE FROM schedules WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete schedule' },
      { status: 500 }
    );
  }
}

