import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { SystemSettings } from '@/types';

export async function GET() {
  try {
    const result = await pool.query('SELECT setting_key, setting_value FROM system_settings');
    
    const settings: Partial<SystemSettings> = {};
    result.rows.forEach((row: { setting_key: string; setting_value: string }) => {
      const key = row.setting_key as keyof SystemSettings;
      const value = row.setting_value;
      
      // Parse numeric values
      if (key === 'boardingTime' || key === 'lastCallTime' || key === 'fadeInterval') {
        settings[key] = parseInt(value) || 30;
      } else {
        settings[key] = value as any;
      }
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: Partial<SystemSettings> = await request.json();

    const updates = Object.entries(body).map(([key, value]) => {
      return pool.query(
        `INSERT INTO system_settings (setting_key, setting_value, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (setting_key) 
         DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP`,
        [key, String(value)]
      );
    });

    await Promise.all(updates);

    return NextResponse.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

