/**
 * Manual Test: Send Worker Reminder
 * 
 * Usage: bun run test-worker-reminder.ts YOUR_SLACK_ID
 */

import { App } from '@slack/bolt';
import { buildWorkerReminderMessage } from './src/slack/checkinBlocks';
import 'dotenv/config';

async function test() {
  const testSlackId = process.argv[2];
  
  if (!testSlackId || !testSlackId.startsWith('U')) {
    console.error('❌ Please provide a valid Slack ID');
    console.error('Usage: bun run test-worker-reminder.ts U01ABC123');
    process.exit(1);
  }
  
  console.log(`🧪 Sending test worker reminder to ${testSlackId}...\n`);
  
  const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
  });
  
  try {
    await app.start();
    console.log('✅ Slack app connected\n');
    
    const formUrl = process.env.WORKER_CHECKIN_FORM_URL || 'https://example.com';
    
    // Test all 4 primary message variants
    console.log('Sending primary reminder (variant 0)...');
    const message = buildWorkerReminderMessage(formUrl, 0);
    
    await app.client.chat.postMessage({
      channel: testSlackId,
      ...message,
    });
    
    console.log('✅ Test reminder sent successfully!');
    console.log('\nCheck your Slack DMs - you should see:');
    console.log('- A reminder message');
    console.log('- "Open Weekly Check-In Form" button');
    console.log('- "I\'ve completed it" button');
    
    await app.stop();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await app.stop();
    process.exit(1);
  }
}

test();
