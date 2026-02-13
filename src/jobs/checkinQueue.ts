/**
 * BullMQ queue system for weekly check-in reminders
 * 
 * Handles:
 * - Friday worker reminders
 * - Saturday/Sunday worker nudges
 * - Monday manager reminders
 * - Tuesday manager nudges
 * - Tuesday leadership report (4 PM Bali time)
 */

import { Queue, Worker, QueueEvents } from 'bullmq';
import { logger } from '../logger';
import { getRedisConnection } from './reminderQueue';
import {
  getCurrentWeekId,
  getPendingWorkers,
  getPendingManagers,
  getManagerDirectReports,
  markWorkerSubmitted,
  markManagerReviewSubmitted,
  initializeWeeklyTracking,
  getMessageVariantIndex,
  generateComplianceReport,
  incrementWorkerReminderCount,
  incrementManagerReminderCount,
  syncRosterToDatabase,
  getActiveRoster,
} from '../db/weeklyCheckins';
import {
  readRosterFromSheets,
  readWorkerSubmissionsFromSheets,
  readManagerReviewsFromSheets,
  getSheetsConfigFromEnv,
} from '../services/googleSheets';
import {
  buildWorkerReminderMessage,
  buildWorkerNudgeMessage,
  buildManagerReminderMessage,
  buildManagerNudgeMessage,
  buildWorkerFeedbackMessage,
  buildComplianceReportMessage,
  WORKER_PRIMARY_MESSAGES,
  WORKER_NUDGE_MESSAGES,
  WORKER_FINAL_MESSAGES,
  MANAGER_PRIMARY_MESSAGES,
  MANAGER_NUDGE_MESSAGES,
  MANAGER_FINAL_MESSAGES,
} from '../slack/checkinBlocks';

/**
 * Slack app client (needed to send messages)
 */
let slackApp: any = null;

export function setCheckinSlackApp(app: any): void {
  slackApp = app;
}

/**
 * Queue for weekly check-in reminders
 */
export const checkinQueue = new Queue('weekly-checkins', {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 50,
    },
    removeOnFail: {
      count: 100,
    },
  },
});

/**
 * Job data interfaces
 */
interface SyncRosterJobData {
  weekId: string;
}

interface WorkerReminderJobData {
  weekId: string;
  reminderType: 'primary' | 'nudge_1' | 'nudge_2' | 'final';
}

interface ManagerReminderJobData {
  weekId: string;
  reminderType: 'primary' | 'nudge' | 'final';
}

interface SyncSubmissionsJobData {
  weekId: string;
}

interface LeadershipReportJobData {
  weekId: string;
}

/**
 * Sync roster from Google Sheets
 */
async function processSyncRoster(weekId: string): Promise<void> {
  const log = logger.child({ action: 'sync_roster', weekId });
  
  try {
    log.info('Syncing roster from Google Sheets');
    
    const config = getSheetsConfigFromEnv();
    const rosterEntries = await readRosterFromSheets(config);
    
    await syncRosterToDatabase(rosterEntries);
    
    // Initialize tracking for the week
    await initializeWeeklyTracking(weekId);
    
    log.info('Roster synced successfully', { count: rosterEntries.length });
  } catch (error) {
    log.error('Error syncing roster', error as Error);
    throw error;
  }
}

/**
 * Send worker reminders
 */
async function processWorkerReminders(
  weekId: string,
  reminderType: WorkerReminderJobData['reminderType']
): Promise<void> {
  const log = logger.child({ action: 'worker_reminders', weekId, reminderType });
  
  if (!slackApp) {
    log.error('Slack app not initialized');
    return;
  }
  
  try {
    log.info('Sending worker reminders');
    
    // Sync latest submissions from Google Sheets first
    await syncWorkerSubmissions(weekId);
    
    // Get pending workers
    const pendingWorkers = await getPendingWorkers(weekId);
    
    log.info('Found pending workers', { count: pendingWorkers.length });
    
    if (pendingWorkers.length === 0) {
      log.info('No pending workers, skipping reminders');
      return;
    }
    
    // Get form URL from environment
    const formUrl = process.env.WORKER_CHECKIN_FORM_URL || '';
    
    // Get message variant
    const messageType = `worker_${reminderType}`;
    const totalVariants = 
      reminderType === 'primary' ? WORKER_PRIMARY_MESSAGES.length :
      reminderType === 'final' ? WORKER_FINAL_MESSAGES.length :
      WORKER_NUDGE_MESSAGES.length;
    
    const variantIndex = await getMessageVariantIndex(messageType, totalVariants);
    
    // Send reminders to each pending worker
    for (const worker of pendingWorkers) {
      try {
        let message;
        
        if (reminderType === 'primary') {
          message = buildWorkerReminderMessage(formUrl, variantIndex);
        } else {
          const isFinal = reminderType === 'final';
          message = buildWorkerNudgeMessage(formUrl, variantIndex, isFinal);
        }
        
        await slackApp.client.chat.postMessage({
          channel: worker.employee_slack_id,
          ...message,
        });
        
        // Increment reminder count
        await incrementWorkerReminderCount(weekId, worker.employee_slack_id);
        
        log.info('Reminder sent to worker', {
          employeeName: worker.employee_name,
          reminderType,
        });
      } catch (error) {
        log.error('Error sending reminder to worker', error as Error, {
          employeeName: worker.employee_name,
        });
      }
    }
    
    log.info('Worker reminders completed', {
      sent: pendingWorkers.length,
    });
  } catch (error) {
    log.error('Error processing worker reminders', error as Error);
    throw error;
  }
}

/**
 * Send manager reminders
 */
async function processManagerReminders(
  weekId: string,
  reminderType: ManagerReminderJobData['reminderType']
): Promise<void> {
  const log = logger.child({ action: 'manager_reminders', weekId, reminderType });
  
  if (!slackApp) {
    log.error('Slack app not initialized');
    return;
  }
  
  try {
    log.info('Sending manager reminders');
    
    // Sync latest manager reviews first
    await syncManagerReviews(weekId);
    
    // Get pending managers
    const pendingManagerIds = await getPendingManagers(weekId);
    
    log.info('Found pending managers', { count: pendingManagerIds.length });
    
    if (pendingManagerIds.length === 0) {
      log.info('No pending managers, skipping reminders');
      return;
    }
    
    // Get form URL from environment
    const formUrl = process.env.MANAGER_REVIEW_FORM_URL || '';
    
    // Get message variant
    const messageType = `manager_${reminderType}`;
    const totalVariants = 
      reminderType === 'primary' ? MANAGER_PRIMARY_MESSAGES.length :
      reminderType === 'final' ? MANAGER_FINAL_MESSAGES.length :
      MANAGER_NUDGE_MESSAGES.length;
    
    const variantIndex = await getMessageVariantIndex(messageType, totalVariants);
    
    // Send reminders to each pending manager
    for (const managerSlackId of pendingManagerIds) {
      try {
        // Get count of direct reports who submitted
        const directReports = await getManagerDirectReports(weekId, managerSlackId);
        
        let message;
        
        if (reminderType === 'primary') {
          message = buildManagerReminderMessage(formUrl, directReports.length, variantIndex);
        } else {
          const isFinal = reminderType === 'final';
          message = buildManagerNudgeMessage(formUrl, variantIndex, isFinal);
        }
        
        await slackApp.client.chat.postMessage({
          channel: managerSlackId,
          ...message,
        });
        
        // Increment reminder count
        await incrementManagerReminderCount(weekId, managerSlackId);
        
        log.info('Reminder sent to manager', {
          managerSlackId,
          reminderType,
          directReportsCount: directReports.length,
        });
      } catch (error) {
        log.error('Error sending reminder to manager', error as Error, {
          managerSlackId,
        });
      }
    }
    
    log.info('Manager reminders completed', {
      sent: pendingManagerIds.length,
    });
  } catch (error) {
    log.error('Error processing manager reminders', error as Error);
    throw error;
  }
}

/**
 * Sync worker submissions from Google Sheets
 */
async function syncWorkerSubmissions(weekId: string): Promise<void> {
  const log = logger.child({ action: 'sync_worker_submissions', weekId });
  
  try {
    log.info('Syncing worker submissions from Google Sheets');
    
    const config = getSheetsConfigFromEnv();
    const submissions = await readWorkerSubmissionsFromSheets(config, weekId);
    
    // Mark each submission as completed in database
    for (const submission of submissions) {
      // Find employee in roster to get Slack ID
      const roster = await getActiveRoster();
      const employee = roster.find(r => r.employee_name === submission.employee_name);
      
      if (employee) {
        // Determine status based on submission time
        const submissionDay = submission.timestamp.getDay();
        const status = submissionDay <= 6 ? 'on_time' : 'late'; // Saturday = 6
        
        await markWorkerSubmitted(weekId, employee.employee_slack_id, status);
        
        log.info('Worker submission marked', {
          employeeName: submission.employee_name,
          status,
        });
      } else {
        log.warn('Employee not found in roster', {
          employeeName: submission.employee_name,
        });
      }
    }
    
    log.info('Worker submissions synced', { count: submissions.length });
  } catch (error) {
    log.error('Error syncing worker submissions', error as Error);
    throw error;
  }
}

/**
 * Sync manager reviews from Google Sheets and route feedback to workers
 */
async function syncManagerReviews(weekId: string): Promise<void> {
  const log = logger.child({ action: 'sync_manager_reviews', weekId });
  
  if (!slackApp) {
    log.warn('Slack app not initialized, cannot route feedback');
    return;
  }
  
  try {
    log.info('Syncing manager reviews from Google Sheets');
    
    const config = getSheetsConfigFromEnv();
    const reviews = await readManagerReviewsFromSheets(config, weekId);
    
    const roster = await getActiveRoster();
    
    // Process each review
    for (const review of reviews) {
      // Find manager in roster
      const manager = roster.find(r => r.employee_name === review.manager_name);
      
      if (manager) {
        // Determine status
        const reviewDay = review.timestamp.getDay();
        const status = reviewDay === 1 ? 'on_time' : 'late'; // Monday = 1
        
        await markManagerReviewSubmitted(weekId, manager.manager_slack_id, status);
        
        log.info('Manager review marked', {
          managerName: review.manager_name,
          status,
        });
        
        // Route feedback to worker
        const employee = roster.find(r => r.employee_name === review.employee_name);
        
        if (employee && (review.directive || review.blocker_resolution)) {
          try {
            const feedbackMessage = buildWorkerFeedbackMessage(
              review.directive,
              review.blocker_resolution
            );
            
            await slackApp.client.chat.postMessage({
              channel: employee.employee_slack_id,
              ...feedbackMessage,
            });
            
            log.info('Feedback routed to worker', {
              employeeName: review.employee_name,
            });
          } catch (error) {
            log.error('Error routing feedback to worker', error as Error, {
              employeeName: review.employee_name,
            });
          }
        }
      } else {
        log.warn('Manager not found in roster', {
          managerName: review.manager_name,
        });
      }
    }
    
    log.info('Manager reviews synced', { count: reviews.length });
  } catch (error) {
    log.error('Error syncing manager reviews', error as Error);
    throw error;
  }
}

/**
 * Generate and send leadership compliance report
 */
async function processLeadershipReport(weekId: string): Promise<void> {
  const log = logger.child({ action: 'leadership_report', weekId });
  
  if (!slackApp) {
    log.error('Slack app not initialized');
    return;
  }
  
  try {
    log.info('Generating leadership compliance report');
    
    // Final sync before generating report
    await syncWorkerSubmissions(weekId);
    await syncManagerReviews(weekId);
    
    // Generate report
    const report = await generateComplianceReport(weekId);
    
    // Get leadership Slack IDs from environment
    const leadershipIds = [
      process.env.GURNOOR_SLACK_ID,
      process.env.SANDEEP_SLACK_ID,
      process.env.AXEL_SLACK_ID,
      process.env.EMEKA_SLACK_ID,
      process.env.NADIA_SLACK_ID,
    ].filter(Boolean) as string[];
    
    if (leadershipIds.length === 0) {
      log.warn('No leadership Slack IDs configured');
      return;
    }
    
    const reportMessage = buildComplianceReportMessage(report, leadershipIds);
    
    // Send report to each leader
    for (const leaderId of leadershipIds) {
      try {
        await slackApp.client.chat.postMessage({
          channel: leaderId,
          ...reportMessage,
        });
        
        log.info('Report sent to leader', { leaderId });
      } catch (error) {
        log.error('Error sending report to leader', error as Error, { leaderId });
      }
    }
    
    log.info('Leadership report completed', {
      recipients: leadershipIds.length,
      workersTotal: report.workers_total,
      managersTotal: report.managers_total,
    });
  } catch (error) {
    log.error('Error processing leadership report', error as Error);
    throw error;
  }
}

/**
 * Worker for check-in jobs
 */
export const checkinWorker = new Worker(
  'weekly-checkins',
  async (job) => {
    const { name, data } = job;
    
    try {
      switch (name) {
        case 'sync_roster':
          await processSyncRoster((data as SyncRosterJobData).weekId);
          break;
        
        case 'worker_reminders':
          const workerData = data as WorkerReminderJobData;
          await processWorkerReminders(workerData.weekId, workerData.reminderType);
          break;
        
        case 'manager_reminders':
          const managerData = data as ManagerReminderJobData;
          await processManagerReminders(managerData.weekId, managerData.reminderType);
          break;
        
        case 'leadership_report':
          await processLeadershipReport((data as LeadershipReportJobData).weekId);
          break;
        
        default:
          logger.warn('Unknown job type', { jobName: name });
      }
      
      logger.info('Check-in job completed', { jobName: name, jobId: job.id });
    } catch (error) {
      logger.error('Error processing check-in job', error as Error, {
        jobName: name,
        jobId: job.id,
      });
      throw error;
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 3,
  }
);

/**
 * Queue events for monitoring
 */
const checkinQueueEvents = new QueueEvents('weekly-checkins', {
  connection: getRedisConnection(),
});

checkinQueueEvents.on('completed', ({ jobId }) => {
  logger.debug('Check-in job completed', { jobId });
});

checkinQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error('Check-in job failed', new Error(failedReason), { jobId });
});

/**
 * Schedule all weekly check-in jobs
 */
export async function scheduleWeeklyCheckInJobs(): Promise<void> {
  logger.info('Scheduling weekly check-in jobs...');
  
  // All times in Bali timezone (UTC+8 / WITA)
  // Cron format: minute hour day month weekday
  
  // Thursday EOD: Sync roster and initialize week
  await checkinQueue.add(
    'sync_roster',
    { weekId: getCurrentWeekId() },
    {
      repeat: {
        pattern: '0 17 * * 4', // Thursday 5 PM Bali time
      },
    }
  );
  
  // Friday EOD: Worker primary reminder
  await checkinQueue.add(
    'worker_reminders',
    {
      weekId: getCurrentWeekId(),
      reminderType: 'primary',
    },
    {
      repeat: {
        pattern: '0 17 * * 5', // Friday 5 PM Bali time
      },
    }
  );
  
  // Saturday morning: Worker first nudge
  await checkinQueue.add(
    'worker_reminders',
    {
      weekId: getCurrentWeekId(),
      reminderType: 'nudge_1',
    },
    {
      repeat: {
        pattern: '0 9 * * 6', // Saturday 9 AM Bali time
      },
    }
  );
  
  // Sunday EOD: Worker final nudge
  await checkinQueue.add(
    'worker_reminders',
    {
      weekId: getCurrentWeekId(),
      reminderType: 'final',
    },
    {
      repeat: {
        pattern: '0 20 * * 0', // Sunday 8 PM Bali time
      },
    }
  );
  
  // Monday morning: Manager primary reminder
  await checkinQueue.add(
    'manager_reminders',
    {
      weekId: getCurrentWeekId(),
      reminderType: 'primary',
    },
    {
      repeat: {
        pattern: '0 8 * * 1', // Monday 8 AM Bali time
      },
    }
  );
  
  // Monday EOD: Manager first nudge
  await checkinQueue.add(
    'manager_reminders',
    {
      weekId: getCurrentWeekId(),
      reminderType: 'nudge',
    },
    {
      repeat: {
        pattern: '0 21 * * 1', // Monday 9 PM Bali time
      },
    }
  );
  
  // Tuesday morning: Manager final nudge
  await checkinQueue.add(
    'manager_reminders',
    {
      weekId: getCurrentWeekId(),
      reminderType: 'final',
    },
    {
      repeat: {
        pattern: '0 12 * * 2', // Tuesday 12 PM Bali time
      },
    }
  );
  
  // Tuesday 4 PM: Leadership compliance report
  await checkinQueue.add(
    'leadership_report',
    { weekId: getCurrentWeekId() },
    {
      repeat: {
        pattern: '0 16 * * 2', // Tuesday 4 PM Bali time
      },
    }
  );
  
  logger.info('Weekly check-in jobs scheduled successfully');
}

/**
 * Shutdown check-in queue
 */
export async function shutdownCheckinQueue(): Promise<void> {
  logger.info('Shutting down check-in queue...');
  
  await checkinWorker.close();
  await checkinQueue.close();
  
  logger.info('Check-in queue shut down');
}
