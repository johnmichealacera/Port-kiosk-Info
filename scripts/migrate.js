const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Fallback to .env if .env.local doesn't exist
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in environment variables');
  console.error('Please create a .env.local file with: DATABASE_URL=postgresql://user:password@host:port/database');
  process.exit(1);
}

console.log('📦 Connecting to database...');
console.log('Database URL:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')); // Hide password in logs

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // Set to true if using SSL connection
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'port',
        permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create schedules table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id SERIAL PRIMARY KEY,
        days TEXT[] NOT NULL,
        departure_time TIME NOT NULL,
        arrival_time TIME NOT NULL,
        time_display VARCHAR(50) NOT NULL,
        vessel VARCHAR(255) NOT NULL,
        destination VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Ontime',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create media_playlist table
    await client.query(`
      CREATE TABLE IF NOT EXISTS media_playlist (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        source TEXT NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'url',
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create system_settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(255) UNIQUE NOT NULL,
        setting_value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create video_control table
    await client.query(`
      CREATE TABLE IF NOT EXISTS video_control (
        id SERIAL PRIMARY KEY,
        kiosk_id VARCHAR(255) DEFAULT 'default',
        current_video_index INTEGER DEFAULT 0,
        is_playing BOOLEAN DEFAULT true,
        is_looping BOOLEAN DEFAULT false,
        volume INTEGER DEFAULT 80,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(kiosk_id)
      )
    `);

    // Create advertisers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS advertisers (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        contact_name VARCHAR(255),
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create ad_campaigns table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ad_campaigns (
        id SERIAL PRIMARY KEY,
        advertiser_id INTEGER REFERENCES advertisers(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        daily_rate DECIMAL(10, 2) NOT NULL,
        monthly_rate DECIMAL(10, 2),
        billing_period VARCHAR(50) DEFAULT 'daily',
        total_cost DECIMAL(10, 2),
        priority INTEGER DEFAULT 5,
        frequency_type VARCHAR(50) DEFAULT 'interval',
        frequency_value INTEGER,
        display_type VARCHAR(50) DEFAULT 'mixed',
        interstitial_interval INTEGER,
        approved_at TIMESTAMP,
        approved_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create ad_schedules table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ad_schedules (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES ad_campaigns(id) ON DELETE CASCADE,
        day_of_week VARCHAR(20),
        start_time TIME,
        end_time TIME,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create ad_media table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ad_media (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES ad_campaigns(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        source TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'url',
        duration INTEGER,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create ad_impressions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ad_impressions (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES ad_campaigns(id) ON DELETE CASCADE,
        ad_media_id INTEGER REFERENCES ad_media(id) ON DELETE CASCADE,
        kiosk_id VARCHAR(255) DEFAULT 'default',
        impression_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        play_duration INTEGER,
        completed BOOLEAN DEFAULT false,
        skipped BOOLEAN DEFAULT false
      )
    `);

    // Create ad_revenue table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ad_revenue (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES ad_campaigns(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        impressions INTEGER DEFAULT 0,
        revenue DECIMAL(10, 2) DEFAULT 0,
        revenue_model VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for ads tables
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_schedules_days ON schedules USING GIN(days)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_media_order ON media_playlist(order_index)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns(status)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ad_campaigns_dates ON ad_campaigns(start_date, end_date)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ad_campaigns_advertiser ON ad_campaigns(advertiser_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ad_impressions_campaign ON ad_impressions(campaign_id, impression_time)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ad_impressions_kiosk ON ad_impressions(kiosk_id, impression_time)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ad_impressions_media ON ad_impressions(ad_media_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ad_schedules_campaign ON ad_schedules(campaign_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ad_media_campaign ON ad_media(campaign_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ad_revenue_campaign ON ad_revenue(campaign_id, date)
    `);

    // Insert default admin user (password: admin123)
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    await client.query(
      `INSERT INTO users (username, password_hash, role, permissions)
       VALUES ($1, $2, 'admin', ARRAY['schedules', 'media', 'settings'])
       ON CONFLICT (username) DO NOTHING`,
      ['admin', adminPasswordHash]
    );

    // Insert default settings
    await client.query(`
      INSERT INTO system_settings (setting_key, setting_value)
      VALUES
        ('system_name', 'Socorro Feeder Port'),
        ('logo', ''),
        ('port_office_number', '+63 123 456 7890'),
        ('boarding_time', '30'),
        ('last_call_time', '5'),
        ('fade_interval', '5'),
        ('theme', 'windows-glass'),
        ('ads_enabled', 'true'),
        ('ads_default_priority', '5'),
        ('ads_interstitial_interval', '3')
      ON CONFLICT (setting_key) DO NOTHING
    `);

    await client.query('COMMIT');
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);

