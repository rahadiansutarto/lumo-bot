/**
 * Slack event handlers for leave management
 */

import { App, BlockAction, ViewSubmitAction, SlackViewAction } from '@slack/bolt';
import { logger } from '../logger';
import {
  submitLeaveRequest,
  updateLeaveRequestStatus,
  getLeaveRequest,
  isUserAdmin,
  logAudit,
  getOrCreateUser,
  scheduleReminder as dbScheduleReminder,
  getPendingRequests,
  getTodayOOO,
  getAuditLog,
} from '../db/postgres';
import { validateLeaveRequest } from '../utils/leavePolicy';
import {
  buildLeaveRequestModal,
  buildLeaveRequestConfirmation,
  buildManagerApprovalMessage,
  buildApprovalCommentModal,
  buildRejectionModal,
  buildDecisionNotification,
  buildDailyOOOSummary,
  buildPendingRequestsSummary,
  buildReminderMessage,
} from './leaveBlocks';
import {
  scheduleLeaveReminder,
  cancelLeaveReminder,
} from '../jobs/reminderQueue';
import { LeaveRequestSubmission } from '../types/leave';

/**
 * Register all leave management handlers
 */
export function setupLeaveHandlers(app: App): void {
  // Slash commands
  app.command('/request-leave', handleRequestLeaveCommand);
  app.command('/leave-status', handleLeaveStatusCommand);
  app.command('/leave-audit', handleLeaveAuditCommand);
  
  // Modal submissions
  app.view('leave_request_modal', handleLeaveRequestSubmission);
  app.view('approval_comment_modal', handleApprovalCommentSubmission);
  app.view('rejection_reason_modal', handleRejectionSubmission);
  
  // Button actions
  app.action('approve_leave', handleApproveLeave);
  app.action('approve_with_comment', handleApproveWithComment);
  app.action('reject_leave', handleRejectLeave);
}

/**
 * Handle /request-leave command
 */
async function handleRequestLeaveCommand({ ack, body, client }: any) {
  await ack();
  
  const log = logger.child({
    action: 'request_leave_command',
    userId: body.user_id,
  });
  
  try {
    log.info('Opening leave request modal');
    
    await client.views.open({
      trigger_id: body.trigger_id,
      view: buildLeaveRequestModal(),
    });
  } catch (error) {
    log.error('Error opening leave request modal', error as Error);
    
    // Try to respond to the user
    try {
      await client.chat.postEphemeral({
        channel: body.channel_id,
        user: body.user_id,
        text: 'Sorry, I encountered an error opening the leave request form. Please try again.',
      });
    } catch (ephemeralError) {
      log.error('Error sending error message', ephemeralError as Error);
    }
  }
}

/**
 * Handle /leave-status command (managers only)
 */
async function handleLeaveStatusCommand({ ack, body, client }: any) {
  await ack();
  
  const log = logger.child({
    action: 'leave_status_command',
    userId: body.user_id,
  });
  
  try {
    // Check if user is admin
    const isAdmin = await isUserAdmin(body.user_id);
    
    if (!isAdmin) {
      await client.chat.postEphemeral({
        channel: body.channel_id,
        user: body.user_id,
        text: 'Sorry, only managers can view leave status. Please contact your manager.',
      });
      return;
    }
    
    log.info('Fetching pending requests');
    
    const pendingRequests = await getPendingRequests();
    
    await client.chat.postEphemeral({
      channel: body.channel_id,
      user: body.user_id,
      ...buildPendingRequestsSummary(pendingRequests),
    });
    
    log.info('Pending requests sent', { count: pendingRequests.length });
  } catch (error) {
    log.error('Error handling leave status command', error as Error);
    
    await client.chat.postEphemeral({
      channel: body.channel_id,
      user: body.user_id,
      text: 'Sorry, I encountered an error fetching leave status. Please try again.',
    });
  }
}

/**
 * Handle /leave-audit command (managers only)
 */
async function handleLeaveAuditCommand({ ack, body, client }: any) {
  await ack();
  
  const log = logger.child({
    action: 'leave_audit_command',
    userId: body.user_id,
  });
  
  try {
    // Check if user is admin
    const isAdmin = await isUserAdmin(body.user_id);
    
    if (!isAdmin) {
      await client.chat.postEphemeral({
        channel: body.channel_id,
        user: body.user_id,
        text: 'Sorry, only managers can view audit logs. Please contact your manager.',
      });
      return;
    }
    
    log.info('Fetching audit log');
    
    const auditEntries = await getAuditLog();
    
    // Format audit entries
    const formattedEntries = auditEntries.slice(0, 20).map((entry: any) => {
      const timestamp = new Date(entry.created_at).toLocaleString();
      return `• ${timestamp} - <@${entry.slack_user_id}> - ${entry.action}${entry.request_id ? ` - ${entry.request_id}` : ''}`;
    });
    
    await client.chat.postEphemeral({
      channel: body.channel_id,
      user: body.user_id,
      text: `*Audit Log (Last 20 Actions)*\n\n${formattedEntries.join('\n')}`,
    });
    
    log.info('Audit log sent', { count: auditEntries.length });
  } catch (error) {
    log.error('Error handling audit command', error as Error);
    
    await client.chat.postEphemeral({
      channel: body.channel_id,
      user: body.user_id,
      text: 'Sorry, I encountered an error fetching audit logs. Please try again.',
    });
  }
}

/**
 * Handle leave request modal submission
 */
async function handleLeaveRequestSubmission({ ack, body, view, client }: any) {
  const userId = body.user.id;
  const userName = body.user.name;
  
  const log = logger.child({
    action: 'leave_request_submission',
    userId,
    userName,
  });
  
  // Extract form values
  const values = view.state.values;
  const leaveType = values.leave_type_block.leave_type.selected_option.value;
  const startDate = values.start_date_block.start_date.selected_date;
  const endDate = values.end_date_block.end_date.selected_date;
  const reason = values.reason_block?.reason?.value || '';
  
  log.info('Processing leave request', { leaveType, startDate, endDate });
  
  // Validate the request
  const validation = validateLeaveRequest(startDate, endDate);
  
  if (!validation.valid) {
    log.warn('Leave request validation failed', { error: validation.error_message });
    
    await ack({
      response_action: 'errors',
      errors: {
        start_date_block: validation.error_message || 'Invalid date',
      },
    });
    return;
  }
  
  // Acknowledge modal
  await ack();
  
  try {
    // Ensure user exists in database
    await getOrCreateUser(userId, userName);
    
    // Create leave request submission
    const submission: LeaveRequestSubmission = {
      slack_user_id: userId,
      requester_name: userName,
      leave_type: leaveType as any,
      start_date: startDate,
      end_date: endDate,
      reason,
    };
    
    const leaveRequest = await submitLeaveRequest(submission);
    
    log.info('Leave request created', {
      requestId: leaveRequest.request_id,
      totalDays: leaveRequest.total_days,
    });
    
    // Send confirmation to user in DM
    await client.chat.postMessage({
      channel: userId,
      ...buildLeaveRequestConfirmation(leaveRequest),
    });
    
    // Send approval request to managers
    await sendToManagers(client, leaveRequest);
    
    // Schedule reminder in database
    const nextReminderAt = new Date();
    nextReminderAt.setMinutes(nextReminderAt.getMinutes() + 5);
    await dbScheduleReminder(leaveRequest.request_id, nextReminderAt);
    
    // Schedule reminder in BullMQ
    await scheduleLeaveReminder(leaveRequest.request_id);
    
    // Log audit
    await logAudit(userId, 'submit', leaveRequest.request_id);
    
    log.info('Leave request processed successfully');
  } catch (error) {
    log.error('Error processing leave request', error as Error);
    
    // Send error message to user
    try {
      await client.chat.postMessage({
        channel: userId,
        text: 'Sorry, there was an error submitting your leave request. Please try again or contact your manager.',
      });
    } catch (messageError) {
      log.error('Error sending error message', messageError as Error);
    }
  }
}

/**
 * Handle approve button click
 */
async function handleApproveLeave({ ack, body, client }: any) {
  await ack();
  
  const action = body.actions[0] as BlockAction;
  const requestId = (action as any).value as string;
  const managerId = body.user.id;
  
  const log = logger.child({
    action: 'approve_leave',
    requestId,
    managerId,
  });
  
  try {
    log.info('Processing leave approval');
    
    // Update request status
    await updateLeaveRequestStatus({
      request_id: requestId,
      decision: 'approved',
      approved_by: managerId,
    });
    
    // Cancel future reminders
    await cancelLeaveReminder(requestId);
    
    // Get updated request
    const leaveRequest = await getLeaveRequest(requestId);
    
    if (!leaveRequest) {
      throw new Error('Leave request not found after approval');
    }
    
    // Send notification to employee
    await client.chat.postMessage({
      channel: leaveRequest.slack_user_id,
      ...buildDecisionNotification(leaveRequest, true),
    });
    
    // Update manager's message
    await client.chat.update({
      channel: body.channel.id,
      ts: body.message.ts,
      text: `Leave request ${requestId} has been approved`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ *Leave Request Approved*\nRequest ${requestId} was approved by <@${managerId}>`,
          },
        },
      ],
    });
    
    // Log audit
    await logAudit(managerId, 'approve', requestId);
    
    log.info('Leave request approved successfully');
  } catch (error) {
    log.error('Error approving leave request', error as Error);
    
    await client.chat.postMessage({
      channel: managerId,
      text: `Sorry, there was an error approving request ${requestId}. Please try again.`,
    });
  }
}

/**
 * Handle approve with comment button click
 */
async function handleApproveWithComment({ ack, body, client }: any) {
  await ack();
  
  const action = body.actions[0] as BlockAction;
  const requestId = (action as any).value as string;
  
  const log = logger.child({
    action: 'approve_with_comment',
    requestId,
  });
  
  try {
    log.info('Opening approval comment modal');
    
    await client.views.open({
      trigger_id: body.trigger_id,
      view: buildApprovalCommentModal(requestId),
    });
  } catch (error) {
    log.error('Error opening approval comment modal', error as Error);
  }
}

/**
 * Handle approval comment modal submission
 */
async function handleApprovalCommentSubmission({ ack, body, view, client }: any) {
  const managerId = body.user.id;
  const requestId = view.private_metadata;
  
  const log = logger.child({
    action: 'approval_comment_submission',
    requestId,
    managerId,
  });
  
  await ack();
  
  try {
    log.info('Processing leave approval with comment');
    
    // Get approval comment
    const values = view.state.values;
    const approvalComment = values.approval_comment_block?.approval_comment?.value || '';
    
    // Update request status
    await updateLeaveRequestStatus({
      request_id: requestId,
      decision: 'approved',
      approved_by: managerId,
    });
    
    // Cancel future reminders
    await cancelLeaveReminder(requestId);
    
    // Get updated request
    const leaveRequest = await getLeaveRequest(requestId);
    
    if (!leaveRequest) {
      throw new Error('Leave request not found after approval');
    }
    
    // Send notification to employee (with comment if provided)
    const notificationBlocks = buildDecisionNotification(leaveRequest, true);
    
    // Add comment section if comment was provided
    if (approvalComment) {
      notificationBlocks.blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Manager's Note:*\n${approvalComment}`,
        },
      });
    }
    
    await client.chat.postMessage({
      channel: leaveRequest.slack_user_id,
      ...notificationBlocks,
    });
    
    // Log audit with comment
    await logAudit(managerId, 'approve', requestId, {
      approval_comment: approvalComment || 'No comment',
    });
    
    log.info('Leave request approved with comment successfully');
  } catch (error) {
    log.error('Error approving leave request with comment', error as Error);
    
    await client.chat.postMessage({
      channel: managerId,
      text: `Sorry, there was an error approving request ${requestId}. Please try again.`,
    });
  }
}

/**
 * Handle reject button click
 */
async function handleRejectLeave({ ack, body, client }: any) {
  await ack();
  
  const action = body.actions[0] as BlockAction;
  const requestId = (action as any).value as string;
  
  const log = logger.child({
    action: 'reject_leave',
    requestId,
  });
  
  try {
    log.info('Opening rejection modal');
    
    await client.views.open({
      trigger_id: body.trigger_id,
      view: buildRejectionModal(requestId),
    });
  } catch (error) {
    log.error('Error opening rejection modal', error as Error);
  }
}

/**
 * Handle rejection modal submission
 */
async function handleRejectionSubmission({ ack, body, view, client }: any) {
  const managerId = body.user.id;
  const requestId = view.private_metadata;
  
  const log = logger.child({
    action: 'rejection_submission',
    requestId,
    managerId,
  });
  
  await ack();
  
  try {
    log.info('Processing leave rejection');
    
    // Get rejection reason
    const values = view.state.values;
    const rejectionReason = values.rejection_reason_block?.rejection_reason?.value || 'No reason provided';
    
    // Update request status
    await updateLeaveRequestStatus({
      request_id: requestId,
      decision: 'rejected',
      approved_by: managerId,
      rejection_reason: rejectionReason,
    });
    
    // Cancel future reminders
    await cancelLeaveReminder(requestId);
    
    // Get updated request
    const leaveRequest = await getLeaveRequest(requestId);
    
    if (!leaveRequest) {
      throw new Error('Leave request not found after rejection');
    }
    
    // Send notification to employee
    await client.chat.postMessage({
      channel: leaveRequest.slack_user_id,
      ...buildDecisionNotification(leaveRequest, false),
    });
    
    // Log audit
    await logAudit(managerId, 'reject', requestId, {
      rejection_reason: rejectionReason,
    });
    
    log.info('Leave request rejected successfully');
  } catch (error) {
    log.error('Error rejecting leave request', error as Error);
    
    await client.chat.postMessage({
      channel: managerId,
      text: `Sorry, there was an error rejecting request ${requestId}. Please try again.`,
    });
  }
}

/**
 * Send approval request to all managers
 */
async function sendToManagers(client: any, leaveRequest: any): Promise<void> {
  // TODO: Get manager IDs from database
  // For now, hardcode Axel and Nadia's IDs
  const allManagerIds = [process.env.AXEL_SLACK_ID, process.env.NADIA_SLACK_ID].filter(Boolean);
  
  // Remove duplicates (in case both managers have the same ID)
  const managerIds = Array.from(new Set(allManagerIds));
  
  if (managerIds.length === 0) {
    logger.warn('No manager IDs configured');
    return;
  }
  
  for (const managerId of managerIds) {
    try {
      await client.chat.postMessage({
        channel: managerId!,
        ...buildManagerApprovalMessage(leaveRequest),
      });
      
      logger.info('Approval request sent to manager', { managerId });
    } catch (error) {
      logger.error('Error sending approval request to manager', error as Error, {
        managerId,
      });
    }
  }
}

/**
 * Send reminder to managers for pending leave request
 */
export async function sendReminderToManagers(
  client: any,
  leaveRequest: any,
  reminderCount: number
): Promise<void> {
  const log = logger.child({ action: 'send_reminder', requestId: leaveRequest.request_id });
  
  const allManagerIds = [process.env.AXEL_SLACK_ID, process.env.NADIA_SLACK_ID].filter(Boolean);
  
  // Remove duplicates (in case both managers have the same ID)
  const managerIds = Array.from(new Set(allManagerIds));
  
  if (managerIds.length === 0) {
    log.warn('No manager IDs configured');
    return;
  }
  
  for (const managerId of managerIds) {
    try {
      await client.chat.postMessage({
        channel: managerId!,
        ...buildReminderMessage(leaveRequest, reminderCount),
      });
      
      log.info('Reminder sent to manager', { managerId, reminderCount });
    } catch (error) {
      log.error('Error sending reminder to manager', error as Error, {
        managerId,
      });
    }
  }
}

/**
 * Send daily OOO summary to channel
 */
export async function sendDailyOOOSummary(client: any, channelId: string): Promise<void> {
  const log = logger.child({ action: 'daily_ooo_summary' });
  
  try {
    log.info('Sending daily OOO summary');
    
    const oooList = await getTodayOOO();
    
    await client.chat.postMessage({
      channel: channelId,
      ...buildDailyOOOSummary(oooList),
    });
    
    log.info('Daily OOO summary sent', { oooCount: oooList.length });
  } catch (error) {
    log.error('Error sending daily OOO summary', error as Error);
  }
}

/**
 * Send pending requests reminder to managers
 */
export async function sendPendingRequestsReminder(client: any): Promise<void> {
  const log = logger.child({ action: 'pending_requests_reminder' });
  
  try {
    log.info('Sending pending requests reminder');
    
    const pendingRequests = await getPendingRequests();
    
    if (pendingRequests.length === 0) {
      log.info('No pending requests to remind about');
      return;
    }
    
    const allManagerIds = [process.env.AXEL_SLACK_ID, process.env.NADIA_SLACK_ID].filter(Boolean);
    
    // Remove duplicates (in case both managers have the same ID)
    const managerIds = Array.from(new Set(allManagerIds));
    
    for (const managerId of managerIds) {
      try {
        await client.chat.postMessage({
          channel: managerId!,
          ...buildPendingRequestsSummary(pendingRequests),
        });
        
        log.info('Reminder sent to manager', { managerId });
      } catch (error) {
        log.error('Error sending reminder to manager', error as Error, {
          managerId,
        });
      }
    }
  } catch (error) {
    log.error('Error sending pending requests reminder', error as Error);
  }
}
