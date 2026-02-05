/**
 * BullMQ queue system for leave request reminders
 * 
 * Handles:
 * - 12-hour reminders for pending requests
 * - Daily OOO summaries
 * - Persistent scheduling (survives server restarts)
 */

import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '../logger';
import {
  getPendingReminders,
  getLeaveRequest,
  updateReminder,
  deactivateReminder,
  getTodayOOO,
  getPendingRequests,
} from '../db/postgres';

/**
 * Redis connection
 */
let redis: IORedis | null = null;

/**
 * Slack app client (needed to send messages)
 */
let slackApp: any = null;

export function setSlackApp(app: any): void {
  slackApp = app;
}

export function getRedisConnection(): IORedis {
  if (!redis) {
    redis = new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
    });
    
    redis.on('error', (error) => {
      logger.error('Redis connection error', error);
    });
    
    redis.on('connect', () => {
      logger.info('Redis connected');
    });
  }
  
  return redis;
}

/**
 * Queue for leave request reminders
 */
export const reminderQueue = new Queue('leave-reminders', {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs for debugging
    },
    removeOnFail: {
      count: 200, // Keep last 200 failed jobs
    },
  },
});

/**
 * Queue for daily OOO summaries
 */
export const dailySummaryQueue = new Queue('daily-summaries', {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 60000, // 1 minute
    },
  },
});

/**
 * Job data interfaces
 */
interface ReminderJobData {
  requestId: string;
  reminderCount: number;
}

interface DailySummaryJobData {
  date: string;
}

/**
 * Send reminder for pending leave request
 */
async function processReminder(requestId: string, reminderCount: number): Promise<void> {
  logger.info('Processing reminder', { requestId, reminderCount });
  
  // Get the leave request
  const leaveRequest = await getLeaveRequest(requestId);
  
  if (!leaveRequest) {
    logger.warn('Leave request not found for reminder', { requestId });
    await deactivateReminder(requestId);
    return;
  }
  
  // If no longer pending, deactivate reminder
  if (leaveRequest.status !== 'pending') {
    logger.info('Request no longer pending, deactivating reminder', {
      requestId,
      status: leaveRequest.status,
    });
    await deactivateReminder(requestId);
    return;
  }
  
  // Send reminder to managers via Slack
  if (slackApp) {
    logger.info('Sending reminder to managers', {
      requestId,
      requesterName: leaveRequest.requester_name,
      reminderCount,
    });
    
    // Dynamic import to avoid circular dependency
    const { sendReminderToManagers } = await import('../slack/leaveHandlers');
    await sendReminderToManagers(slackApp.client, leaveRequest, reminderCount);
  } else {
    logger.warn('Slack app not initialized, cannot send reminder', { requestId });
  }
  
  // Schedule next reminder (12 hours from now)
  const nextReminderAt = new Date();
  nextReminderAt.setHours(nextReminderAt.getHours() + 12);
  await updateReminder(requestId, nextReminderAt);
  
  // Add job for next reminder
  await reminderQueue.add(
    'send-reminder',
    {
      requestId,
      reminderCount: reminderCount + 1,
    },
    {
      delay: 12 * 60 * 60 * 1000, // 12 hours in milliseconds
    }
  );
}

/**
 * Send daily OOO summary
 */
async function processDailySummary(date: string): Promise<void> {
  logger.info('Processing daily OOO summary', { date });
  
  // Get all approved leaves for today
  const oooList = await getTodayOOO();
  
  // Get all pending requests
  const pendingRequests = await getPendingRequests();
  
  logger.info('Daily summary data retrieved', {
    oooCount: oooList.length,
    pendingCount: pendingRequests.length,
  });
  
  // TODO: Import and call Slack notification functions
  // await sendDailyOOOSummary(oooList);
  // await sendPendingRequestsSummary(pendingRequests);
  
  // TODO: Update Google Calendar with OOO events
  // await syncOOOToCalendar(oooList);
}

/**
 * Worker to process reminder jobs
 */
export const reminderWorker = new Worker<ReminderJobData>(
  'leave-reminders',
  async (job) => {
    const { requestId, reminderCount } = job.data;
    
    try {
      await processReminder(requestId, reminderCount);
      logger.info('Reminder processed successfully', { requestId, jobId: job.id });
    } catch (error) {
      logger.error('Error processing reminder', error as Error, {
        requestId,
        jobId: job.id,
      });
      throw error; // Let Bull MQ handle retries
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 5, // Process up to 5 reminders concurrently
  }
);

/**
 * Worker to process daily summary jobs
 */
export const dailySummaryWorker = new Worker<DailySummaryJobData>(
  'daily-summaries',
  async (job) => {
    const { date } = job.data;
    
    try {
      await processDailySummary(date);
      logger.info('Daily summary processed successfully', { date, jobId: job.id });
    } catch (error) {
      logger.error('Error processing daily summary', error as Error, {
        date,
        jobId: job.id,
      });
      throw error;
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 1, // Process one summary at a time
  }
);

/**
 * Queue events for monitoring
 */
const reminderQueueEvents = new QueueEvents('leave-reminders', {
  connection: getRedisConnection(),
});

reminderQueueEvents.on('completed', ({ jobId }) => {
  logger.debug('Reminder job completed', { jobId });
});

reminderQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error('Reminder job failed', new Error(failedReason), { jobId });
});

/**
 * Add a reminder job for a new leave request
 */
export async function scheduleLeaveReminder(requestId: string): Promise<void> {
  // First reminder in 12 hours
  const delay = 12 * 60 * 60 * 1000;
  
  await reminderQueue.add(
    'send-reminder',
    {
      requestId,
      reminderCount: 1,
    },
    {
      delay,
      jobId: `reminder-${requestId}`, // Use requestId as jobId for idempotency
    }
  );
  
  logger.info('Reminder scheduled', { requestId, delayMs: delay });
}

/**
 * Cancel reminder for a leave request (when approved/rejected)
 */
export async function cancelLeaveReminder(requestId: string): Promise<void> {
  const jobId = `reminder-${requestId}`;
  const job = await reminderQueue.getJob(jobId);
  
  if (job) {
    await job.remove();
    logger.info('Reminder cancelled', { requestId });
  }
  
  await deactivateReminder(requestId);
}

/**
 * Schedule daily OOO summary (runs every day at 8 AM)
 */
export async function scheduleDailySummary(): Promise<void> {
  // Schedule repeatable job for 8 AM every day
  await dailySummaryQueue.add(
    'daily-ooo-summary',
    {
      date: new Date().toISOString().split('T')[0],
    },
    {
      repeat: {
        pattern: '0 8 * * *', // Cron: Every day at 8:00 AM
      },
    }
  );
  
  logger.info('Daily summary scheduled for 8 AM every day');
}

/**
 * Initialize the reminder system
 * Call this on application startup
 */
export async function initializeReminderSystem(): Promise<void> {
  logger.info('Initializing reminder system...');
  
  // Schedule daily summary
  await scheduleDailySummary();
  
  // Check for any missed reminders from database
  const pendingReminders = await getPendingReminders();
  
  logger.info('Found pending reminders', { count: pendingReminders.length });
  
  // Re-schedule any missed reminders
  for (const reminder of pendingReminders) {
    const leaveRequest = await getLeaveRequest(reminder.request_id);
    
    if (leaveRequest && leaveRequest.status === 'pending') {
      // Schedule immediately if reminder was missed
      await reminderQueue.add(
        'send-reminder',
        {
          requestId: reminder.request_id,
          reminderCount: reminder.reminder_count + 1,
        },
        {
          delay: 0, // Send immediately
          jobId: `reminder-${reminder.request_id}`,
        }
      );
      
      logger.info('Rescheduled missed reminder', {
        requestId: reminder.request_id,
      });
    }
  }
  
  logger.info('Reminder system initialized');
}

/**
 * Cleanup on shutdown
 */
export async function shutdownReminderSystem(): Promise<void> {
  logger.info('Shutting down reminder system...');
  
  await reminderWorker.close();
  await dailySummaryWorker.close();
  await reminderQueue.close();
  await dailySummaryQueue.close();
  
  if (redis) {
    await redis.quit();
    redis = null;
  }
  
  logger.info('Reminder system shut down');
}
