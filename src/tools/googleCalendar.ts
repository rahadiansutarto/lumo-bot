/**
 * Google Calendar Tool
 * 
 * Provides calendar access for authenticated users:
 * - List events
 * - Create events
 * - Get event details
 * - Delete events
 * - Update events
 */

import { google } from 'googleapis';
import type { Tool } from './index';
import type {
  GoogleCalendarToolParams,
  GoogleCalendarEvent,
  CalendarListEventsParams,
  GoogleCalendarEventInput,
} from '../types/googleCalendar';
import {
  getAuthenticatedClient,
  isUserAuthenticated,
  getAuthorizationUrl,
} from '../auth/googleCalendar';

/**
 * Format event for display
 */
function formatEvent(event: any): GoogleCalendarEvent {
  return {
    id: event.id,
    summary: event.summary || 'Untitled Event',
    description: event.description,
    start: event.start,
    end: event.end,
    attendees: event.attendees?.map((a: any) => ({
      email: a.email,
      displayName: a.displayName,
      responseStatus: a.responseStatus,
    })),
    location: event.location,
    status: event.status,
    htmlLink: event.htmlLink,
  };
}

/**
 * Format event for human-readable display (Slack mrkdwn format)
 */
function formatEventSummary(event: GoogleCalendarEvent): string {
  const start = event.start.dateTime || event.start.date;
  const end = event.end.dateTime || event.end.date;
  
  let summary = `📅 *${event.summary}*\n`;
  summary += `   Time: ${new Date(start!).toLocaleString()}`;
  
  if (event.start.dateTime && event.end.dateTime) {
    const startTime = new Date(start!);
    const endTime = new Date(end!);
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
    summary += ` (${durationMinutes} minutes)`;
  }
  
  summary += '\n';
  
  if (event.location) {
    summary += `   Location: ${event.location}\n`;
  }
  
  if (event.attendees && event.attendees.length > 0) {
    summary += `   Attendees: ${event.attendees.map(a => a.email).join(', ')}\n`;
  }
  
  if (event.description) {
    summary += `   Description: ${event.description}\n`;
  }
  
  if (event.htmlLink) {
    summary += `   <${event.htmlLink}|View in Calendar>\n`;
  }
  
  return summary;
}

/**
 * List calendar events
 */
async function listEvents(
  userId: string,
  params: CalendarListEventsParams
): Promise<string> {
  const auth = await getAuthenticatedClient(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  // Default timeMin to start of today (midnight) instead of current time
  // This ensures we see all events for the day, including ones that started earlier
  let defaultTimeMin = new Date();
  defaultTimeMin.setHours(0, 0, 0, 0);

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: params.timeMin || defaultTimeMin.toISOString(),
    timeMax: params.timeMax,
    maxResults: params.maxResults || 10,
    singleEvents: true,
    orderBy: 'startTime',
    q: params.query,
  });

  const events = response.data.items || [];

  if (events.length === 0) {
    return 'No upcoming events found.';
  }

  const formattedEvents = events.map((e) => formatEvent(e));
  
  let result = `*Found ${events.length} event(s):*\n\n`;
  result += formattedEvents.map(formatEventSummary).join('\n');
  
  return result;
}

/**
 * Create a calendar event
 */
async function createEvent(
  userId: string,
  eventInput: GoogleCalendarEventInput
): Promise<string> {
  const auth = await getAuthenticatedClient(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  const event = {
    summary: eventInput.summary,
    description: eventInput.description,
    location: eventInput.location,
    start: {
      dateTime: eventInput.startDateTime,
      timeZone: eventInput.timeZone || 'America/Los_Angeles',
    },
    end: {
      dateTime: eventInput.endDateTime,
      timeZone: eventInput.timeZone || 'America/Los_Angeles',
    },
    attendees: eventInput.attendees?.map((email) => ({ email })),
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    sendUpdates: 'all', // Send email notifications to attendees
  });

  const createdEvent = formatEvent(response.data);
  
  return `✅ *Event created successfully!*\n\n${formatEventSummary(createdEvent)}`;
}

/**
 * Get a specific event
 */
async function getEvent(userId: string, eventId: string): Promise<string> {
  const auth = await getAuthenticatedClient(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  const response = await calendar.events.get({
    calendarId: 'primary',
    eventId,
  });

  const event = formatEvent(response.data);
  return formatEventSummary(event);
}

/**
 * Delete an event
 */
async function deleteEvent(userId: string, eventId: string): Promise<string> {
  const auth = await getAuthenticatedClient(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
    sendUpdates: 'all',
  });

  return `✅ *Event deleted successfully*\n\n_Event ID: ${eventId}_`;
}

/**
 * Update an event
 */
async function updateEvent(
  userId: string,
  eventId: string,
  eventInput: GoogleCalendarEventInput
): Promise<string> {
  const auth = await getAuthenticatedClient(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  const event = {
    summary: eventInput.summary,
    description: eventInput.description,
    location: eventInput.location,
    start: {
      dateTime: eventInput.startDateTime,
      timeZone: eventInput.timeZone || 'America/Los_Angeles',
    },
    end: {
      dateTime: eventInput.endDateTime,
      timeZone: eventInput.timeZone || 'America/Los_Angeles',
    },
    attendees: eventInput.attendees?.map((email) => ({ email })),
  };

  const response = await calendar.events.update({
    calendarId: 'primary',
    eventId,
    requestBody: event,
    sendUpdates: 'all',
  });

  const updatedEvent = formatEvent(response.data);
  
  return `✅ *Event updated successfully!*\n\n${formatEventSummary(updatedEvent)}`;
}

/**
 * Google Calendar Tool
 */
export const googleCalendar: Tool = {
  name: 'googleCalendar',
  description: 'Access and manage your Google Calendar. List events, create meetings, check availability, and more. Each user accesses their own calendar. When listing events for "today", set timeMax to end of today to see all events for the day.',
  
  parameters: {
    action: {
      type: 'string',
      description: 'Action to perform: "list" (view events), "create" (create event), "get" (get event details), "delete" (delete event), "update" (update event)',
      required: true,
    },
    timeMin: {
      type: 'string',
      description: 'Start time for listing events (ISO 8601 format, e.g., "2024-01-20T00:00:00Z"). Defaults to start of today (midnight). For "today" queries, you can omit this.',
      required: false,
    },
    timeMax: {
      type: 'string',
      description: 'End time for listing events (ISO 8601 format). For "today" queries, set this to end of today (23:59:59) to see all events for the day.',
      required: false,
    },
    maxResults: {
      type: 'number',
      description: 'Maximum number of events to return (default: 10)',
      required: false,
    },
    query: {
      type: 'string',
      description: 'Free text search query to filter events',
      required: false,
    },
    event: {
      type: 'object',
      description: 'Event details for create/update actions. Must include: summary, startDateTime, endDateTime. Optional: description, location, attendees (array of emails), timeZone',
      required: false,
    },
    eventId: {
      type: 'string',
      description: 'Event ID for get/delete/update actions',
      required: false,
    },
  },

  execute: async (params: Record<string, any>) => {
    try {
      const { action, userId } = params as GoogleCalendarToolParams & { userId?: string };

      // Require userId for personalized calendar access
      if (!userId) {
        return {
          success: false,
          error: 'User ID is required for calendar access',
        };
      }

      // Check if user is authenticated
      if (!isUserAuthenticated(userId)) {
        const authUrl = getAuthorizationUrl(userId);
        return {
          success: false,
          error: 'Calendar not connected',
          requiresAuth: true,
          message: `I don't have access to your Google Calendar yet. To check your meetings, you'll need to connect your calendar first.`,
          authUrl,
          slackBlocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: "📅 *Connect Your Google Calendar*\n\nI don't have access to your calendar yet. Once you authorize, I'll be able to help you check meetings and manage your schedule.",
              },
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: '🔗 Connect Calendar',
                    emoji: true,
                  },
                  url: authUrl,
                  style: 'primary',
                  action_id: 'connect_calendar',
                },
              ],
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: '_After authorizing, just ask me again about your meetings!_',
                },
              ],
            },
          ],
        };
      }

      // Execute requested action
      switch (action) {
        case 'list': {
          const result = await listEvents(userId, {
            timeMin: params.timeMin,
            timeMax: params.timeMax,
            maxResults: params.maxResults,
            query: params.query,
          });
          return { success: true, result };
        }

        case 'create': {
          if (!params.event) {
            return {
              success: false,
              error: 'Event details required for create action',
            };
          }
          const result = await createEvent(userId, params.event);
          return { success: true, result };
        }

        case 'get': {
          if (!params.eventId) {
            return {
              success: false,
              error: 'Event ID required for get action',
            };
          }
          const result = await getEvent(userId, params.eventId);
          return { success: true, result };
        }

        case 'delete': {
          if (!params.eventId) {
            return {
              success: false,
              error: 'Event ID required for delete action',
            };
          }
          const result = await deleteEvent(userId, params.eventId);
          return { success: true, result };
        }

        case 'update': {
          if (!params.eventId || !params.event) {
            return {
              success: false,
              error: 'Event ID and event details required for update action',
            };
          }
          const result = await updateEvent(userId, params.eventId, params.event);
          return { success: true, result };
        }

        default:
          return {
            success: false,
            error: `Unknown action: ${action}. Use: list, create, get, delete, or update`,
          };
      }
    } catch (error: any) {
      console.error('Google Calendar error:', error);
      
      return {
        success: false,
        error: error.message || 'Failed to access calendar',
        details: error.errors || error.response?.data,
      };
    }
  },
};
