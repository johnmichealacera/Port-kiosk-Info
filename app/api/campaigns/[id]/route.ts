import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { UpdateAdCampaignInput, AdCampaign } from '@/types';
import { calculateCampaignRevenue } from '@/lib/ad-utils';

export async function GET(
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

    // Get campaign with advertiser info
    const campaignResult = await pool.query(
      `SELECT 
        c.*,
        a.company_name as advertiser_company_name,
        a.contact_name as advertiser_contact_name,
        a.email as advertiser_email
      FROM ad_campaigns c
      LEFT JOIN advertisers a ON c.advertiser_id = a.id
      WHERE c.id = $1`,
      [id]
    );

    if (campaignResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const row = campaignResult.rows[0];

    // Get media for this campaign
    const mediaResult = await pool.query(
      'SELECT * FROM ad_media WHERE campaign_id = $1 ORDER BY order_index, created_at ASC',
      [id]
    );

    // Get schedules for this campaign
    const schedulesResult = await pool.query(
      'SELECT * FROM ad_schedules WHERE campaign_id = $1 ORDER BY created_at ASC',
      [id]
    );

    const campaign: AdCampaign = {
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
      media: mediaResult.rows.map(m => ({
        id: m.id,
        campaignId: m.campaign_id,
        title: m.title,
        source: m.source,
        type: m.type,
        duration: m.duration,
        orderIndex: m.order_index,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      })),
      schedules: schedulesResult.rows.map(s => ({
        id: s.id,
        campaignId: s.campaign_id,
        dayOfWeek: s.day_of_week,
        startTime: s.start_time,
        endTime: s.end_time,
        isActive: s.is_active,
        createdAt: s.created_at,
      })),
    };

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
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
    const body: UpdateAdCampaignInput = await request.json();

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid campaign ID' },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(body.name);
      paramIndex++;
    }
    if (body.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(body.description);
      paramIndex++;
    }
    if (body.startDate !== undefined) {
      updates.push(`start_date = $${paramIndex}`);
      values.push(body.startDate);
      paramIndex++;
    }
    if (body.endDate !== undefined) {
      updates.push(`end_date = $${paramIndex}`);
      values.push(body.endDate);
      paramIndex++;
    }
    if (body.dailyRate !== undefined) {
      updates.push(`daily_rate = $${paramIndex}`);
      values.push(body.dailyRate);
      paramIndex++;
    }
    if (body.monthlyRate !== undefined) {
      updates.push(`monthly_rate = $${paramIndex}`);
      values.push(body.monthlyRate);
      paramIndex++;
    }
    if (body.billingPeriod !== undefined) {
      updates.push(`billing_period = $${paramIndex}`);
      values.push(body.billingPeriod);
      paramIndex++;
    }
    if (body.priority !== undefined) {
      updates.push(`priority = $${paramIndex}`);
      values.push(body.priority);
      paramIndex++;
    }
    if (body.frequencyType !== undefined) {
      updates.push(`frequency_type = $${paramIndex}`);
      values.push(body.frequencyType);
      paramIndex++;
    }
    if (body.frequencyValue !== undefined) {
      updates.push(`frequency_value = $${paramIndex}`);
      values.push(body.frequencyValue);
      paramIndex++;
    }
    if (body.displayType !== undefined) {
      updates.push(`display_type = $${paramIndex}`);
      values.push(body.displayType);
      paramIndex++;
    }
    if (body.interstitialInterval !== undefined) {
      updates.push(`interstitial_interval = $${paramIndex}`);
      values.push(body.interstitialInterval);
      paramIndex++;
    }

    // Recalculate total cost if dates or rates changed
    if (body.startDate !== undefined || body.endDate !== undefined || body.dailyRate !== undefined || body.billingPeriod !== undefined) {
      // Get current campaign to calculate new total
      const currentResult = await pool.query('SELECT start_date, end_date, daily_rate, billing_period FROM ad_campaigns WHERE id = $1', [id]);
      if (currentResult.rows.length > 0) {
        const current = currentResult.rows[0];
        const startDate = body.startDate ? new Date(body.startDate) : new Date(current.start_date);
        const endDate = body.endDate ? new Date(body.endDate) : new Date(current.end_date);
        const dailyRate = body.dailyRate ?? parseFloat(current.daily_rate);
        const billingPeriod = body.billingPeriod ?? current.billing_period;
        const totalCost = calculateCampaignRevenue(startDate, endDate, dailyRate, billingPeriod);
        updates.push(`total_cost = $${paramIndex}`);
        values.push(totalCost);
        paramIndex++;
      }
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
      UPDATE ad_campaigns 
      SET ${updates.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Campaign not found' },
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
  } catch (error: any) {
    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to update campaign' },
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
        { error: 'Invalid campaign ID' },
        { status: 400 }
      );
    }

    const result = await pool.query('DELETE FROM ad_campaigns WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Campaign deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
