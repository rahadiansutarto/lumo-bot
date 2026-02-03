/**
 * Database setup script
 * 
 * Run with: bun run scripts/setup-database.ts
 */

import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

async function setupDatabase() {
  console.log('Setting up leave management database...\n');
  
  // Get database config from environment
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'leave_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  };
  
  console.log('Database configuration:');
  console.log(`  Host: ${config.host}`);
  console.log(`  Port: ${config.port}`);
  console.log(`  Database: ${config.database}`);
  console.log(`  User: ${config.user}\n`);
  
  const client = new Client(config);
  
  try {
    // Connect to database
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!\n');
    
    // Read schema file
    console.log('Reading schema file...');
    const schemaPath = join(__dirname, '../database/schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    console.log('Schema loaded!\n');
    
    // Execute schema
    console.log('Executing schema...');
    await client.query(schema);
    console.log('Schema executed successfully!\n');
    
    // Verify tables were created
    console.log('Verifying tables...');
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('Tables created:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    console.log('\nDatabase setup complete!');
    console.log('\nNext steps:');
    console.log('1. Update .env with manager Slack IDs');
    console.log('2. Update database with actual manager IDs:');
    console.log('   psql leave_management');
    console.log('   UPDATE user_roles SET slack_user_id = \'U123...\' WHERE full_name = \'Axel\';');
    console.log('3. Start the bot: bun start');
    
  } catch (error) {
    console.error('\nError setting up database:');
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run setup
setupDatabase();
