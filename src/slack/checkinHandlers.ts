/**
 * Slack event handlers for Weekly Check-Ins
 */

import { App } from '@slack/bolt';
import { logger } from '../logger';
import {
  getCurrentWeekId,
  getWeeklyTrackingRecord,
  markWorkerSubmitted,
  markManagerReviewSubmitted,
  getRosterEntryBySlackId,
  getMessageVariantIndex,
} from '../db/weeklyCheckins';
import {
  buildWorkerConfirmationMessage,
  buildManagerConfirmationMessage,
  WORKER_CONFIRMATION_MESSAGES,
  MANAGER_CONFIRMATION_MESSAGES,
} from './checkinBlocks';

/**
 * Register all weekly check-in handlers
 */
export function setupCheckinHandlers(app: App): void {
  // Button actions
  app.action('worker_completed', handleWorkerCompleted);
  app.action('manager_completed', handleManagerCompleted);
}

/**
 * Handle worker "I've completed it" button click
 */
async function handleWorkerCompleted({ ack, body, client }: any) {
  await ack();
  
  const userId = body.user.id;
  const weekId = getCurrentWeekId();
  
  const log = logger.child({
    action: 'worker_completed',
    userId,
    weekId,
  });
  
  try {
    log.info('Processing worker completion confirmation');
    
    // Get roster entry
    const rosterEntry = await getRosterEntryBySlackId(userId);
    
    if (!rosterEntry) {
      log.warn('User not found in roster');
      
      await client.chat.postMessage({
        channel: userId,
        text: 'Sorry, I couldn\'t find your entry in the roster. Please contact your manager.',
      });
      return;
    }
    
    // Check if already marked completed
    const trackingRecord = await getWeeklyTrackingRecord(weekId, userId);
    
    if (trackingRecord?.worker_submitted) {
      log.info('Worker already marked as submitted');
      
      await client.chat.postMessage({
        channel: userId,
        text: '✅ Your weekly check-in was already recorded. No need to submit again!',
      });
      return;
    }
    
    // Mark as submitted
    // Status will be determined during sync based on Google Sheets timestamp
    // For now, mark as on_time (will be corrected during next sync)
    await markWorkerSubmitted(weekId, userId, 'on_time');
    
    // Get message variant
    const variantIndex = await getMessageVariantIndex(
      'worker_confirmation',
      WORKER_CONFIRMATION_MESSAGES.length
    );
    
    // Send confirmation
    const confirmationMessage = buildWorkerConfirmationMessage(variantIndex);
    
    await client.chat.postMessage({
      channel: userId,
      ...confirmationMessage,
    });
    
    log.info('Worker completion confirmed', {
      employeeName: rosterEntry.employee_name,
    });
  } catch (error) {
    log.error('Error handling worker completion', error as Error);
    
    await client.chat.postMessage({
      channel: userId,
      text: 'Sorry, there was an error recording your completion. Please try again or contact support.',
    });
  }
}

/**
 * Handle manager "I've completed my reviews" button click
 */
async function handleManagerCompleted({ ack, body, client }: any) {
  await ack();
  
  const userId = body.user.id;
  const weekId = getCurrentWeekId();
  
  const log = logger.child({
    action: 'manager_completed',
    userId,
    weekId,
  });
  
  try {
    log.info('Processing manager completion confirmation');
    
    // Get roster entry
    const rosterEntry = await getRosterEntryBySlackId(userId);
    
    if (!rosterEntry) {
      log.warn('Manager not found in roster');
      
      await client.chat.postMessage({
        channel: userId,
        text: 'Sorry, I couldn\'t find your entry in the roster. Please contact IT support.',
      });
      return;
    }
    
    // Check if already marked completed
    const trackingRecord = await getWeeklyTrackingRecord(weekId, userId);
    
    if (trackingRecord?.manager_review_submitted) {
      log.info('Manager already marked as submitted');
      
      await client.chat.postMessage({
        channel: userId,
        text: '✅ Your manager reviews were already recorded. No need to submit again!',
      });
      return;
    }
    
    // Mark as submitted
    await markManagerReviewSubmitted(weekId, userId, 'on_time');
    
    // Get message variant
    const variantIndex = await getMessageVariantIndex(
      'manager_confirmation',
      MANAGER_CONFIRMATION_MESSAGES.length
    );
    
    // Send confirmation
    const confirmationMessage = buildManagerConfirmationMessage(variantIndex);
    
    await client.chat.postMessage({
      channel: userId,
      ...confirmationMessage,
    });
    
    log.info('Manager completion confirmed', {
      managerName: rosterEntry.employee_name,
    });
  } catch (error) {
    log.error('Error handling manager completion', error as Error);
    
    await client.chat.postMessage({
      channel: userId,
      text: 'Sorry, there was an error recording your completion. Please try again or contact support.',
    });
  }
}
