import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { CreateAdCampaignInput, UpdateAdCampaignInput, AdCampaign } from '@/types';
import { calculateCampaignRevenue } from '@/lib/ad-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const advertiserId = searchParams.get('advertiserId');
    const date = searchParams.get('date'); // Filter by active on this date

    let query = `
      SELECT 
        c.*,
        a.company_name as advertiser_company_name,
        a.contact_name as advertiser_contact_name,
        a.email as advertiser_email
      FROM ad_campaigns c
      LEFT JOIN advertisers a ON c.advertiser_id = a.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND c.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (advertiserId) {
      query += ` AND c.advertiser_id = $${paramIndex}`;
      params.push(parseInt(advertiserId));
      paramIndex++;
    }

    if (date) {
      // Filter campaigns active on this date
      query += ` AND c.start_date <= $${paramIndex} AND c.end_date >= $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }

    query += ' ORDER BY c.created_at DESC';

    const result = await pool.query(query, params);

    const campaigns: AdCampaign[] = result.rows.map((row) => ({
      id: row.id,
      advertiserId: row.advertiser_id,
      advertiser: row.advertiser_company_name ? {
        id: row.advertiser_id,
        companyName: row.advertiser_company_name,
        contactName: row.advertiser_contact_name,
        email: row.advertiser_email,
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      } : undefined,
      name: row.name,
      description: row.description,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      dailyRate: parseFloat(row.daily_rate),
      monthlyRate: row.monthly_rate ? parseFloat(row.monthly_rate) : undefined,
      billingPeriod: row.billing_period,
      totalCost: row.total_cost ? parseFloat(row.total_cost) : undefined,
      priority: row.priority,
      frequencyType: row.frequency_type,
      frequencyValue: row.frequency_value,
      displayType: row.display_type,
      interstitialInterval: row.interstitial_interval,
      approvedAt: row.approved_at,
      approvedBy: row.approved_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateAdCampaignInput = await request.json();
    const {
      advertiserId,
      name,
      description,
      startDate,
      endDate,
      dailyRate,
      monthlyRate,
      billingPeriod = 'daily',
      priority = 5,
      frequencyType = 'interval',
      frequencyValue,
      displayType = 'mixed',
      interstitialInterval,
    } = body;

    if (!advertiserId || !name || !startDate || !endDate || !dailyRate || frequencyValue === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate total cost
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalCost = calculateCampaignRevenue(start, end, dailyRate, billingPeriod);

    // Calculate monthly rate if needed
    let calculatedMonthlyRate = monthlyRate;
    if (billingPeriod === 'monthly' && !monthlyRate) {
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      calculatedMonthlyRate = dailyRate * daysDiff;
    }

    const result = await pool.query(
      `INSERT INTO ad_campaigns (
        advertiser_id, name, description, status, start_date, end_date,
        daily_rate, monthly_rate, billing_period, total_cost,
        priority, frequency_type, frequency_value, display_type, interstitial_interval,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        advertiserId,
        name,
        description || null,
        'pending', // New campaigns start as pending
        startDate,
        endDate,
        dailyRate,
        calculatedMonthlyRate || null,
        billingPeriod,
        totalCost,
        priority,
        frequencyType,
        frequencyValue,
        displayType,
        interstitialInterval || null,
      ]
    );

    const row = result.rows[0];
    const campaign: AdCampaign = {
      id: row.id,
      advertiserId: row.advertiser_id,
      name: row.name,
      description: row.description,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      dailyRate: parseFloat(row.daily_rate),
      monthlyRate: row.monthly_rate ? parseFloat(row.monthly_rate) : undefined,
      billingPeriod: row.billing_period,
      totalCost: parseFloat(row.total_cost),
      priority: row.priority,
      frequencyType: row.frequency_type,
      frequencyValue: row.frequency_value,
      displayType: row.display_type,
      interstitialInterval: row.interstitial_interval,
      approvedAt: row.approved_at,
      approvedBy: row.approved_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating campaign:', error);
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'Invalid advertiser ID' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
