/**
 * Weekly Check-Ins System Initialization
 * 
 * Central initialization point for the weekly check-ins system.
 * Call this from your slack-bot.ts to enable weekly check-ins functionality.
 */

import { App } from '@slack/bolt';
import { logger } from './logger';
import { initDatabase } from './db/postgres';
import {
  setCheckinSlackApp,
  scheduleWeeklyCheckInJobs,
  shutdownCheckinQueue,
} from './jobs/checkinQueue';
import { setupCheckinHandlers } from './slack/checkinHandlers';
import { getSheetsConfigFromEnv } from './services/googleSheets';

/**
 * Initialize the complete weekly check-ins system
 */
export async function initializeWeeklyCheckInsSystem(app: App): Promise<void> {
  logger.info('Initializing weekly check-ins system...');
  
  try {
    // Step 1: Ensure database is initialized
    // (This should already be done by leave system, but we check anyway)
    initDatabase();
    logger.info('Database connection confirmed');
    
    // Step 2: Validate Google Sheets configuration
    const sheetsConfig = getSheetsConfigFromEnv();
    
    if (!sheetsConfig.spreadsheet_id) {
      throw new Error('WEEKLY_CHECKINS_SPREADSHEET_ID not configured');
    }
    
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
    }
    
    if (!process.env.WORKER_CHECKIN_FORM_URL) {
      logger.warn('WORKER_CHECKIN_FORM_URL not configured - reminders will have empty form URLs');
    }
    
    if (!process.env.MANAGER_REVIEW_FORM_URL) {
      logger.warn('MANAGER_REVIEW_FORM_URL not configured - reminders will have empty form URLs');
    }
    
    logger.info('Google Sheets configuration validated', {
      spreadsheetId: sheetsConfig.spreadsheet_id,
      rosterTab: sheetsConfig.roster_tab,
      workerTab: sheetsConfig.worker_responses_tab,
      managerTab: sheetsConfig.manager_responses_tab,
    });
    
    // Step 3: Set Slack app for reminder system
    setCheckinSlackApp(app);
    logger.info('Slack app configured for weekly check-ins');
    
    // Step 4: Schedule all recurring jobs
    await scheduleWeeklyCheckInJobs();
    logger.info('Recurring jobs scheduled');
    
    // Step 5: Register Slack event handlers
    setupCheckinHandlers(app);
    logger.info('Slack handlers registered');
    
    logger.info('Weekly check-ins system ready');
  } catch (error) {
    logger.error('Failed to initialize weekly check-ins system', error as Error);
    throw error;
  }
}

/**
 * Graceful shutdown of weekly check-ins system
 */
export async function shutdownWeeklyCheckInsSystem(): Promise<void> {
  logger.info('Shutting down weekly check-ins system...');
  
  try {
    await shutdownCheckinQueue();
    logger.info('Weekly check-ins system shut down successfully');
  } catch (error) {
    logger.error('Error during weekly check-ins shutdown', error as Error);
    throw error;
  }
}

/**
 * Health check for weekly check-ins system
 */
export async function healthCheckWeeklyCheckIns(): Promise<{
  status: 'healthy' | 'unhealthy';
  details: Record<string, any>;
}> {
  const details: Record<string, any> = {};
  
  try {
    // Check database
    const { getPool } = await import('./db/postgres');
    const pool = getPool();
    const result = await pool.query('SELECT COUNT(*) FROM org_roster WHERE is_active = TRUE');
    details.active_roster_count = result.rows[0]?.count || 0;
    details.database = 'connected';
  } catch (error) {
    details.database = 'error';
    details.database_error = (error as Error).message;
  }
  
  try {
    // Check Redis
    const { getRedisConnection } = await import('./jobs/reminderQueue');
    const redis = getRedisConnection();
    const pong = await redis.ping();
    details.redis = pong === 'PONG' ? 'connected' : 'disconnected';
  } catch (error) {
    details.redis = 'error';
    details.redis_error = (error as Error).message;
  }
  
  try {
    // Check Google Sheets config
    const sheetsConfig = getSheetsConfigFromEnv();
    details.google_sheets_configured = !!sheetsConfig.spreadsheet_id;
    details.spreadsheet_id = sheetsConfig.spreadsheet_id ? 'set' : 'missing';
  } catch (error) {
    details.google_sheets = 'error';
    details.google_sheets_error = (error as Error).message;
  }
  
  const isHealthy = 
    details.database === 'connected' && 
    details.redis === 'connected' &&
    details.google_sheets_configured === true;
  
  return {
    status: isHealthy ? 'healthy' : 'unhealthy',
    details,
  };
}
