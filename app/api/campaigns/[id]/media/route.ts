import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { CreateAdMediaInput, AdMedia } from '@/types';

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
      'SELECT * FROM ad_media WHERE campaign_id = $1 ORDER BY order_index, created_at ASC',
      [campaignId]
    );

    const media: AdMedia[] = result.rows.map((row) => ({
      id: row.id,
      campaignId: row.campaign_id,
      title: row.title,
      source: row.source,
      type: row.type,
      duration: row.duration,
      orderIndex: row.order_index,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ media });
  } catch (error) {
    console.error('Error fetching ad media:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ad media' },
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
    const body: CreateAdMediaInput = await request.json();
    const { title, source, type = 'url', duration } = body;

    if (isNaN(campaignId)) {
      return NextResponse.json(
        { error: 'Invalid campaign ID' },
        { status: 400 }
      );
    }

    if (!title || !source) {
      return NextResponse.json(
        { error: 'Title and source are required' },
        { status: 400 }
      );
    }

    // Get max order_index for this campaign
    const maxOrderResult = await pool.query(
      'SELECT COALESCE(MAX(order_index), 0) as max_order FROM ad_media WHERE campaign_id = $1',
      [campaignId]
    );
    const nextOrderIndex = (maxOrderResult.rows[0]?.max_order || 0) + 1;

    const result = await pool.query(
      `INSERT INTO ad_media (campaign_id, title, source, type, duration, order_index, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [campaignId, title, source, type, duration || null, nextOrderIndex]
    );

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

    return NextResponse.json({ media }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating ad media:', error);
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'Invalid campaign ID' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create ad media' },
      { status: 500 }
    );
  }
}
