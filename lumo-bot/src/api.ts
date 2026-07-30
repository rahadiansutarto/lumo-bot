export type HealthState = 'online' | 'degraded' | 'offline'
export type AttentionLevel = 'critical' | 'watch' | 'ok' | 'idle'

export interface SystemStatus {
  name: string
  state: HealthState
  detail: string
  latencyMs?: number
}

export interface DesktopAction {
  id: string
  label: string
  prompt: string
  intent: string
  disabled?: boolean
}

export interface AssistantPanel {
  mode: string
  state: HealthState
  headline: string
  detail: string
  lastSync: string
}

export interface LeavePanel {
  pendingCount: number
  oooTodayCount: number
  remindersDue: number
  pending: Array<{
    requestId: string
    requesterName: string
    leaveType: string
    dateRange: string
    totalDays: number
    hoursPending: number
    reminderCount: number
  }>
  oooToday: Array<{
    requestId: string
    requesterName: string
    leaveType: string
    dateRange: string
  }>
  audit: Array<{
    action: string
    actor: string
    requestId?: string
    at: string
  }>
}

export interface CheckinPanel {
  weekId: string
  pendingWorkers: number
  pendingManagers: number
  workersTotal: number
  managersTotal: number
  workersDone: number
  managersDone: number
  repeatDefaulters: Array<{
    name: string
    type: string
    missedCount: number
  }>
  pendingWorkerNames: string[]
  pendingManagerIds: string[]
}

export interface ToolPanel {
  registered: string[]
  configured: Array<{
    name: string
    ready: boolean
    detail: string
  }>
}

export interface DesktopSnapshot {
  source: 'live' | 'demo'
  generatedAt: string
  readiness: number
  assistant: AssistantPanel
  systems: SystemStatus[]
  leave: LeavePanel
  checkins: CheckinPanel
  tools: ToolPanel
  actions: DesktopAction[]
  timeline: Array<{
    at: string
    title: string
    detail: string
    level: AttentionLevel
  }>
}

export interface CommandResult {
  response: string
  toolsUsed: string[]
  source: 'live' | 'demo'
  error?: string
}

const emptyLeave: LeavePanel = {
  pendingCount: 0,
  oooTodayCount: 0,
  remindersDue: 0,
  pending: [],
  oooToday: [],
  audit: [],
}

const emptyCheckins: CheckinPanel = {
  weekId: 'offline',
  pendingWorkers: 0,
  pendingManagers: 0,
  workersTotal: 0,
  managersTotal: 0,
  workersDone: 0,
  managersDone: 0,
  repeatDefaulters: [],
  pendingWorkerNames: [],
  pendingManagerIds: [],
}

export const disconnectedDashboard: DesktopSnapshot = {
  source: 'demo',
  generatedAt: new Date().toISOString(),
  readiness: 0,
  assistant: {
    mode: 'Disconnected',
    state: 'offline',
    headline: 'Backend API is not connected',
    detail: 'Start the backend with bun run dev so the assistant can load live leave, check-in, OOO, audit, and tool data.',
    lastSync: '--:--',
  },
  systems: [
    {
      name: 'Dashboard API',
      state: 'offline',
      detail: 'Waiting for /api/dashboard.',
    },
    {
      name: 'Vite Proxy',
      state: 'degraded',
      detail: 'Frontend is alive, but no backend response was received.',
    },
  ],
  leave: emptyLeave,
  checkins: emptyCheckins,
  tools: {
    registered: [],
    configured: [],
  },
  actions: [
    {
      id: 'connect-backend',
      label: 'Start backend',
      intent: 'setup',
      prompt: 'Start bun run dev in the repo root, then refresh the dashboard.',
      disabled: true,
    },
  ],
  timeline: [
    {
      at: '--:--',
      title: 'No live backend data',
      detail: 'This is an explicit disconnected state, not placeholder business data.',
      level: 'critical',
    },
  ],
}

export async function fetchDashboard(signal?: AbortSignal): Promise<DesktopSnapshot> {
  const baseUrl = import.meta.env.VITE_LUMO_API_URL?.replace(/\/$/, '') ?? ''

  try {
    const response = await fetch(`${baseUrl}/api/dashboard`, { signal })

    if (!response.ok) {
      throw new Error(`Dashboard API returned ${response.status}`)
    }

    return {
      ...((await response.json()) as DesktopSnapshot),
      source: 'live',
    }
  } catch {
    return {
      ...disconnectedDashboard,
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

    const data = (await response.json()) as Partial<CommandResult> & { error?: string }

    if (!response.ok) {
      return {
        source: 'live',
        toolsUsed: [],
        response: data.error ?? `Command API returned ${response.status}`,
        error: data.error,
      }
    }

    return {
      source: 'live',
      toolsUsed: data.toolsUsed ?? [],
      response: data.response ?? 'Command completed without a text response.',
    }
  } catch {
    return {
      source: 'demo',
      toolsUsed: [],
      response: 'Backend command bridge is offline. Start bun run dev to route this through the live orchestrator.',
      error: 'Command bridge unavailable',
    }
  }
}
