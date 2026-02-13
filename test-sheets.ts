import { readRosterFromSheets, getSheetsConfigFromEnv } from './src/services/googleSheets';
import 'dotenv/config';

async function test() {
  try {
    console.log('🔍 Testing Google Sheets connection...\n');
    
    const config = getSheetsConfigFromEnv();
    console.log('Configuration:');
    console.log('  Spreadsheet ID:', config.spreadsheet_id);
    console.log('  Roster tab:', config.roster_tab);
    console.log('  Worker tab:', config.worker_responses_tab);
    console.log('  Manager tab:', config.manager_responses_tab);
    console.log();
    
    console.log('📊 Reading roster from Google Sheets...');
    const roster = await readRosterFromSheets(config);
    
    console.log(`✅ Success! Found ${roster.length} employees\n`);
    
    if (roster.length > 0) {
      console.log('First 3 employees:');
      roster.slice(0, 3).forEach(emp => {
        console.log(`  - ${emp.employee_name}`);
        console.log(`     ${emp.employee_slack_id}`);
        console.log(`    Manager: ${emp.manager_name} (${emp.manager_slack_id})`);
        console.log();
      });
    } else {
      console.log('⚠️  Roster is empty - need to add employees!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure sheet is shared with service account');
    console.error('2. Check spreadsheet ID is correct');
    console.error('3. Check tab names match exactly (case-sensitive)');
    process.exit(1);
  }
}

test();
