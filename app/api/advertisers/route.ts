import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { CreateAdvertiserInput, UpdateAdvertiserInput } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = 'SELECT * FROM advertisers WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      query += ` AND (company_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR contact_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    const advertisers = result.rows.map((row) => ({
      id: row.id,
      companyName: row.company_name,
      contactName: row.contact_name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ advertisers });
  } catch (error) {
    console.error('Error fetching advertisers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch advertisers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateAdvertiserInput = await request.json();
    const { companyName, contactName, email, phone, address, status = 'active' } = body;

    if (!companyName || !email) {
      return NextResponse.json(
        { error: 'Company name and email are required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO advertisers (company_name, contact_name, email, phone, address, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [companyName, contactName || null, email, phone || null, address || null, status]
    );

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

    return NextResponse.json({ advertiser }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating advertiser:', error);
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create advertiser' },
      { status: 500 }
    );
  }
}


