/**
 * Test Mode: Accelerated Schedule
 * 
 * Convert weekly schedule to minutes for testing
 * 
 * WARNING: Only use this for testing! Replace with normal schedule after testing.
 */

import { Queue } from 'bullmq';
import { getRedisConnection } from './src/jobs/reminderQueue';
import { getCurrentWeekId } from './src/db/weeklyCheckins';
import { logger } from './src/logger';

export const testCheckinQueue = new Queue('weekly-checkins-test', {
  connection: getRedisConnection(),
});

/**
 * Schedule test jobs (runs in minutes instead of days)
 * 
 * Test schedule:
 * - Now: Sync roster
 * - +1 min: Worker primary reminder
 * - +2 min: Worker nudge
 * - +3 min: Worker final nudge
 * - +4 min: Manager primary
 * - +5 min: Manager nudge
 * - +6 min: Manager final nudge
 * - +7 min: Leadership report
 */
export async function scheduleTestJobs(testSlackId: string): Promise<void> {
  logger.info('🧪 Scheduling TEST jobs (accelerated timeline)...');
  
  const weekId = getCurrentWeekId();
  
  // Clear any existing test jobs
  await testCheckinQueue.drain();
  await testCheckinQueue.clean(0, 1000);
  
  // Sync roster NOW
  await testCheckinQueue.add(
    'sync_roster',
    { weekId },
    { delay: 0 }
  );
  logger.info('✅ Scheduled: Roster sync (now)');
  
  // Worker primary (1 minute)
  await testCheckinQueue.add(
    'worker_reminders',
    { weekId, reminderType: 'primary', testSlackId },
    { delay: 1 * 60 * 1000 }
  );
  logger.info('✅ Scheduled: Worker primary reminder (+1 min)');
  
  // Worker nudge 1 (2 minutes)
  await testCheckinQueue.add(
    'worker_reminders',
    { weekId, reminderType: 'nudge_1', testSlackId },
    { delay: 2 * 60 * 1000 }
  );
  logger.info('✅ Scheduled: Worker nudge 1 (+2 min)');
  
  // Worker final (3 minutes)
  await testCheckinQueue.add(
    'worker_reminders',
    { weekId, reminderType: 'final', testSlackId },
    { delay: 3 * 60 * 1000 }
  );
  logger.info('✅ Scheduled: Worker final nudge (+3 min)');
  
  // Manager primary (4 minutes)
  await testCheckinQueue.add(
    'manager_reminders',
    { weekId, reminderType: 'primary', testSlackId },
    { delay: 4 * 60 * 1000 }
  );
  logger.info('✅ Scheduled: Manager primary reminder (+4 min)');
  
  // Manager nudge (5 minutes)
  await testCheckinQueue.add(
    'manager_reminders',
    { weekId, reminderType: 'nudge', testSlackId },
    { delay: 5 * 60 * 1000 }
  );
  logger.info('✅ Scheduled: Manager nudge (+5 min)');
  
  // Manager final (6 minutes)
  await testCheckinQueue.add(
    'manager_reminders',
    { weekId, reminderType: 'final', testSlackId },
    { delay: 6 * 60 * 1000 }
  );
  logger.info('✅ Scheduled: Manager final nudge (+6 min)');
  
  // Leadership report (7 minutes)
  await testCheckinQueue.add(
    'leadership_report',
    { weekId, testSlackId },
    { delay: 7 * 60 * 1000 }
  );
  logger.info('✅ Scheduled: Leadership report (+7 min)');
  
  logger.info('\n🎯 All test jobs scheduled! Messages will arrive over next 7 minutes.');
}
