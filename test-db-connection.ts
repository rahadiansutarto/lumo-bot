/**
 * Quick test to verify PostgreSQL connection
 * Run: bun run test-db-connection.ts
 */

import { Client } from 'pg';
import "dotenv/config";

async function testConnection() {
  console.log('Testing PostgreSQL connection...\n');
  
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'leave_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });
  
  try {
    console.log('Connecting...');
    await client.connect();
    console.log('✅ Connected!\n');
    
    // Test query
    console.log('Testing query...');
    const result = await client.query('SELECT NOW()');
    console.log('✅ Query successful!');
    console.log('Current time:', result.rows[0].now, '\n');
    
    // Check tables
    console.log('Checking tables...');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('✅ Tables found:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    console.log('\n🎉 Database is ready!');
    
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error(error);
    console.error('\nTroubleshooting:');
    console.error('1. Check Docker container is running: docker ps');
    console.error('2. Check .env file has correct password');
    console.error('3. Try: docker restart leave-postgres');
  } finally {
    await client.end();
  }
}

testConnection();
