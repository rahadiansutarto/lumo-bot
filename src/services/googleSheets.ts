/**
 * Google Sheets Integration for Weekly Check-Ins
 * 
 * Handles reading roster, worker submissions, and manager reviews from Google Sheets
 */

import { google } from 'googleapis';
import { logger } from '../logger';
import {
  RosterEntry,
  WorkerSubmission,
  ManagerReview,
  SheetsConfig,
} from '../types/weeklyCheckins';
import { getCurrentWeekId } from '../db/weeklyCheckins';

/**
 * Get authenticated Google Sheets API client
 */
function getSheetsClient() {
  // Use service account or OAuth2 credentials
  // For now, assumes GOOGLE_SERVICE_ACCOUNT_KEY environment variable
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  
  if (!serviceAccountKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
  }
  
  const credentials = JSON.parse(serviceAccountKey);
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  
  return google.sheets({ version: 'v4', auth });
}

/**
 * Read roster from Google Sheets
 */
export async function readRosterFromSheets(
  config: SheetsConfig
): Promise<RosterEntry[]> {
  const log = logger.child({ action: 'read_roster_from_sheets' });
  
  try {
    const sheets = getSheetsClient();
    
    log.info('Reading roster from Google Sheets', {
      spreadsheetId: config.spreadsheet_id,
      tab: config.roster_tab,
    });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.spreadsheet_id,
      range: `${config.roster_tab}!A2:F`, // Assuming headers in row 1
    });
    
    const rows = response.data.values || [];
    
    if (rows.length === 0) {
      log.warn('No roster data found in Google Sheets');
      return [];
    }
    
    // Map rows to RosterEntry objects
    // Expected columns: Employee Name | Employee Slack ID | Manager Name | Manager Slack ID | Team | Employee Email
    const roster: RosterEntry[] = rows.map((row, index) => {
      if (row.length < 4) {
        log.warn('Incomplete roster row', { rowIndex: index + 2, row });
        return null;
      }
      
      return {
        employee_name: row[0]?.trim() || '',
        employee_slack_id: row[1]?.trim() || '',
        manager_name: row[2]?.trim() || '',
        manager_slack_id: row[3]?.trim() || '',
        team: row[4]?.trim() || undefined,
        employee_email: row[5]?.trim() || undefined,
      };
    }).filter((entry): entry is RosterEntry => 
      entry !== null && 
      entry.employee_name !== '' && 
      entry.employee_slack_id !== '' &&
      entry.manager_slack_id !== ''
    );
    
    log.info('Roster read successfully', { count: roster.length });
    
    return roster;
  } catch (error) {
    log.error('Error reading roster from Google Sheets', error as Error);
    throw error;
  }
}

/**
 * Read worker submissions from Google Sheets
 */
export async function readWorkerSubmissionsFromSheets(
  config: SheetsConfig,
  weekId?: string
): Promise<WorkerSubmission[]> {
  const log = logger.child({ action: 'read_worker_submissions' });
  const targetWeekId = weekId || getCurrentWeekId();
  
  try {
    const sheets = getSheetsClient();
    
    log.info('Reading worker submissions from Google Sheets', {
      spreadsheetId: config.spreadsheet_id,
      tab: config.worker_responses_tab,
      weekId: targetWeekId,
    });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.spreadsheet_id,
      range: `${config.worker_responses_tab}!A2:Z`, // Read all columns from row 2
    });
    
    const rows = response.data.values || [];
    
    if (rows.length === 0) {
      log.info('No worker submissions found');
      return [];
    }
    
    // Parse submissions
    // Expected columns: Timestamp | Employee Name | [other form fields...]
    // Timestamp format from Google Forms: "MM/DD/YYYY HH:MM:SS"
    const submissions: WorkerSubmission[] = [];
    
    for (const row of rows) {
      if (row.length < 2) continue;
      
      try {
        // Parse timestamp
        const timestampStr = row[0];
        const timestamp = parseGoogleFormsTimestamp(timestampStr);
        
        // Get week ID from timestamp
        const submissionWeekId = getWeekIdFromDate(timestamp);
        
        // Filter by week if specified
        if (weekId && submissionWeekId !== weekId) {
          continue;
        }
        
        const employeeName = row[1]?.trim() || '';
        
        if (!employeeName) continue;
        
        // Store all form data as a record
        const submissionData: Record<string, any> = {};
        row.forEach((value, index) => {
          submissionData[`field_${index}`] = value;
        });
        
        submissions.push({
          timestamp,
          employee_name: employeeName,
          week_id: submissionWeekId,
          submission_data: submissionData,
        });
      } catch (error) {
        log.warn('Error parsing worker submission row', {
          error: (error as Error).message,
          row,
        });
      }
    }
    
    log.info('Worker submissions read successfully', {
      count: submissions.length,
      weekId: targetWeekId,
    });
    
    return submissions;
  } catch (error) {
    log.error('Error reading worker submissions from Google Sheets', error as Error);
    throw error;
  }
}

/**
 * Read manager reviews from Google Sheets
 */
export async function readManagerReviewsFromSheets(
  config: SheetsConfig,
  weekId?: string
): Promise<ManagerReview[]> {
  const log = logger.child({ action: 'read_manager_reviews' });
  const targetWeekId = weekId || getCurrentWeekId();
  
  try {
    const sheets = getSheetsClient();
    
    log.info('Reading manager reviews from Google Sheets', {
      spreadsheetId: config.spreadsheet_id,
      tab: config.manager_responses_tab,
      weekId: targetWeekId,
    });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.spreadsheet_id,
      range: `${config.manager_responses_tab}!A2:Z`,
    });
    
    const rows = response.data.values || [];
    
    if (rows.length === 0) {
      log.info('No manager reviews found');
      return [];
    }
    
    // Parse reviews
    // Expected columns: Timestamp | Manager Name | Employee Name | Directive | Blocker Resolution | [other fields...]
    const reviews: ManagerReview[] = [];
    
    for (const row of rows) {
      if (row.length < 3) continue;
      
      try {
        const timestampStr = row[0];
        const timestamp = parseGoogleFormsTimestamp(timestampStr);
        const reviewWeekId = getWeekIdFromDate(timestamp);
        
        if (weekId && reviewWeekId !== weekId) {
          continue;
        }
        
        const managerName = row[1]?.trim() || '';
        const employeeName = row[2]?.trim() || '';
        
        if (!managerName || !employeeName) continue;
        
        // Extract directive and blocker resolution (adjust indices based on actual form)
        const directive = row[3]?.trim() || undefined;
        const blockerResolution = row[4]?.trim() || undefined;
        
        // Store all form data
        const reviewData: Record<string, any> = {};
        row.forEach((value, index) => {
          reviewData[`field_${index}`] = value;
        });
        
        reviews.push({
          timestamp,
          manager_name: managerName,
          employee_name: employeeName,
          week_id: reviewWeekId,
          directive,
          blocker_resolution: blockerResolution,
          review_data: reviewData,
        });
      } catch (error) {
        log.warn('Error parsing manager review row', {
          error: (error as Error).message,
          row,
        });
      }
    }
    
    log.info('Manager reviews read successfully', {
      count: reviews.length,
      weekId: targetWeekId,
    });
    
    return reviews;
  } catch (error) {
    log.error('Error reading manager reviews from Google Sheets', error as Error);
    throw error;
  }
}

/**
 * Parse Google Forms timestamp format
 * Expected format: "MM/DD/YYYY HH:MM:SS" or similar
 */
function parseGoogleFormsTimestamp(timestampStr: string): Date {
  // Try parsing common Google Forms timestamp formats
  const date = new Date(timestampStr);
  
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid timestamp format: ${timestampStr}`);
  }
  
  return date;
}

/**
 * Get ISO week ID from a date
 */
function getWeekIdFromDate(date: Date): string {
  const year = date.getFullYear();
  const week = getISOWeek(date);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

/**
 * Get ISO week number for a date
 */
function getISOWeek(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNumber = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

/**
 * Get sheets configuration from environment
 */
export function getSheetsConfigFromEnv(): SheetsConfig {
  return {
    spreadsheet_id: process.env.WEEKLY_CHECKINS_SPREADSHEET_ID || '',
    roster_tab: process.env.WEEKLY_CHECKINS_ROSTER_TAB || 'Roster',
    worker_responses_tab: process.env.WEEKLY_CHECKINS_WORKER_TAB || 'Worker Responses',
    manager_responses_tab: process.env.WEEKLY_CHECKINS_MANAGER_TAB || 'Manager Responses',
  };
}
