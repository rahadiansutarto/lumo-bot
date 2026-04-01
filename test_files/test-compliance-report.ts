/**
 * Manual Test: Send Compliance Report
 * 
 * Usage: bun run test-compliance-report.ts YOUR_SLACK_ID
 */

import { App } from '@slack/bolt';
import { buildComplianceReportMessage } from '../src/slack/checkinBlocks';
import { generateComplianceReport, getCurrentWeekId } from '../src/db/weeklyCheckins';
import { initDatabase } from '../src/db/postgres';
import 'dotenv/config';

async function test() {
  const testSlackId = process.argv[2];
  
  if (!testSlackId || !testSlackId.startsWith('U')) {
    console.error('❌ Please provide a valid Slack ID');
    console.error('Usage: bun run test-compliance-report.ts U01ABC123');
    process.exit(1);
  }
  
  console.log(`🧪 Generating and sending compliance report to ${testSlackId}...\n`);
  
  const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
  });
  
  try {
    await app.start();
    console.log('✅ Slack app connected');
    
    // Initialize database
    initDatabase();
    console.log('✅ Database connected\n');
    
    // Generate report
    const weekId = getCurrentWeekId();
    console.log(`Generating report for week ${weekId}...`);
    const report = await generateComplianceReport(weekId);
    
    console.log('\nReport summary:');
    console.log(`  Workers: ${report.workers_completed_on_time}/${report.workers_total} on time`);
    console.log(`  Managers: ${report.managers_completed_on_time}/${report.managers_total} on time`);
    console.log(`  Repeat defaulters: ${report.repeat_defaulters.length}`);
    console.log();
    
    const message = buildComplianceReportMessage(report, [testSlackId]);
    
    await app.client.chat.postMessage({
      channel: testSlackId,
      ...message,
    });
    
    console.log('✅ Compliance report sent successfully!');
    console.log('Check your Slack DMs for the report.');
    
    await app.stop();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await app.stop();
    process.exit(1);
  }
}

test();
