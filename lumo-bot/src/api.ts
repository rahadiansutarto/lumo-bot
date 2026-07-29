export type HealthState = 'online' | 'degraded' | 'offline'

export interface SystemStatus {
  name: string
  state: HealthState
  detail: string
  latencyMs?: number
}

export interface WorkflowStatus {
  id: string
  name: string
  owner: string
  status: 'running' | 'attention' | 'idle'
  progress: number
  detail: string
  signal: string
}

export interface QueueItem {
  id: string
  type: string
  title: string
  detail: string
  urgency: 'high' | 'medium' | 'low'
  eta: string
}

export interface BriefItem {
  title: string
  body: string
  tone: 'calm' | 'sharp' | 'warm'
}

export interface Metric {
  label: string
  value: string
  delta: string
}

export interface TraceEvent {
  at: string
  label: string
  detail: string
}

export interface DashboardSnapshot {
  source: 'live' | 'demo'
  generatedAt: string
  readiness: number
  systems: SystemStatus[]
  workflows: WorkflowStatus[]
  queue: QueueItem[]
  briefs: BriefItem[]
  metrics: Metric[]
  commandSuggestions: string[]
  trace: TraceEvent[]
}

export interface CommandResult {
  response: string
  toolsUsed: string[]
  source: 'live' | 'demo'
}

export const demoDashboard: DashboardSnapshot = {
  source: 'demo',
  generatedAt: new Date().toISOString(),
  readiness: 82,
  systems: [
    {
      name: 'Slack Socket',
      state: 'online',
      detail: 'Listening for mentions, approvals, and reminders.',
      latencyMs: 46,
    },
    {
      name: 'Postgres',
      state: 'online',
      detail: 'Leave requests and weekly compliance tracking available.',
      latencyMs: 18,
    },
    {
      name: 'Redis Queue',
      state: 'degraded',
      detail: 'Reminder jobs queued; next retry window in 12 minutes.',
      latencyMs: 132,
    },
    {
      name: 'Tool Layer',
      state: 'online',
      detail: 'Docs search, Attio CRM, and Google Calendar registered.',
      latencyMs: 89,
    },
  ],
  workflows: [
    {
      id: 'weekly-checkins',
      name: 'Weekly Check-ins',
      owner: 'People Ops',
      status: 'attention',
      progress: 68,
      detail: '9 worker scorecards are in. 4 manager reviews still need direction.',
      signal: 'Google Sheets + Slack',
    },
    {
      id: 'leave-approvals',
      name: 'Leave Approvals',
      owner: 'Managers',
      status: 'running',
      progress: 76,
      detail: '2 pending requests. One crosses a launch week and needs coverage.',
      signal: 'Postgres + Slack',
    },
    {
      id: 'client-memory',
      name: 'Client Memory',
      owner: 'Revenue',
      status: 'running',
      progress: 91,
      detail: 'Attio records are ready for relationship summaries and deal context.',
      signal: 'Attio CRM',
    },
    {
      id: 'calendar-guard',
      name: 'Calendar Guard',
      owner: 'Ops',
      status: 'idle',
      progress: 54,
      detail: 'OAuth is available for schedule checks and meeting-aware answers.',
      signal: 'Google Calendar',
    },
  ],
  queue: [
    {
      id: 'LVE-1042',
      type: 'Leave',
      title: 'Maya requested vacation during launch week',
      detail: 'Needs manager decision plus calendar coverage before Friday.',
      urgency: 'high',
      eta: '48h SLA',
    },
    {
      id: 'CHK-2026-W31',
      type: 'Check-in',
      title: 'Manager reviews are drifting',
      detail: 'Four teams have scorecards but no directive for the week.',
      urgency: 'medium',
      eta: 'Tue 4 PM report',
    },
    {
      id: 'CRM-77',
      type: 'CRM',
      title: 'Client context is ready for follow-up',
      detail: 'Recent notes can be summarized into a next-best action.',
      urgency: 'low',
      eta: 'On demand',
    },
  ],
  briefs: [
    {
      title: 'What Lumo would say now',
      body: 'Your people systems are mostly healthy, but the week needs manager direction. I would nudge reviewers first, then route the launch-week leave request with coverage options.',
      tone: 'sharp',
    },
    {
      title: 'Backend connection target',
      body: 'Point the frontend at /api/dashboard for health, queues, workflow progress, and suggested commands. Use /api/orchestrate when you want the command box to talk to the LLM tool loop.',
      tone: 'calm',
    },
  ],
  metrics: [
    { label: 'Open Loops', value: '7', delta: '-3 today' },
    { label: 'Automations', value: '4', delta: '2 active now' },
    { label: 'Tool Calls', value: '128', delta: '+18 this week' },
    { label: 'Avg Response', value: '1.8s', delta: 'healthy' },
  ],
  commandSuggestions: [
    'Summarize this week of check-ins',
    'Find leave requests that need manager action',
    'Draft a Slack nudge for late reviewers',
    'Search docs for the leave policy',
  ],
  trace: [
    {
      at: '11:58',
      label: 'checkinQueue',
      detail: 'Prepared final manager nudges for pending reviews.',
    },
    {
      at: '11:54',
      label: 'leaveHandlers',
      detail: 'New pending leave request requires approval.',
    },
    {
      at: '11:49',
      label: 'toolRegistry',
      detail: 'searchDocs, attio, and googleCalendar are available.',
    },
  ],
}

export async function fetchDashboard(signal?: AbortSignal): Promise<DashboardSnapshot> {
  const baseUrl = import.meta.env.VITE_LUMO_API_URL?.replace(/\/$/, '') ?? ''

  try {
    const response = await fetch(`${baseUrl}/api/dashboard`, { signal })

    if (!response.ok) {
      throw new Error(`Dashboard API returned ${response.status}`)
    }

    const data = (await response.json()) as DashboardSnapshot
    return {
      ...data,
      source: 'live',
    }
  } catch {
    return {
      ...demoDashboard,
      generatedAt: new Date().toISOString(),
    }
  }
}

export async function runCommand(prompt: string): Promise<CommandResult> {
  const baseUrl = import.meta.env.VITE_LUMO_API_URL?.replace(/\/$/, '') ?? ''

  try {
    const response = await fetch(`${baseUrl}/api/orchestrate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    })

    if (!response.ok) {
      throw new Error(`Command API returned ${response.status}`)
    }

    return {
      ...((await response.json()) as CommandResult),
      source: 'live',
    }
  } catch {
    return {
      source: 'demo',
      toolsUsed: ['searchDocs', 'attio', 'googleCalendar'].filter((_, index) =>
        prompt.length % 3 >= index,
      ),
      response: `Demo run: I would route "${prompt}" through the orchestrator, choose the right backend tools, and return a Slack-ready answer with follow-up actions.`,
    }
  }
}
