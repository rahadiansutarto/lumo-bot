import { orchestrate } from './orchestrator';
import { toolRegistry } from './tools';

type HealthState = 'online' | 'degraded' | 'offline';

interface SystemStatus {
  name: string;
  state: HealthState;
  detail: string;
  latencyMs?: number;
}

interface DashboardSnapshot {
  source: 'live';
  generatedAt: string;
  readiness: number;
  systems: SystemStatus[];
  workflows: Array<{
    id: string;
    name: string;
    owner: string;
    status: 'running' | 'attention' | 'idle';
    progress: number;
    detail: string;
    signal: string;
  }>;
  queue: Array<{
    id: string;
    type: string;
    title: string;
    detail: string;
    urgency: 'high' | 'medium' | 'low';
    eta: string;
  }>;
  briefs: Array<{
    title: string;
    body: string;
    tone: 'calm' | 'sharp' | 'warm';
  }>;
  metrics: Array<{
    label: string;
    value: string;
    delta: string;
  }>;
  commandSuggestions: string[];
  trace: Array<{
    at: string;
    label: string;
    detail: string;
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

async function checkPostgres(): Promise<string> {
  const hasDatabaseConfig =
    Boolean(process.env.DATABASE_URL) || Boolean(process.env.DB_HOST && process.env.DB_NAME);

  if (!hasDatabaseConfig) {
    return 'missing config';
  }

  const { Pool } = await import('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 1200,
  });

  try {
    await pool.query('SELECT 1');
    return 'connected';
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

async function buildDashboard(): Promise<DashboardSnapshot> {
  const [databaseHealth, redisHealth] = await Promise.all([
    timed(checkPostgres),
    timed(checkRedis),
  ]);

  const databaseOnline = databaseHealth.data === 'connected';
  const redisOnline = redisHealth.data === 'connected';
  const sheetsConfigured = Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY && process.env.WEEKLY_CHECKINS_SPREADSHEET_ID,
  );
  const slackConfigured = Boolean(process.env.SLACK_BOT_TOKEN && process.env.SLACK_APP_TOKEN);
  const toolCount = toolRegistry.size;

  const systems: SystemStatus[] = [
    {
      name: 'Postgres',
      state: databaseOnline ? 'online' : databaseHealth.error ? 'offline' : 'degraded',
      detail: databaseHealth.error ?? `Database is ${databaseHealth.data}.`,
      latencyMs: databaseHealth.latencyMs,
    },
    {
      name: 'Redis Queue',
      state: redisOnline ? 'online' : redisHealth.error ? 'offline' : 'degraded',
      detail: redisHealth.error ?? `Reminder queue is ${redisHealth.data}.`,
      latencyMs: redisHealth.latencyMs,
    },
    {
      name: 'Google Sheets',
      state: sheetsConfigured ? 'online' : 'degraded',
      detail: sheetsConfigured
        ? 'Weekly roster and response sheets are configured.'
        : 'Set GOOGLE_SERVICE_ACCOUNT_KEY and WEEKLY_CHECKINS_SPREADSHEET_ID.',
      latencyMs: 1,
    },
    {
      name: 'Tool Registry',
      state: toolCount > 0 ? 'online' : 'offline',
      detail: `${Array.from(toolRegistry.keys()).join(', ')} registered for orchestration.`,
      latencyMs: 1,
    },
    {
      name: 'Slack Bot Runtime',
      state: slackConfigured ? 'online' : 'degraded',
      detail: 'Socket mode tokens are checked from environment configuration.',
      latencyMs: 1,
    },
  ];

  const onlineCount = systems.filter((system) => system.state === 'online').length;
  const readiness = Math.round((onlineCount / systems.length) * 100);
  const hasLeaveAttention = !databaseOnline || !redisOnline || !slackConfigured;
  const hasCheckinAttention = !databaseOnline || !redisOnline || !sheetsConfigured || !slackConfigured;

  return {
    source: 'live',
    generatedAt: new Date().toISOString(),
    readiness,
    systems,
    workflows: [
      {
        id: 'weekly-checkins',
        name: 'Weekly Check-ins',
        owner: 'People Ops',
        status: hasCheckinAttention ? 'attention' : 'running',
        progress: hasCheckinAttention ? 62 : 88,
        detail: hasCheckinAttention
          ? 'Check database, Redis, or Google Sheets configuration before the next reminder window.'
          : 'Roster, reminders, and leadership reporting are ready.',
        signal: 'Google Sheets + Slack + Postgres',
      },
      {
        id: 'leave-approvals',
        name: 'Leave Approvals',
        owner: 'Managers',
        status: hasLeaveAttention ? 'attention' : 'running',
        progress: hasLeaveAttention ? 58 : 84,
        detail: hasLeaveAttention
          ? 'Leave workflows need database or queue recovery before approval SLAs are reliable.'
          : 'Leave submission, approval, reminders, and audit paths are available.',
        signal: 'Slack + Postgres + Redis',
      },
      {
        id: 'client-memory',
        name: 'Client Memory',
        owner: 'Revenue',
        status: process.env.ATTIO_API_KEY ? 'running' : 'attention',
        progress: process.env.ATTIO_API_KEY ? 91 : 44,
        detail: process.env.ATTIO_API_KEY
          ? 'Attio is configured for people, company, and deal context.'
          : 'Set ATTIO_API_KEY so client memory can use live CRM records.',
        signal: 'Attio CRM',
      },
      {
        id: 'calendar-guard',
        name: 'Calendar Guard',
        owner: 'Ops',
        status: process.env.GOOGLE_CLIENT_ID ? 'running' : 'idle',
        progress: process.env.GOOGLE_CLIENT_ID ? 79 : 52,
        detail: process.env.GOOGLE_CLIENT_ID
          ? 'Calendar auth appears configured for schedule-aware answers.'
          : 'Google Calendar can be connected when OAuth credentials are configured.',
        signal: 'Google Calendar',
      },
    ],
    queue: [
      {
        id: 'SYS-CHECKINS',
        type: 'Health',
        title: hasCheckinAttention ? 'Weekly check-ins need attention' : 'Weekly check-ins are ready',
        detail: hasCheckinAttention
          ? 'Inspect database, Redis, and Sheets configuration before scheduled nudges run.'
          : 'Worker reminders, manager reviews, and leadership reports can run.',
        urgency: hasCheckinAttention ? 'high' : 'low',
        eta: 'Before next cron',
      },
      {
        id: 'SYS-LEAVE',
        type: 'Health',
        title: hasLeaveAttention ? 'Leave approvals need recovery' : 'Leave approvals are healthy',
        detail: hasLeaveAttention
          ? 'Approval actions depend on Postgres and Redis reminder queues.'
          : 'Approval modals, reminders, and audit logs are available.',
        urgency: hasLeaveAttention ? 'high' : 'low',
        eta: '48h SLA',
      },
      {
        id: 'SYS-TOOLS',
        type: 'Tools',
        title: `${toolCount} orchestration tools registered`,
        detail: 'The command bridge can route requests to docs search, CRM, and calendar tools.',
        urgency: 'medium',
        eta: 'On demand',
      },
    ],
    briefs: [
      {
        title: 'Live backend readout',
        body: `The dashboard API checked ${systems.length} systems. ${onlineCount} are online and the UI is using live data from this server.`,
        tone: onlineCount === systems.length ? 'warm' : 'sharp',
      },
      {
        title: 'Next useful connection',
        body: 'Expose real queue counts and recent audit events next, then this page can become the non-Slack operator console for Lumo.',
        tone: 'calm',
      },
    ],
    metrics: [
      { label: 'Systems Online', value: `${onlineCount}/${systems.length}`, delta: `${readiness}% ready` },
      { label: 'Tools', value: String(toolCount), delta: 'registered' },
      { label: 'Check-ins', value: hasCheckinAttention ? 'Watch' : 'OK', delta: sheetsConfigured ? 'sheets ready' : 'needs sheets' },
      { label: 'Leave', value: hasLeaveAttention ? 'Watch' : 'OK', delta: databaseOnline && redisOnline ? 'queues ready' : 'needs infra' },
    ],
    commandSuggestions: [
      'Summarize this week of check-ins',
      'Find leave requests that need manager action',
      'Search docs for the leave policy',
      'Draft a Slack nudge for late reviewers',
    ],
    trace: [
      {
        at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        label: 'dashboard-api',
        detail: 'Generated live status snapshot for the frontend.',
      },
      {
        at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        label: 'toolRegistry',
        detail: `${Array.from(toolRegistry.keys()).join(', ')} ready for orchestrator routing.`,
      },
      {
        at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        label: 'healthCheck',
        detail: 'Probed Postgres, Redis, Sheets config, Slack config, and registered tools.',
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
