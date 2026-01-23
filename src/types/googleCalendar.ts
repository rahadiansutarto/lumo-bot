/**
 * Google Calendar Types
 */

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction';
  }>;
  location?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  htmlLink?: string;
}

export interface GoogleCalendarEventInput {
  summary: string;
  description?: string;
  startDateTime: string; // ISO 8601 format
  endDateTime: string;   // ISO 8601 format
  attendees?: string[];  // Email addresses
  location?: string;
  timeZone?: string;
}

export interface GoogleOAuthTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  token_type: string;
  scope: string;
}

export interface UserCalendarAuth {
  userId: string;        // Slack user ID
  email: string;         // User's email (must match company domain)
  tokens: GoogleOAuthTokens;
  authorizedAt: string;  // ISO timestamp
}

export interface CalendarListEventsParams {
  timeMin?: string;      // ISO 8601 format
  timeMax?: string;      // ISO 8601 format
  maxResults?: number;
  query?: string;        // Free text search
}

export interface GoogleCalendarToolParams {
  action: 'list' | 'create' | 'get' | 'delete' | 'update';
  
  // For list action
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  query?: string;
  
  // For create/update actions
  event?: GoogleCalendarEventInput;
  
  // For get/delete/update actions
  eventId?: string;
}
