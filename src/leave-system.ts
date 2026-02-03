/**
 * Leave Management System Initialization
 * 
 * Central initialization point for the leave management system.
 * Call this from your slack-bot.ts to enable leave functionality.
 */

import { App } from '@slack/bolt';
import { logger } from './logger';
import { initDatabase, closeDatabase } from './db/postgres';
import {
  initializeReminderSystem,
  shutdownReminderSystem,
  setSlackApp,
} from './jobs/reminderQueue';
import { setupLeaveHandlers } from './slack/leaveHandlers';

/**
 * Initialize the complete leave management system
 */
export async function initializeLeaveSystem(app: App): Promise<void> {
  logger.info('Initializing leave management system...');
  
  try {
    // Step 1: Initialize database connection pool
    initDatabase();
    logger.info('Database initialized');
    
    // Step 2: Set Slack app for reminder system
    setSlackApp(app);
    logger.info('Slack app configured for reminders');
    
    // Step 3: Initialize BullMQ reminder system
    await initializeReminderSystem();
    logger.info('Reminder system initialized');
    
    // Step 4: Register Slack event handlers
    setupLeaveHandlers(app);
    logger.info('Slack handlers registered');
    
    logger.info('Leave management system ready');
  } catch (error) {
    logger.error('Failed to initialize leave management system', error as Error);
    throw error;
  }
}

/**
 * Graceful shutdown of leave management system
 */
export async function shutdownLeaveSystem(): Promise<void> {
  logger.info('Shutting down leave management system...');
  
  try {
    await shutdownReminderSystem();
    await closeDatabase();
    logger.info('Leave management system shut down successfully');
  } catch (error) {
    logger.error('Error during shutdown', error as Error);
    throw error;
  }
}

/**
 * Health check for leave management system
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  details: Record<string, any>;
}> {
  const details: Record<string, any> = {};
  
  try {
    // Check database
    const { getPool } = await import('./db/postgres');
    const pool = getPool();
    const result = await pool.query('SELECT 1');
    details.database = result ? 'connected' : 'disconnected';
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
  
  const isHealthy = details.database === 'connected' && details.redis === 'connected';
  
  return {
    status: isHealthy ? 'healthy' : 'unhealthy',
    details,
  };
}
