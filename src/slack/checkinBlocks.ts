/**
 * Slack Block Kit UI for Weekly Check-Ins
 * 
 * Contains all message variants for workers, managers, and leadership
 */

import { ComplianceReport } from '../types/weeklyCheckins';

/**
 * Worker reminder messages - Friday EOD (Primary)
 */
export const WORKER_PRIMARY_MESSAGES = [
  {
    id: 'worker_primary_1',
    text: '🚨 Weekly Check-In time, Calvinballer!\nDrop your Weekly Scorecard before the deadline.\nIf you don\'t… I will be forced to interpret silence as "nothing happened."\n⏳ Deadline: Saturday EOD\nImportant: After submitting the form, don\'t forget to click completed button here.',
  },
  {
    id: 'worker_primary_2',
    text: '🚨 Weekly Check-In time, Calvinballer!\nDrop your Weekly Scorecard so I don\'t have to keep showing up in your DMs like an unresolved side quest.\n⏳ Deadline: Saturday EOD\nImportant: After submitting the form, don\'t forget to click completed button here.',
  },
  {
    id: 'worker_primary_3',
    text: '🚨 Yes, it\'s that time again.\nWeekly check-in. You know the drill. I know the drill. Let\'s not pretend otherwise.\n⏳ Deadline: Saturday EOD\nImportant: After submitting the form, don\'t forget to click completed button here.',
  },
  {
    id: 'worker_primary_4',
    text: '🚨 Weekly Check-In alert.\nTell me what actually happened this week before Monday arrives and everyone forgets.\n⏳ Deadline: Saturday EOD\nForm → ✅ Completed → you disappear from my radar.',
  },
];

/**
 * Worker nudge messages - Saturday (If not completed)
 */
export const WORKER_NUDGE_MESSAGES = [
  {
    id: 'worker_nudge_1',
    text: '👀 Your weekly check-in is still pending.\nSubmit it before your name magically appears on the Wall of Shame.',
  },
  {
    id: 'worker_nudge_2',
    text: 'Tiny reminder: your weekly check-in still missing.\nI will continue appearing in your DMs until you complete this 👀.',
  },
  {
    id: 'worker_nudge_3',
    text: 'Hey 👋 Still waiting on your weekly check-in.\nI\'m not mad. I\'m just… updating the Wall of Shame watchlist.',
  },
  {
    id: 'worker_nudge_4',
    text: 'Your weekly scorecard is still not in.\nPlease submit it so I can stop staring at your name in disappointment.',
  },
  {
    id: 'worker_nudge_5',
    text: '⚠️ Weekly check-in pending.\nIf procrastination were a sport, this would be a strong opening move.\nNow let\'s close it out.',
  },
];

/**
 * Worker final nudge messages - Sunday EOD
 */
export const WORKER_FINAL_MESSAGES = [
  {
    id: 'worker_final_1',
    text: 'Final reminder ⚠️\nYour weekly check-in is still pending.\nIf you don\'t submit it, I\'m forced to mark you as "Missing in Action" in the weekly report.\nAnd yes… Leadership will see it.',
  },
  {
    id: 'worker_final_2',
    text: 'Final reminder ⚠️\nYour weekly check-in is still pending.\nI hate sending reminders almost as much as you hate receiving them.\nLet\'s make this our last one.',
  },
  {
    id: 'worker_final_3',
    text: 'Final reminder ⚠️\nYour weekly check-in is still pending.\nWe both know this will take less time than deciding what to watch next.',
  },
  {
    id: 'worker_final_4',
    text: 'Final reminder ⚠️\nYour weekly check-in is still pending.\nIt\'ll take less time than closing the 37 tabs you\'ve been emotionally attached to all week.',
  },
];

/**
 * Worker confirmation messages - After clicking "Completed"
 */
export const WORKER_CONFIRMATION_MESSAGES = [
  {
    id: 'worker_confirm_1',
    text: '✅ Confirmed. Weekly check-in received.\nYour name has been removed from the Wall of Shame watchlist.\nThe machine is happy. The logs are clean.\nYou may now proceed with your Calvinball life.',
  },
  {
    id: 'worker_confirm_2',
    text: '✅ Got it. Weekly check-in logged.\nCongrats — you\'re now invisible to my reminder system.\nEnjoy it while it lasts.',
  },
  {
    id: 'worker_confirm_3',
    text: '✅ Weekly check-in received.\nPerfect. Now I can stop chasing you like a clingy notification.',
  },
  {
    id: 'worker_confirm_4',
    text: '✅ Check-in received.\nYour productivity has been safely captured before it evaporated into the universe. Carry on, Calvinballer.',
  },
];

/**
 * Manager primary reminder - Monday Morning
 */
export const MANAGER_PRIMARY_MESSAGES = [
  {
    id: 'manager_primary_1',
    text: 'Good morning ☕\nYour Calvinballers have submitted their weekly scorecards.\nTime for you to do the manager thing: read them, review them, and give direction before they start freelancing priorities.\n🎯 Deadline: Monday, 9 PM Bali Time',
  },
  {
    id: 'manager_primary_2',
    text: 'Good morning ☕\nYour Calvinballers have submitted their weekly scorecards.\nApprove direction. Resolve blockers.\nYou know… leadership stuff 😄\n🎯 Deadline: Monday, 9 PM Bali Time',
  },
  {
    id: 'manager_primary_3',
    text: 'Good morning ☕\nWeekly check-ins are ready for review.\nTime to respond before your team starts interpreting your silence like modern art.\n🎯 Deadline: Monday, 9 PM Bali Time',
  },
];

/**
 * Manager nudge messages - Tuesday Morning
 */
export const MANAGER_NUDGE_MESSAGES = [
  {
    id: 'manager_nudge_1',
    text: 'Quick nudge 👋 Your manager reviews are still pending.\nI know you\'re busy… but the machine needs direction, not mystery.',
  },
  {
    id: 'manager_nudge_2',
    text: 'Friendly reminder: reviews still not submitted.\nYour team is waiting, and guessing is an expensive strategy.',
  },
  {
    id: 'manager_nudge_3',
    text: 'Hey 👀 Reviews still pending.\nIf leadership delays direction, the team will still move…\njust in random directions.',
  },
  {
    id: 'manager_nudge_4',
    text: 'Hello, there! Manager reviews still missing.\nIf leaders don\'t calibrate, the team will drift into the land of "random productivity."',
  },
  {
    id: 'manager_nudge_5',
    text: 'Reminder ⏰ You still have reviews to complete.\nThis is the part where Monday becomes "organized chaos" instead of just chaos.',
  },
];

/**
 * Manager final nudge - Tuesday Midday
 */
export const MANAGER_FINAL_MESSAGES = [
  {
    id: 'manager_final_1',
    text: 'Tuesday reminder ☕\nReviews are still pending.\nFun fact: teams don\'t magically hit high standards… they copy them.\nPlease lead by example.',
  },
  {
    id: 'manager_final_2',
    text: 'Your team submitted their scorecards.\nYour reviews are still missing.\nIf the standard matters, it has to start with you 🙂',
  },
  {
    id: 'manager_final_3',
    text: 'Quick check: manager reviews still pending.\nWe can\'t demand discipline from Calvinballers if leadership disappears into fog.\nLet\'s set the tone.',
  },
  {
    id: 'manager_final_4',
    text: 'Tuesday nudge ⚠️\nLeadership is a ritual, not a title.\nPlease complete the reviews so the week starts with clarity.',
  },
  {
    id: 'manager_final_5',
    text: 'Your Calvinballers did their part.\nNow it\'s your turn 😄\nGreat teams aren\'t built on reminders… but here we are.',
  },
];

/**
 * Manager confirmation - After completion
 */
export const MANAGER_CONFIRMATION_MESSAGES = [
  {
    id: 'manager_confirm_1',
    text: '✅ Reviews received.\nThe machine is calibrated.\nYour Calvinballers now know what "good" looks like this week.\nYou have officially closed the loop.',
  },
  {
    id: 'manager_confirm_2',
    text: '✅ Reviews received.\nEfficient. Decisive. Dangerous.\nI like it.',
  },
  {
    id: 'manager_confirm_3',
    text: '✅ Reviews received.\nYou\'ve officially prevented 3 unnecessary meetings.\nThat\'s leadership.',
  },
  {
    id: 'manager_confirm_4',
    text: '✅ Reviews received.\nThat took less time than picking a Netflix show.\nElite execution.',
  },
];

/**
 * Build worker reminder message with buttons
 */
export function buildWorkerReminderMessage(
  formUrl: string,
  variant: number = 0
): any {
  const message = WORKER_PRIMARY_MESSAGES[variant % WORKER_PRIMARY_MESSAGES.length];
  
  return {
    text: message.text,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message.text,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '👉 Open Weekly Check-In Form',
            },
            url: formUrl,
            style: 'primary',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✅ I\'ve completed it',
            },
            action_id: 'worker_completed',
            value: 'completed',
          },
        ],
      },
    ],
  };
}

/**
 * Build worker nudge message
 */
export function buildWorkerNudgeMessage(
  formUrl: string,
  variant: number = 0,
  isFinal: boolean = false
): any {
  const messages = isFinal ? WORKER_FINAL_MESSAGES : WORKER_NUDGE_MESSAGES;
  const message = messages[variant % messages.length];
  
  return {
    text: message.text,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message.text,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '👉 Open Weekly Check-In Form',
            },
            url: formUrl,
            style: 'primary',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✅ I\'ve completed it',
            },
            action_id: 'worker_completed',
            value: 'completed',
          },
        ],
      },
    ],
  };
}

/**
 * Build worker confirmation message
 */
export function buildWorkerConfirmationMessage(variant: number = 0): any {
  const message = WORKER_CONFIRMATION_MESSAGES[variant % WORKER_CONFIRMATION_MESSAGES.length];
  
  return {
    text: message.text,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message.text,
        },
      },
    ],
  };
}

/**
 * Build manager reminder message
 */
export function buildManagerReminderMessage(
  formUrl: string,
  directReportsCount: number,
  variant: number = 0
): any {
  const message = MANAGER_PRIMARY_MESSAGES[variant % MANAGER_PRIMARY_MESSAGES.length];
  
  const messageText = `${message.text}\n\n*Direct Reports Submitted:* ${directReportsCount}`;
  
  return {
    text: messageText,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: messageText,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '👉 Open Manager Review Form',
            },
            url: formUrl,
            style: 'primary',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✅ I\'ve completed my reviews',
            },
            action_id: 'manager_completed',
            value: 'completed',
          },
        ],
      },
    ],
  };
}

/**
 * Build manager nudge message
 */
export function buildManagerNudgeMessage(
  formUrl: string,
  variant: number = 0,
  isFinal: boolean = false
): any {
  const messages = isFinal ? MANAGER_FINAL_MESSAGES : MANAGER_NUDGE_MESSAGES;
  const message = messages[variant % messages.length];
  
  return {
    text: message.text,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message.text,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '👉 Open Manager Review Form',
            },
            url: formUrl,
            style: 'primary',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✅ I\'ve completed my reviews',
            },
            action_id: 'manager_completed',
            value: 'completed',
          },
        ],
      },
    ],
  };
}

/**
 * Build manager confirmation message
 */
export function buildManagerConfirmationMessage(variant: number = 0): any {
  const message = MANAGER_CONFIRMATION_MESSAGES[variant % MANAGER_CONFIRMATION_MESSAGES.length];
  
  return {
    text: message.text,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message.text,
        },
      },
    ],
  };
}

/**
 * Build worker feedback delivery message
 */
export function buildWorkerFeedbackMessage(
  directive?: string,
  blockerResolution?: string
): any {
  let text = '📬 Weekly calibration received.\n\n';
  
  if (directive) {
    text += `*This Week's Directive:*\n"${directive}"\n\n`;
  }
  
  if (blockerResolution) {
    text += `*Blocker Resolution:*\n"${blockerResolution}"\n\n`;
  }
  
  text += 'Alright. New week. Clean slate. Let\'s move.';
  
  return {
    text,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text,
        },
      },
    ],
  };
}

/**
 * Build weekly compliance report for leadership
 */
export function buildComplianceReportMessage(
  report: ComplianceReport,
  leadershipSlackIds: string[]
): any {
  const weekDisplay = report.week_id;
  const timestamp = report.generated_at.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Makassar', // Bali time
  });
  
  let text = `📊 *Weekly Check-In Compliance Report — Calvinball Engine Status*\n`;
  text += `_(Generated ${timestamp} Bali time)_\n\n`;
  
  // Workers Report
  text += `📌 *Workers Report*\n`;
  text += `• Workers Completed (On Time): ${report.workers_completed_on_time} / ${report.workers_total}\n`;
  text += `• Workers Late: ${report.workers_late}\n`;
  text += `• Workers Missing: ${report.workers_missed}\n\n`;
  
  // Managers Report
  text += `📌 *Managers Report*\n`;
  text += `• Managers Completed Reviews (On Time): ${report.managers_completed_on_time} / ${report.managers_total}\n`;
  text += `• Managers Late: ${report.managers_late}\n`;
  text += `• Managers Missing: ${report.managers_missed}\n\n`;
  
  // Wall of Shame Watchlist
  if (report.repeat_defaulters.length > 0) {
    text += `⚠️ *Wall of Shame Watchlist (Repeat Defaulters):*\n`;
    report.repeat_defaulters.forEach(defaulter => {
      text += `• <@${defaulter.slack_id}> (${defaulter.type}): Missed ${defaulter.missed_count} weeks\n`;
    });
    text += '\n';
  }
  
  text += '_A friendly nudge and a quiet moment of reflection on the phrase: "If leaders don\'t do it, no one will."_';
  
  return {
    text,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text,
        },
      },
    ],
  };
}
