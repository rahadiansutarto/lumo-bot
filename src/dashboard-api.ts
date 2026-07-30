import { orchestrate } from './orchestrator';
import { toolRegistry } from './tools';

type HealthState = 'online' | 'degraded' | 'offline';
type AttentionLevel = 'critical' | 'watch' | 'ok' | 'idle';

interface SystemStatus {
  name: string;
  state: HealthState;
  detail: string;
  latencyMs?: number;
}

interface DesktopAction {
  id: string;
  label: string;
  prompt: string;
  intent: string;
  disabled?: boolean;
}

interface AssistantPanel {
  mode: string;
  state: HealthState;
  headline: string;
  detail: string;
  lastSync: string;
}

interface LeavePanel {
  pendingCount: number;
  oooTodayCount: number;
  remindersDue: number;
  pending: Array<{
    requestId: string;
    requesterName: string;
    leaveType: string;
    dateRange: string;
    totalDays: number;
    hoursPending: number;
    reminderCount: number;
  }>;
  oooToday: Array<{
    requestId: string;
    requesterName: string;
    leaveType: string;
    dateRange: string;
  }>;
  audit: Array<{
    action: string;
    actor: string;
    requestId?: string;
    at: string;
  }>;
}

interface CheckinPanel {
  weekId: string;
  pendingWorkers: number;
  pendingManagers: number;
  workersTotal: number;
  managersTotal: number;
  workersDone: number;
  managersDone: number;
  repeatDefaulters: Array<{
    name: string;
    type: string;
    missedCount: number;
  }>;
  pendingWorkerNames: string[];
  pendingManagerIds: string[];
}

interface ToolPanel {
  registered: string[];
  configured: Array<{
    name: string;
    ready: boolean;
    detail: string;
  }>;
}

interface DesktopSnapshot {
  source: 'live';
  generatedAt: string;
  readiness: number;
  assistant: AssistantPanel;
  systems: SystemStatus[];
  leave: LeavePanel;
  checkins: CheckinPanel;
  tools: ToolPanel;
  actions: DesktopAction[];
  timeline: Array<{
    at: string;
    title: string;
    detail: string;
    level: AttentionLevel;
  }>;
}

const PORT = Number(process.env.DASHBOARD_API_PORT ?? 8787);

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.DASHBOARD_ALLOWED_ORIGIN ?? '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: corsHeaders,
  });
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(value: unknown) {
  if (!value) {
    return 'unknown';
  }

  return new Date(String(value)).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
}

function formatDateRange(start: unknown, end: unknown) {
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function getCurrentWeekId(): string {
  const now = new Date();
  const target = new Date(now.valueOf());
  const dayNumber = (now.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);

  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }

  const week = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${now.getFullYear()}-W${week.toString().padStart(2, '0')}`;
}

async function timed<T>(task: () => Promise<T>): Promise<{ data?: T; latencyMs: number; error?: string }> {
  const startedAt = performance.now();

  try {
    const data = await task();
    return {
      data,
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    return {
      latencyMs: Math.round(performance.now() - startedAt),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function createPool() {
  const { Pool } = await import('pg');

  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'leave_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    max: 4,
    idleTimeoutMillis: 1000,
    connectionTimeoutMillis: 1400,
  });
}

async function readDatabaseSnapshot() {
  const weekId = getCurrentWeekId();
  const pool = await createPool();

  try {
    const [
      pendingRequestsResult,
      oooTodayResult,
      auditResult,
      remindersResult,
      pendingWorkersResult,
      pendingManagersResult,
      complianceResult,
      repeatDefaultersResult,
    ] = await Promise.all([
      pool.query('SELECT * FROM pending_requests_summary ORDER BY hours_pending DESC LIMIT 5'),
      pool.query('SELECT * FROM approved_leaves_today ORDER BY requester_name LIMIT 5'),
      pool.query('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 6'),
      pool.query('SELECT COUNT(*)::int AS count FROM reminder_schedule WHERE is_active = TRUE AND next_reminder_at <= CURRENT_TIMESTAMP'),
      pool.query(
        `SELECT employee_name FROM weekly_checkin_tracking
         WHERE week_id = $1 AND worker_submitted = FALSE
         ORDER BY employee_name LIMIT 8`,
        [weekId],
      ),
      pool.query(
        `SELECT DISTINCT manager_slack_id FROM weekly_checkin_tracking
         WHERE week_id = $1 AND manager_review_submitted = FALSE
         ORDER BY manager_slack_id LIMIT 8`,
        [weekId],
      ),
      pool.query('SELECT * FROM weekly_compliance_summary WHERE week_id = $1', [weekId]),
      pool.query(
        `SELECT employee_name, employee_slack_id,
          COUNT(*) FILTER (WHERE worker_status = 'missed')::int AS worker_missed_count,
          COUNT(*) FILTER (WHERE manager_status = 'missed')::int AS manager_missed_count
         FROM weekly_checkin_tracking
         WHERE week_id >= TO_CHAR(CURRENT_DATE - INTERVAL '3 weeks', 'IYYY-"W"IW')
           AND week_id <= $1
         GROUP BY employee_name, employee_slack_id
         HAVING COUNT(*) FILTER (WHERE worker_status = 'missed') >= 2
             OR COUNT(*) FILTER (WHERE manager_status = 'missed') >= 2
         ORDER BY worker_missed_count DESC, manager_missed_count DESC
         LIMIT 4`,
        [weekId],
      ),
    ]);

    const compliance = complianceResult.rows[0] ?? {};

    return {
      leave: {
        pendingCount: pendingRequestsResult.rowCount ?? 0,
        oooTodayCount: oooTodayResult.rowCount ?? 0,
        remindersDue: remindersResult.rows[0]?.count ?? 0,
        pending: pendingRequestsResult.rows.map((row) => ({
          requestId: row.request_id,
          requesterName: row.requester_name,
          leaveType: row.leave_type,
          dateRange: formatDateRange(row.start_date, row.end_date),
          totalDays: Number(row.total_days ?? 0),
          hoursPending: Number(row.hours_pending ?? 0),
          reminderCount: Number(row.reminder_count ?? 0),
        })),
        oooToday: oooTodayResult.rows.map((row) => ({
          requestId: row.request_id,
          requesterName: row.requester_name,
          leaveType: row.leave_type,
          dateRange: formatDateRange(row.start_date, row.end_date),
        })),
        audit: auditResult.rows.map((row) => ({
          action: row.action,
          actor: row.slack_user_id,
          requestId: row.request_id,
          at: new Date(row.created_at).toLocaleString(),
        })),
      },
      checkins: {
        weekId,
        pendingWorkers: pendingWorkersResult.rowCount ?? 0,
        pendingManagers: pendingManagersResult.rowCount ?? 0,
        workersTotal: Number(compliance.total_employees ?? 0),
        managersTotal: Number(compliance.total_managers ?? 0),
        workersDone: Number(compliance.workers_on_time ?? 0),
        managersDone: Number(compliance.managers_on_time ?? 0),
        repeatDefaulters: repeatDefaultersResult.rows.map((row) => {
          const workerMisses = Number(row.worker_missed_count ?? 0);
          const managerMisses = Number(row.manager_missed_count ?? 0);

          return {
            name: row.employee_name,
            type: workerMisses >= managerMisses ? 'worker' : 'manager',
            missedCount: Math.max(workerMisses, managerMisses),
          };
        }),
        pendingWorkerNames: pendingWorkersResult.rows.map((row) => row.employee_name),
        pendingManagerIds: pendingManagersResult.rows.map((row) => row.manager_slack_id),
      },
    };
  } finally {
    await pool.end();
  }
}

async function checkRedis(): Promise<string> {
  const Redis = (await import('ioredis')).default;
  const redis = new Redis({
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
    password: process.env.REDIS_PASSWORD,
    lazyConnect: true,
    connectTimeout: 1200,
    maxRetriesPerRequest: 0,
    enableOfflineQueue: false,
  });

  try {
    await redis.connect();
    const pong = await redis.ping();
    return pong === 'PONG' ? 'connected' : 'degraded';
  } finally {
    redis.disconnect();
  }
}

function buildToolsPanel(): ToolPanel {
  return {
    registered: Array.from(toolRegistry.keys()),
    configured: [
      {
        name: 'Slack',
        ready: Boolean(process.env.SLACK_BOT_TOKEN && process.env.SLACK_APP_TOKEN),
        detail: 'Socket mode runtime',
      },
      {
        name: 'LLM',
        ready: Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY),
        detail: process.env.LLM_PROVIDER || 'provider auto-detected',
      },
      {
        name: 'Attio',
        ready: Boolean(process.env.ATTIO_API_KEY),
        detail: 'CRM memory',
      },
      {
        name: 'Google Sheets',
        ready: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_KEY && process.env.WEEKLY_CHECKINS_SPREADSHEET_ID),
        detail: 'check-in roster and forms',
      },
      {
        name: 'Google Calendar',
        ready: Boolean(process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CREDENTIALS),
        detail: 'schedule-aware answers',
      },
    ],
  };
}

function buildActions(hasDb: boolean, leave: LeavePanel, checkins: CheckinPanel): DesktopAction[] {
  return [
    {
      id: 'leave-nudge',
      label: 'Draft leave follow-up',
      intent: 'manager-action',
      prompt: 'Draft a concise Slack follow-up for leave requests that need manager action.',
      disabled: !hasDb || leave.pendingCount === 0,
    },
    {
      id: 'checkin-summary',
      label: 'Summarize check-ins',
      intent: 'weekly-report',
      prompt: `Summarize weekly check-in status for ${checkins.weekId}, including pending workers and managers.`,
      disabled: !hasDb,
    },
    {
      id: 'policy-search',
      label: 'Search leave policy',
      intent: 'docs-search',
      prompt: 'Search docs for the leave policy and summarize approval rules.',
    },
    {
      id: 'reviewer-nudge',
      label: 'Draft reviewer nudge',
      intent: 'slack-draft',
      prompt: 'Draft a warm Slack nudge for managers who have not completed weekly reviews.',
      disabled: !hasDb || checkins.pendingManagers === 0,
    },
  ];
}

function buildEmptyLeave(): LeavePanel {
  return {
    pendingCount: 0,
    oooTodayCount: 0,
    remindersDue: 0,
    pending: [],
    oooToday: [],
    audit: [],
  };
}

function buildEmptyCheckins(): CheckinPanel {
  return {
    weekId: getCurrentWeekId(),
    pendingWorkers: 0,
    pendingManagers: 0,
    workersTotal: 0,
    managersTotal: 0,
    workersDone: 0,
    managersDone: 0,
    repeatDefaulters: [],
    pendingWorkerNames: [],
    pendingManagerIds: [],
  };
}

async function buildDashboard(): Promise<DesktopSnapshot> {
  const [databaseSnapshot, redisHealth] = await Promise.all([
    timed(readDatabaseSnapshot),
    timed(checkRedis),
  ]);
  const tools = buildToolsPanel();
  const hasDb = Boolean(databaseSnapshot.data);
  const hasRedis = redisHealth.data === 'connected';
  const leave = databaseSnapshot.data?.leave ?? buildEmptyLeave();
  const checkins = databaseSnapshot.data?.checkins ?? buildEmptyCheckins();
  const readyTools = tools.configured.filter((tool) => tool.ready).length;
  const systems: SystemStatus[] = [
    {
      name: 'Postgres',
      state: hasDb ? 'online' : 'offline',
      detail: databaseSnapshot.error ?? 'Leave, OOO, audit, and check-in data available.',
      latencyMs: databaseSnapshot.latencyMs,
    },
    {
      name: 'Redis Queue',
      state: hasRedis ? 'online' : redisHealth.error ? 'offline' : 'degraded',
      detail: redisHealth.error ?? `Reminder queue is ${redisHealth.data}.`,
      latencyMs: redisHealth.latencyMs,
    },
    {
      name: 'Slack Runtime',
      state: tools.configured.find((tool) => tool.name === 'Slack')?.ready ? 'online' : 'degraded',
      detail: 'Bot tokens and socket mode connection config.',
      latencyMs: 1,
    },
    {
      name: 'LLM + Tools',
      state: tools.registered.length > 0 && tools.configured.find((tool) => tool.name === 'LLM')?.ready ? 'online' : 'degraded',
      detail: `${tools.registered.join(', ')} registered.`,
      latencyMs: 1,
    },
  ];
  const onlineSystems = systems.filter((system) => system.state === 'online').length;
  const readiness = Math.round(((onlineSystems + readyTools / tools.configured.length) / (systems.length + 1)) * 100);
  const needsAttention = leave.pendingCount + leave.remindersDue + checkins.pendingWorkers + checkins.pendingManagers;

  return {
    source: 'live',
    generatedAt: new Date().toISOString(),
    readiness,
    assistant: {
      mode: needsAttention > 0 ? 'Operator' : 'Standby',
      state: readiness > 75 ? 'online' : readiness > 45 ? 'degraded' : 'offline',
      headline: needsAttention > 0 ? `${needsAttention} live items need attention` : 'All visible systems are calm',
      detail: hasDb
        ? 'This view is backed by live leave, check-in, audit, OOO, and tool configuration data.'
        : 'Database is unavailable, so the assistant is showing setup state only.',
      lastSync: nowTime(),
    },
    systems,
    leave,
    checkins,
    tools,
    actions: buildActions(hasDb, leave, checkins),
    timeline: [
      {
        at: nowTime(),
        title: hasDb ? 'Live data loaded' : 'Database unavailable',
        detail: hasDb ? 'Postgres returned leave, OOO, audit, and check-in data.' : databaseSnapshot.error ?? 'No database data.',
        level: hasDb ? 'ok' : 'critical',
      },
      {
        at: nowTime(),
        title: `${leave.pendingCount} leave requests pending`,
        detail: leave.pendingCount > 0 ? 'Manager action is needed before SLA drift.' : 'No pending leave approvals found.',
        level: leave.pendingCount > 0 ? 'watch' : 'ok',
      },
      {
        at: nowTime(),
        title: `${checkins.pendingManagers} manager reviews pending`,
        detail: checkins.pendingManagers > 0 ? 'Weekly direction is not closed yet.' : 'No pending manager reviews found.',
        level: checkins.pendingManagers > 0 ? 'watch' : 'ok',
      },
      {
        at: nowTime(),
        title: `${tools.registered.length} orchestration tools registered`,
        detail: tools.registered.join(', ') || 'No tools registered.',
        level: tools.registered.length > 0 ? 'ok' : 'critical',
      },
    ],
  };
}

export function startDashboardApi(port = PORT) {
  const server = Bun.serve({
    port,
    async fetch(request) {
      const url = new URL(request.url);

      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: corsHeaders,
        });
      }

      if (request.method === 'GET' && url.pathname === '/api/dashboard') {
        return jsonResponse(await buildDashboard());
      }

      if (request.method === 'POST' && url.pathname === '/api/orchestrate') {
        const body = (await request.json().catch(() => null)) as { prompt?: string } | null;
        const prompt = body?.prompt?.trim();

        if (!prompt) {
          return jsonResponse({ error: 'Missing prompt' }, 400);
        }

        try {
          const result = await orchestrate(prompt);

          return jsonResponse({
            source: 'live',
            response: result.response,
            toolsUsed: result.toolsUsed,
          });
        } catch (error) {
          return jsonResponse(
            {
              error: error instanceof Error ? error.message : 'Command failed',
            },
            500,
          );
        }
      }

      return jsonResponse({ error: 'Not found' }, 404);
    },
  });

  console.log(`Lumo dashboard API listening on http://localhost:${port}`);
  return server;
}

if (import.meta.main) {
  startDashboardApi();
}
