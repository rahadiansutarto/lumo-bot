import { readRosterFromSheets, getSheetsConfigFromEnv } from './src/services/googleSheets';
import { syncRosterToDatabase, initializeWeeklyTracking, getCurrentWeekId } from './src/db/weeklyCheckins';
import { initDatabase } from './src/db/postgres';
import 'dotenv/config';

async function sync() {
  try {
    console.log('🔄 Syncing roster to database...\n');
    
    // Initialize database connection
    initDatabase();
    
    // Read from sheets
    const config = getSheetsConfigFromEnv();
    const roster = await readRosterFromSheets(config);
    console.log(`✅ Read ${roster.length} employees from sheets`);
    
    // Sync to database
    await syncRosterToDatabase(roster);
    console.log('✅ Roster synced to database');
    
    // Initialize this week's tracking
    const weekId = getCurrentWeekId();
    await initializeWeeklyTracking(weekId);
    console.log(`✅ Week ${weekId} initialized`);
    
    console.log('\n🎉 Sync complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

sync();
