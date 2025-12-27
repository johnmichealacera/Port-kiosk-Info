import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { SystemSettings } from '@/types';

// Mapping between camelCase (TypeScript) and snake_case (database)
const SETTING_KEY_MAP: Record<string, string> = {
  systemName: 'system_name',
  logo: 'logo',
  portOfficeNumber: 'port_office_number',
  boardingTime: 'boarding_time',
  lastCallTime: 'last_call_time',
  fadeInterval: 'fade_interval',
  theme: 'theme',
};

const REVERSE_KEY_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(SETTING_KEY_MAP).map(([camel, snake]) => [snake, camel])
);

// Convert snake_case to camelCase
function toCamelCase(dbKey: string): string {
  return REVERSE_KEY_MAP[dbKey] || dbKey;
}

// Convert camelCase to snake_case
function toSnakeCase(tsKey: string): string {
  return SETTING_KEY_MAP[tsKey] || tsKey;
}

export async function GET() {
  try {
    const result = await pool.query('SELECT setting_key, setting_value FROM system_settings');
    
    const settings: Partial<SystemSettings> = {};
    result.rows.forEach((row: { setting_key: string; setting_value: string }) => {
      const camelKey = toCamelCase(row.setting_key) as keyof SystemSettings;
      const value = row.setting_value;
      
      // Parse numeric values
      if (camelKey === 'boardingTime' || camelKey === 'lastCallTime' || camelKey === 'fadeInterval') {
        settings[camelKey] = parseInt(value) || 30;
      } else {
        settings[camelKey] = value as any;
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
      const dbKey = toSnakeCase(key);
      return pool.query(
        `INSERT INTO system_settings (setting_key, setting_value, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (setting_key) 
         DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP`,
        [dbKey, String(value)]
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

