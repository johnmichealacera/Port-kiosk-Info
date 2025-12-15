import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const campaignId = searchParams.get('campaignId');

    let query = `
      SELECT 
        c.id as campaign_id,
        c.name as campaign_name,
        c.start_date,
        c.end_date,
        c.daily_rate,
        c.billing_period,
        c.total_cost,
        a.company_name as advertiser_name,
        COUNT(DISTINCT i.id) as total_impressions
      FROM ad_campaigns c
      LEFT JOIN advertisers a ON c.advertiser_id = a.id
      LEFT JOIN ad_impressions i ON c.id = i.campaign_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (campaignId) {
      query += ` AND c.id = $${paramIndex}`;
      params.push(parseInt(campaignId));
      paramIndex++;
    }

    if (startDate) {
      query += ` AND c.start_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND c.end_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += `
      GROUP BY c.id, c.name, c.start_date, c.end_date, c.daily_rate, c.billing_period, c.total_cost, a.company_name
      ORDER BY c.created_at DESC
    `;

    const result = await pool.query(query, params);

    const revenue = result.rows.map((row) => ({
      campaignId: row.campaign_id,
      campaignName: row.name,
      advertiserName: row.advertiser_name,
      startDate: row.start_date,
      endDate: row.end_date,
      dailyRate: parseFloat(row.daily_rate),
      billingPeriod: row.billing_period,
      totalCost: parseFloat(row.total_cost),
      totalImpressions: parseInt(row.total_impressions) || 0,
    }));

    // Calculate total revenue
    const totalRevenue = revenue.reduce((sum, r) => sum + (r.totalCost || 0), 0);

    return NextResponse.json({
      revenue,
      totalRevenue,
    });
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revenue data' },
      { status: 500 }
    );
  }
}
