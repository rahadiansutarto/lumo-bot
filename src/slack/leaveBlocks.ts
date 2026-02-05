/**
 * Slack Block Kit builders for leave request UI
 */

import { LeaveRequest, PendingRequestSummary, OOOSummary } from '../types/leave';
import { formatDateRange } from '../utils/leavePolicy';

/**
 * Build leave request submission modal
 */
export function buildLeaveRequestModal() {
  return {
    type: 'modal',
    callback_id: 'leave_request_modal',
    title: {
      type: 'plain_text',
      text: 'Request Leave',
    },
    submit: {
      type: 'plain_text',
      text: 'Submit',
    },
    close: {
      type: 'plain_text',
      text: 'Cancel',
    },
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Submit a leave request*\nPlease fill out the form below. Remember: requests must be made at least 3 business days in advance.',
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'input',
        block_id: 'leave_type_block',
        element: {
          type: 'static_select',
          action_id: 'leave_type',
          placeholder: {
            type: 'plain_text',
            text: 'Select leave type',
          },
          options: [
            {
              text: { type: 'plain_text', text: 'Vacation' },
              value: 'vacation',
            },
            {
              text: { type: 'plain_text', text: 'Sick Leave' },
              value: 'sick',
            },
            {
              text: { type: 'plain_text', text: 'Personal Leave' },
              value: 'personal',
            },
            {
              text: { type: 'plain_text', text: 'Emergency' },
              value: 'emergency',
            },
          ],
        },
        label: {
          type: 'plain_text',
          text: 'Leave Type',
        },
      },
      {
        type: 'input',
        block_id: 'start_date_block',
        element: {
          type: 'datepicker',
          action_id: 'start_date',
          placeholder: {
            type: 'plain_text',
            text: 'Select start date',
          },
        },
        label: {
          type: 'plain_text',
          text: 'Start Date',
        },
      },
      {
        type: 'input',
        block_id: 'end_date_block',
        element: {
          type: 'datepicker',
          action_id: 'end_date',
          placeholder: {
            type: 'plain_text',
            text: 'Select end date',
          },
        },
        label: {
          type: 'plain_text',
          text: 'End Date',
        },
      },
      {
        type: 'input',
        block_id: 'reason_block',
        element: {
          type: 'plain_text_input',
          action_id: 'reason',
          multiline: true,
          placeholder: {
            type: 'plain_text',
            text: 'Optional: Provide additional context...',
          },
        },
        label: {
          type: 'plain_text',
          text: 'Reason',
        },
        optional: true,
      },
    ],
  };
}

/**
 * Build leave request confirmation message (sent to channel after submission)
 */
export function buildLeaveRequestConfirmation(leaveRequest: LeaveRequest) {
  const dateRange = formatDateRange(
    new Date(leaveRequest.start_date),
    new Date(leaveRequest.end_date)
  );
  
  return {
    text: `Leave Request Submitted - ${leaveRequest.request_id}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `Leave Request Submitted`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Request ID:*\n${leaveRequest.request_id}`,
          },
          {
            type: 'mrkdwn',
            text: `*Requester:*\n<@${leaveRequest.slack_user_id}>`,
          },
          {
            type: 'mrkdwn',
            text: `*Leave Type:*\n${capitalize(leaveRequest.leave_type)}`,
          },
          {
            type: 'mrkdwn',
            text: `*Duration:*\n${leaveRequest.total_days} business days`,
          },
          {
            type: 'mrkdwn',
            text: `*Dates:*\n${dateRange}`,
          },
          {
            type: 'mrkdwn',
            text: `*Date Submitted:*\n<!date^${Math.floor(leaveRequest.submitted_at.getTime() / 1000)}^{date_short_pretty} at {time}|${leaveRequest.submitted_at.toISOString()}>`,
          },
          {
            type: 'mrkdwn',
            text: `*Status:*\nSubmitted & Pending :hourglass: \nYour manager has been notified. \nExpect a response within 48 hours.`,
           },
        ],
      },
      ...(leaveRequest.reason
        ? [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Reason:*\n${leaveRequest.reason}`,
              },
            },
          ]
        : []),
    ],
  };
}

/**
 * Build leave request approval message (sent to managers)
 */
export function buildManagerApprovalMessage(leaveRequest: LeaveRequest) {
  const dateRange = formatDateRange(
    new Date(leaveRequest.start_date),
    new Date(leaveRequest.end_date)
  );
  
  return {
    text: `New Leave Request - ${leaveRequest.request_id} - Action Required`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'New Leave Request - Action Required',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Request ID:*\n${leaveRequest.request_id}`,
          },
          {
            type: 'mrkdwn',
            text: `*Employee:*\n<@${leaveRequest.slack_user_id}>`,
          },
          {
            type: 'mrkdwn',
            text: `*Leave Type:*\n${capitalize(leaveRequest.leave_type)}`,
          },
          {
            type: 'mrkdwn',
            text: `*Duration:*\n${leaveRequest.total_days} business days`,
          },
          {
            type: 'mrkdwn',
            text: `*Dates:*\n${dateRange}`,
          },
          {
            type: 'mrkdwn',
            text: `*Submitted:*\n<!date^${Math.floor(leaveRequest.submitted_at.getTime() / 1000)}^{date_short_pretty} at {time}|${leaveRequest.submitted_at.toISOString()}>`,
          },
        ],
      },
      ...(leaveRequest.reason
        ? [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Reason:*\n${leaveRequest.reason}`,
              },
            },
          ]
        : []),
      {
        type: 'actions',
        block_id: `approval_actions_${leaveRequest.request_id}`,
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✅ Approve',
              emoji: true,
            },
            style: 'primary',
            value: leaveRequest.request_id,
            action_id: 'approve_leave',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '💬 Approve with Comment',
              emoji: true,
            },
            value: leaveRequest.request_id,
            action_id: 'approve_with_comment',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '❌ Reject',
              emoji: true,
            },
            style: 'danger',
            value: leaveRequest.request_id,
            action_id: 'reject_leave',
          },
        ],
      },
    ],
  };
}

/**
 * Build approval comment modal
 */
export function buildApprovalCommentModal(requestId: string) {
  return {
    type: 'modal',
    callback_id: 'approval_comment_modal',
    private_metadata: requestId,
    title: {
      type: 'plain_text',
      text: 'Approve Leave',
    },
    submit: {
      type: 'plain_text',
      text: 'Approve',
    },
    close: {
      type: 'plain_text',
      text: 'Cancel',
    },
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Approving leave request: ${requestId}*\nAdd a comment or note:`,
        },
      },
      {
        type: 'input',
        block_id: 'approval_comment_block',
        element: {
          type: 'plain_text_input',
          action_id: 'approval_comment',
          multiline: true,
          placeholder: {
            type: 'plain_text',
            text: 'E.g., Approved. Please ensure handover is complete before leaving.',
          },
        },
        label: {
          type: 'plain_text',
          text: 'Comment',
        },
        optional: true,
      },
    ],
  };
}

/**
 * Build rejection reason modal
 */
export function buildRejectionModal(requestId: string) {
  return {
    type: 'modal',
    callback_id: 'rejection_reason_modal',
    private_metadata: requestId,
    title: {
      type: 'plain_text',
      text: 'Reject Leave',
    },
    submit: {
      type: 'plain_text',
      text: 'Reject',
    },
    close: {
      type: 'plain_text',
      text: 'Cancel',
    },
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Rejecting leave request: ${requestId}*\nPlease provide a reason for rejection:`,
        },
      },
      {
        type: 'input',
        block_id: 'rejection_reason_block',
        element: {
          type: 'plain_text_input',
          action_id: 'rejection_reason',
          multiline: true,
          placeholder: {
            type: 'plain_text',
            text: 'E.g., Overlaps with busy period, insufficient coverage, etc.',
          },
        },
        label: {
          type: 'plain_text',
          text: 'Reason for Rejection',
        },
      },
    ],
  };
}

/**
 * Build approved/rejected notification (sent to requester)
 */
export function buildDecisionNotification(
  leaveRequest: LeaveRequest,
  approved: boolean
) {
  const dateRange = formatDateRange(
    new Date(leaveRequest.start_date),
    new Date(leaveRequest.end_date)
  );
  
  return {
    text: approved ? `Leave Request Approved - ${leaveRequest.request_id}` : `Leave Request Rejected - ${leaveRequest.request_id}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: approved
            ? 'Leave Request Approved'
            : 'Leave Request Rejected',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: approved
            ? `Your leave request has been *approved* by <@${leaveRequest.approved_by}>`
            : `Your leave request has been *rejected* by <@${leaveRequest.approved_by}>`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Request ID:*\n${leaveRequest.request_id}`,
          },
          {
            type: 'mrkdwn',
            text: `*Leave Type:*\n${capitalize(leaveRequest.leave_type)}`,
          },
          {
            type: 'mrkdwn',
            text: `*Dates:*\n${dateRange}`,
          },
          {
            type: 'mrkdwn',
            text: `*Duration:*\n${leaveRequest.total_days} business days`,
          },
        ],
      },
      ...(!approved && leaveRequest.rejection_reason
        ? [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Reason for Rejection:*\n${leaveRequest.rejection_reason}`,
              },
            },
          ]
        : []),
    ],
  };
}

/**
 * Build daily OOO summary message
 */
export function buildDailyOOOSummary(oooList: OOOSummary[]) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  if (oooList.length === 0) {
    return {
      text: `Out of Office - ${today}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `Out of Office - ${today}`,
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'No one is out of office today. Full team available!',
          },
        },
      ],
    };
  }
  
  const oooItems = oooList.map((ooo) => {
    const dateRange = formatDateRange(
      new Date(ooo.start_date),
      new Date(ooo.end_date)
    );
    return `• <@${ooo.slack_user_id}> - ${capitalize(ooo.leave_type)} (${dateRange})`;
  });
  
  return {
    text: `Out of Office - ${today} - ${oooList.length} team member${oooList.length > 1 ? 's' : ''} out`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `Out of Office - ${today}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${oooList.length} team member${oooList.length > 1 ? 's' : ''} out today:*\n${oooItems.join('\n')}`,
        },
      },
    ],
  };
}

/**
 * Build pending requests summary for managers
 */
export function buildPendingRequestsSummary(pendingRequests: PendingRequestSummary[]) {
  if (pendingRequests.length === 0) {
    return {
      text: 'No pending leave requests',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'No pending leave requests. All caught up!',
          },
        },
      ],
    };
  }
  
  const requestItems = pendingRequests.map((req) => {
    const dateRange = formatDateRange(
      new Date(req.start_date),
      new Date(req.end_date)
    );
    const hoursPending = Math.floor(req.hours_pending);
    return `• *${req.request_id}* - <@${req.slack_user_id}> - ${capitalize(req.leave_type)} (${dateRange}) - _Pending for ${hoursPending}h_`;
  });
  
  return {
    text: `Pending Leave Requests - ${pendingRequests.length} request${pendingRequests.length > 1 ? 's' : ''}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'Pending Leave Requests',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${pendingRequests.length} request${pendingRequests.length > 1 ? 's' : ''} awaiting approval:*\n${requestItems.join('\n')}`,
        },
      },
    ],
  };
}

/**
 * Build reminder message for managers (pending request)
 */
export function buildReminderMessage(leaveRequest: LeaveRequest, reminderCount: number) {
  const dateRange = formatDateRange(
    new Date(leaveRequest.start_date),
    new Date(leaveRequest.end_date)
  );
  
  const hoursPending = Math.floor(
    (Date.now() - leaveRequest.submitted_at.getTime()) / (1000 * 60 * 60)
  );
  
  return {
    text: `Reminder: Leave Request ${leaveRequest.request_id} Still Pending`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `⏰ Reminder #${reminderCount}: Leave Request Pending`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Quick Reminder: ⏰ A leave request is waiting. You can fix it in ~10 seconds.`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Request ID:*\n${leaveRequest.request_id}`,
          },
          {
            type: 'mrkdwn',
            text: `*Employee:*\n<@${leaveRequest.slack_user_id}>`,
          },
          {
            type: 'mrkdwn',
            text: `*Leave Type:*\n${capitalize(leaveRequest.leave_type)}`,
          },
          {
            type: 'mrkdwn',
            text: `*Duration:*\n${leaveRequest.total_days} business days`,
          },
          {
            type: 'mrkdwn',
            text: `*Dates:*\n${dateRange}`,
          },
        ],
      },
      ...(leaveRequest.reason
        ? [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Reason:*\n${leaveRequest.reason}`,
              },
            },
          ]
        : []),
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✅ Approve',
              emoji: true,
            },
            style: 'primary',
            action_id: 'approve_leave',
            value: leaveRequest.request_id,
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '💬 Approve with Comment',
              emoji: true,
            },
            action_id: 'approve_with_comment',
            value: leaveRequest.request_id,
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '❌ Reject',
              emoji: true,
            },
            style: 'danger',
            action_id: 'reject_leave',
            value: leaveRequest.request_id,
          },
        ],
      },
    ],
  };
}

/**
 * Utility: Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
