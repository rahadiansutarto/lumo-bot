 /**
 * Manual Test: Send Manager Reminder
 * 
 * Usage: bun run test-manager-reminder.ts YOUR_SLACK_ID
 */

import { App } from '@slack/bolt';
import { buildManagerReminderMessage } from '../src/slack/checkinBlocks';
import 'dotenv/config';

async function test() {
  const testSlackId = process.argv[2];
  
  if (!testSlackId || !testSlackId.startsWith('U')) {
    console.error('❌ Please provide a valid Slack ID');
    console.error('Usage: bun run test-manager-reminder.ts U01ABC123');
    process.exit(1);
  }
  
  console.log(`🧪 Sending test manager reminder to ${testSlackId}...\n`);
  
  const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
  });
  
  try {
    await app.start();
    console.log('✅ Slack app connected\n');
    
    const formUrl = process.env.MANAGER_REVIEW_FORM_URL || 'https://example.com';
    
    console.log('Sending manager reminder (variant 0)...');
    const message = buildManagerReminderMessage(formUrl, 3, 0); // 3 direct reports
    
    await app.client.chat.postMessage({
      channel: testSlackId,
      ...message,
    });
    
    console.log('✅ Test reminder sent successfully!');
    console.log('\nCheck your Slack DMs - you should see:');
    console.log('- Manager review reminder');
    console.log('- "Direct Reports Submitted: 3"');
    console.log('- "Open Manager Review Form" button');
    console.log('- "I\'ve completed my reviews" button');
    
    await app.stop();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await app.stop();
    process.exit(1);
  }
}

test();
