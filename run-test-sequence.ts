/**
 * Run Full Test Sequence
 * 
 * Sends all reminders to your Slack ID over 7 minutes
 * 
 * Usage: bun run run-test-sequence.ts YOUR_SLACK_ID
 */

import { App } from '@slack/bolt';
import { initDatabase } from './src/db/postgres';
import { setCheckinSlackApp } from './src/jobs/checkinQueue';
import { 
  buildWorkerReminderMessage, 
  buildWorkerNudgeMessage,
  buildManagerReminderMessage,
  buildManagerNudgeMessage,
  buildWorkerConfirmationMessage,
  buildManagerConfirmationMessage,
  buildWorkerFeedbackMessage,
} from './src/slack/checkinBlocks';
import 'dotenv/config';

async function runTestSequence() {
  const testSlackId = process.argv[2];
  
  if (!testSlackId || !testSlackId.startsWith('U')) {
    console.error('❌ Please provide your Slack ID');
    console.error('Usage: bun run run-test-sequence.ts U01ABC123');
    console.error('\nTo find your Slack ID:');
    console.error('1. Click your profile in Slack');
    console.error('2. Click "More" (...) → "Copy member ID"');
    process.exit(1);
  }
  
  console.log('🧪 Starting Test Sequence\n');
  console.log(`Testing with Slack ID: ${testSlackId}`);
  console.log('You will receive 8 messages over the next 7 minutes:\n');
  
  const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
  });
  
  try {
    await app.start();
    console.log('✅ Slack app connected\n');
    
    initDatabase();
    setCheckinSlackApp(app);
    
    const workerFormUrl = process.env.WORKER_CHECKIN_FORM_URL || 'https://example.com';
    const managerFormUrl = process.env.MANAGER_REVIEW_FORM_URL || 'https://example.com';
    
    // Immediate: Worker primary reminder
    console.log('[NOW] Sending worker primary reminder...');
    await app.client.chat.postMessage({
      channel: testSlackId,
      text: '🧪 TEST - Worker Primary Reminder',
      ...buildWorkerReminderMessage(workerFormUrl, 0),
    });
    await sleep(2000);
    
    // +1 min: Worker nudge
    console.log('[+1 min] Scheduling worker nudge...');
    setTimeout(async () => {
      await app.client.chat.postMessage({
        channel: testSlackId,
        text: '🧪 TEST - Worker Nudge',
        ...buildWorkerNudgeMessage(workerFormUrl, 0, false),
      });
      console.log('✅ Worker nudge sent');
    }, 1 * 60 * 1000);
    
    // +2 min: Worker final nudge
    console.log('[+2 min] Scheduling worker final nudge...');
    setTimeout(async () => {
      await app.client.chat.postMessage({
        channel: testSlackId,
        text: '🧪 TEST - Worker Final Nudge',
        ...buildWorkerNudgeMessage(workerFormUrl, 0, true),
      });
      console.log('✅ Worker final nudge sent');
    }, 2 * 60 * 1000);
    
    // +3 min: Worker confirmation
    console.log('[+3 min] Scheduling worker confirmation...');
    setTimeout(async () => {
      await app.client.chat.postMessage({
        channel: testSlackId,
        text: '🧪 TEST - Worker Confirmation (after clicking "completed")',
        ...buildWorkerConfirmationMessage(0),
      });
      console.log('✅ Worker confirmation sent');
    }, 3 * 60 * 1000);
    
    // +4 min: Manager primary
    console.log('[+4 min] Scheduling manager primary reminder...');
    setTimeout(async () => {
      await app.client.chat.postMessage({
        channel: testSlackId,
        text: '🧪 TEST - Manager Primary Reminder',
        ...buildManagerReminderMessage(managerFormUrl, 3, 0),
      });
      console.log('✅ Manager primary sent');
    }, 4 * 60 * 1000);
    
    // +5 min: Manager nudge
    console.log('[+5 min] Scheduling manager nudge...');
    setTimeout(async () => {
      await app.client.chat.postMessage({
        channel: testSlackId,
        text: '🧪 TEST - Manager Nudge',
        ...buildManagerNudgeMessage(managerFormUrl, 0, false),
      });
      console.log('✅ Manager nudge sent');
    }, 5 * 60 * 1000);
    
    // +6 min: Manager final
    console.log('[+6 min] Scheduling manager final nudge...');
    setTimeout(async () => {
      await app.client.chat.postMessage({
        channel: testSlackId,
        text: '🧪 TEST - Manager Final Nudge',
        ...buildManagerNudgeMessage(managerFormUrl, 0, true),
      });
      console.log('✅ Manager final nudge sent');
    }, 6 * 60 * 1000);
    
    // +7 min: Manager confirmation + Worker feedback
    console.log('[+7 min] Scheduling manager confirmation & worker feedback...');
    setTimeout(async () => {
      await app.client.chat.postMessage({
        channel: testSlackId,
        text: '🧪 TEST - Manager Confirmation',
        ...buildManagerConfirmationMessage(0),
      });
      
      await sleep(2000);
      
      await app.client.chat.postMessage({
        channel: testSlackId,
        text: '🧪 TEST - Worker Feedback (from manager review)',
        ...buildWorkerFeedbackMessage(
          'Focus on customer onboarding flow this week',
          'Design team will provide mockups by Wednesday'
        ),
      });
      
      console.log('✅ Manager confirmation & worker feedback sent');
      console.log('\n🎉 Test sequence complete!');
      
      // Clean up after 10 seconds
      setTimeout(async () => {
        await app.stop();
        process.exit(0);
      }, 10000);
    }, 7 * 60 * 1000);
    
    console.log('\n⏱️  Test sequence running...');
    console.log('Keep this terminal open for the next 8 minutes.');
    console.log('Check your Slack DMs to see messages arrive!\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    await app.stop();
    process.exit(1);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

runTestSequence();
