/**
 * Setup script for Weekly Check-Ins database schema
 * 
 * Run this to create the necessary database tables for weekly check-ins.
 * 
 * Usage: bun run scripts/setup-weekly-checkins-db.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

// Load environment variables
import 'dotenv/config';

async function setupDatabase() {
  console.log('🔧 Setting up Weekly Check-Ins database schema...\n');
  
  // Create database connection
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'leave_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });
  
  try {
    // Test connection
    console.log('📡 Testing database connection...');
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Connected to database at:', testResult.rows[0].now);
    console.log();
    
    // Read weekly check-ins schema file (not the full schema.sql)
    const schemaPath = join(__dirname, '..', 'database', 'weekly-checkins-schema.sql');
    console.log('📄 Reading weekly check-ins schema from:', schemaPath);
    const schema = readFileSync(schemaPath, 'utf-8');
    
    // Execute schema
    console.log('🏗️  Creating weekly check-ins tables and views...');
    await pool.query(schema);
    console.log('✅ Schema executed successfully');
    console.log();
    
    // Verify tables were created
    console.log('🔍 Verifying weekly check-ins tables...');
    
    const tables = [
      'org_roster',
      'weekly_checkin_tracking',
      'checkin_message_variants',
      'sheets_sync_log',
    ];
    
    for (const table of tables) {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )`,
        [table]
      );
      
      if (result.rows[0].exists) {
        console.log(`  ✅ ${table}`);
      } else {
        console.log(`  ❌ ${table} - MISSING!`);
      }
    }
    
    console.log();
    
    // Show views
    console.log('🔍 Verifying views...');
    const views = [
      'current_week_pending_workers',
      'current_week_pending_managers',
      'weekly_compliance_summary',
    ];
    
    for (const view of views) {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.views 
          WHERE table_name = $1
        )`,
        [view]
      );
      
      if (result.rows[0].exists) {
        console.log(`  ✅ ${view}`);
      } else {
        console.log(`  ❌ ${view} - MISSING!`);
      }
    }
    
    console.log();
    console.log('✅ Weekly Check-Ins database setup complete!');
    console.log();
    console.log('📝 Next steps:');
    console.log('   1. Configure Google Sheets in .env:');
    console.log('      - GOOGLE_SERVICE_ACCOUNT_KEY');
    console.log('      - WEEKLY_CHECKINS_SPREADSHEET_ID');
    console.log('      - WORKER_CHECKIN_FORM_URL');
    console.log('      - MANAGER_REVIEW_FORM_URL');
    console.log('   2. Add leadership Slack IDs to .env');
    console.log('   3. Share the Google Sheet with the service account email');
    console.log('   4. Enable the system in slack-bot.ts');
    console.log();
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run setup
setupDatabase();
