import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { CreateMediaInput } from '@/types';

export async function GET() {
  try {
    const result = await pool.query(
      'SELECT * FROM media_playlist ORDER BY order_index, created_at ASC'
    );
    return NextResponse.json({ media: result.rows });
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateMediaInput = await request.json();
    const { title, source, type } = body;

    // Get max order_index
    const maxResult = await pool.query(
      'SELECT COALESCE(MAX(order_index), 0) as max_index FROM media_playlist'
    );
    const orderIndex = (maxResult.rows[0]?.max_index || 0) + 1;

    const result = await pool.query(
      `INSERT INTO media_playlist (title, source, type, order_index)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, source, type, orderIndex]
    );

    return NextResponse.json({ media: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating media:', error);
    return NextResponse.json(
      { error: 'Failed to create media' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }

    const result = await pool.query('DELETE FROM media_playlist WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Media deleted successfully' });
  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json(
      { error: 'Failed to delete media' },
      { status: 500 }
    );
  }
}

