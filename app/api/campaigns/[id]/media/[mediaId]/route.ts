import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { AdMedia } from '@/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; mediaId: string } }
) {
  try {
    const campaignId = parseInt(params.id);
    const mediaId = parseInt(params.mediaId);
    const body = await request.json();

    if (isNaN(campaignId) || isNaN(mediaId)) {
      return NextResponse.json(
        { error: 'Invalid campaign or media ID' },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      values.push(body.title);
      paramIndex++;
    }
    if (body.source !== undefined) {
      updates.push(`source = $${paramIndex}`);
      values.push(body.source);
      paramIndex++;
    }
    if (body.type !== undefined) {
      updates.push(`type = $${paramIndex}`);
      values.push(body.type);
      paramIndex++;
    }
    if (body.duration !== undefined) {
      updates.push(`duration = $${paramIndex}`);
      values.push(body.duration);
      paramIndex++;
    }
    if (body.orderIndex !== undefined) {
      updates.push(`order_index = $${paramIndex}`);
      values.push(body.orderIndex);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(campaignId, mediaId);

    const query = `
      UPDATE ad_media 
      SET ${updates.join(', ')} 
      WHERE campaign_id = $${paramIndex} AND id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    const media: AdMedia = {
      id: row.id,
      campaignId: row.campaign_id,
      title: row.title,
      source: row.source,
      type: row.type,
      duration: row.duration,
      orderIndex: row.order_index,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return NextResponse.json({ media });
  } catch (error) {
    console.error('Error updating ad media:', error);
    return NextResponse.json(
      { error: 'Failed to update ad media' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; mediaId: string } }
) {
  try {
    const campaignId = parseInt(params.id);
    const mediaId = parseInt(params.mediaId);

    if (isNaN(campaignId) || isNaN(mediaId)) {
      return NextResponse.json(
        { error: 'Invalid campaign or media ID' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      'DELETE FROM ad_media WHERE campaign_id = $1 AND id = $2 RETURNING *',
      [campaignId, mediaId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Media deleted successfully' });
  } catch (error) {
    console.error('Error deleting ad media:', error);
    return NextResponse.json(
      { error: 'Failed to delete ad media' },
      { status: 500 }
    );
  }
}
