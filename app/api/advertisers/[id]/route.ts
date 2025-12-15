import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { UpdateAdvertiserInput } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid advertiser ID' },
        { status: 400 }
      );
    }

    const result = await pool.query('SELECT * FROM advertisers WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Advertiser not found' },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    const advertiser = {
      id: row.id,
      companyName: row.company_name,
      contactName: row.contact_name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return NextResponse.json({ advertiser });
  } catch (error) {
    console.error('Error fetching advertiser:', error);
    return NextResponse.json(
      { error: 'Failed to fetch advertiser' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body: UpdateAdvertiserInput = await request.json();

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid advertiser ID' },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.companyName !== undefined) {
      updates.push(`company_name = $${paramIndex}`);
      values.push(body.companyName);
      paramIndex++;
    }
    if (body.contactName !== undefined) {
      updates.push(`contact_name = $${paramIndex}`);
      values.push(body.contactName);
      paramIndex++;
    }
    if (body.email !== undefined) {
      updates.push(`email = $${paramIndex}`);
      values.push(body.email);
      paramIndex++;
    }
    if (body.phone !== undefined) {
      updates.push(`phone = $${paramIndex}`);
      values.push(body.phone);
      paramIndex++;
    }
    if (body.address !== undefined) {
      updates.push(`address = $${paramIndex}`);
      values.push(body.address);
      paramIndex++;
    }
    if (body.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(body.status);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE advertisers 
      SET ${updates.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Advertiser not found' },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    const advertiser = {
      id: row.id,
      companyName: row.company_name,
      contactName: row.contact_name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return NextResponse.json({ advertiser });
  } catch (error: any) {
    console.error('Error updating advertiser:', error);
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update advertiser' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid advertiser ID' },
        { status: 400 }
      );
    }

    const result = await pool.query('DELETE FROM advertisers WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Advertiser not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Advertiser deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting advertiser:', error);
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'Cannot delete advertiser with active campaigns' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete advertiser' },
      { status: 500 }
    );
  }
}


