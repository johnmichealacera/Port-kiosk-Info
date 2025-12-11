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

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_schedules_days ON schedules USING GIN(days)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_media_order ON media_playlist(order_index)
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
        ('boarding_time', '30'),
        ('last_call_time', '5'),
        ('fade_interval', '5'),
        ('theme', 'windows-glass')
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

