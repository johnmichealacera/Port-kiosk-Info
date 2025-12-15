import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { AdCampaign } from '@/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid campaign ID' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `UPDATE ad_campaigns 
       SET status = 'paused', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'active'
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Campaign not found or not active' },
        { status: 404 }
      );
    }

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

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Error pausing campaign:', error);
    return NextResponse.json(
      { error: 'Failed to pause campaign' },
      { status: 500 }
    );
  }
}
