const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in environment variables');
  process.exit(1);
}

// Parse the DATABASE_URL to extract components
// Format: postgresql://user:password@host:port/database
const dbUrl = process.env.DATABASE_URL;
const urlMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);

if (!urlMatch) {
  console.error('❌ Invalid DATABASE_URL format');
  process.exit(1);
}

const [, username, password, host, port, dbName] = urlMatch;
const dbUrlWithoutDb = `postgresql://${username}:${password}@${host}:${port}/postgres`;

async function setupDatabase() {
  const adminClient = new Client({
    connectionString: dbUrlWithoutDb,
    ssl: false,
  });

  try {
    console.log('📦 Connecting to PostgreSQL server...');
    await adminClient.connect();

    // Check if database exists
    const result = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (result.rows.length > 0) {
      console.log(`✅ Database "${dbName}" already exists`);
    } else {
      console.log(`📝 Creating database "${dbName}"...`);
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database "${dbName}" created successfully!`);
    }

    await adminClient.end();
    console.log('✅ Database setup complete!\n');
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    await adminClient.end();
    process.exit(1);
  }
}

setupDatabase();

