import { useEffect, useMemo, useState } from 'react'
import { bind, play, setEnabled } from 'cuelume'
import './App.css'
import {
  demoDashboard,
  fetchDashboard,
  runCommand,
  type CommandResult,
  type DashboardSnapshot,
  type WorkflowStatus,
} from './api'

const tabs = ['Ops Pulse', 'Check-ins', 'Leave', 'CRM'] as const
type Tab = (typeof tabs)[number]

function App() {
  const [soundOn, setSoundOn] = useState(true)
  const [focusMode, setFocusMode] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('Ops Pulse')
  const [dashboard, setDashboard] = useState<DashboardSnapshot>(demoDashboard)
  const [command, setCommand] = useState(demoDashboard.commandSuggestions[0])
  const [commandResult, setCommandResult] = useState<CommandResult | null>(null)
  const [isRunningCommand, setIsRunningCommand] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(true)

  useEffect(() => {
    bind()
    play('ready')
  }, [])

  useEffect(() => {
    setEnabled(soundOn)
  }, [soundOn])

  useEffect(() => {
    const controller = new AbortController()

    async function loadDashboard() {
      setIsRefreshing(true)
      const nextDashboard = await fetchDashboard(controller.signal)
      setDashboard(nextDashboard)
      setIsRefreshing(false)
    }

    void loadDashboard()
    const intervalId = window.setInterval(loadDashboard, 30000)

    return () => {
      controller.abort()
      window.clearInterval(intervalId)
    }
  }, [])

  const activeWorkflow = useMemo(() => {
    const tabLookup: Record<Tab, string> = {
      'Ops Pulse': 'weekly-checkins',
      'Check-ins': 'weekly-checkins',
      Leave: 'leave-approvals',
      CRM: 'client-memory',
    }

    return (
      dashboard.workflows.find((workflow) => workflow.id === tabLookup[activeTab]) ??
      dashboard.workflows[0]
    )
  }, [activeTab, dashboard.workflows])

  const readinessStyle = useMemo(
    () => ({ '--readiness': `${dashboard.readiness}%` }) as React.CSSProperties,
    [dashboard.readiness],
  )

  const urgentQueue = dashboard.queue.filter((item) => item.urgency !== 'low')
  const liveSystems = dashboard.systems.filter((system) => system.state === 'online').length

  async function submitCommand(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!command.trim()) {
      return
    }

    setIsRunningCommand(true)
    play('page')
    const result = await runCommand(command.trim())
    setCommandResult(result)
    setIsRunningCommand(false)
    play(result.source === 'live' ? 'success' : 'whisper')
  }

  function selectTab(tab: Tab) {
    setActiveTab(tab)
    play('tick')
  }

  function selectSuggestion(suggestion: string) {
    setCommand(suggestion)
    play('tick')
  }

  function workflowClassName(workflow: WorkflowStatus) {
    return `workflow-row ${workflow.status}`
  }

  return (
    <div className={`app-shell ${focusMode ? 'focus-mode' : ''}`}>
      <header className="space-header" data-cuelume-hover="whisper">
        <div>
          <p className="eyebrow">Lumo OS / Backend Mission Control</p>
          <h1>Ops cockpit for the Slack bot</h1>
        </div>
        <div className="header-actions">
          <span className={`connection-pill ${dashboard.source}`}>
            {dashboard.source === 'live' ? 'Live API connected' : 'Demo data fallback'}
          </span>
          <button
            className={`toggle ${soundOn ? 'on' : ''}`}
            type="button"
            aria-label="Toggle sound"
            aria-pressed={soundOn}
            data-cuelume-toggle
            onClick={() => setSoundOn((enabled) => !enabled)}
          >
            <span className="thumb" aria-hidden="true">
              {Array.from({ length: 9 }).map((_, index) => (
                <i key={index} />
              ))}
            </span>
          </button>
        </div>
      </header>

      <main className="command-grid" aria-label="Lumo backend dashboard">
        <section className="card hero-card" data-cuelume-hover="whisper">
          <div className="shine" />
          <div className="meta-row">
            <span>Current Objective</span>
            <span>{isRefreshing ? 'syncing' : 'fresh'}</span>
          </div>

          <div className="hero-core">
            <div className="orb" style={readinessStyle} aria-hidden="true">
              <span />
            </div>
            <div>
              <p className="mono-sub">Assistant readiness</p>
              <h2>{dashboard.readiness}% operational</h2>
              <p>
                Lumo is watching Slack workflows, approvals, check-ins, docs, calendar context,
                and CRM memory from one control surface.
              </p>
            </div>
          </div>

          <div className="hero-metrics">
            {dashboard.metrics.map((metric) => (
              <div key={metric.label}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
                <small>{metric.delta}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="card systems-card dimmable" data-cuelume-hover="tick">
          <div className="meta-row">
            <span>Backend Systems</span>
            <span>
              {liveSystems}/{dashboard.systems.length} online
            </span>
          </div>
          <div className="system-list">
            {dashboard.systems.map((system) => (
              <article key={system.name} className={`system-row ${system.state}`}>
                <div>
                  <span className="led" />
                  <strong>{system.name}</strong>
                </div>
                <p>{system.detail}</p>
                <small>{system.latencyMs ? `${system.latencyMs}ms` : system.state}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="card command-card" data-cuelume-hover="whisper">
          <div className="meta-row">
            <span>Command Bridge</span>
            <span>/api/orchestrate</span>
          </div>
          <form className="command-console" onSubmit={submitCommand}>
            <label htmlFor="command-input">Ask the backend to do real work</label>
            <textarea
              id="command-input"
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder="Ask Lumo to search docs, inspect CRM, or draft a Slack response..."
            />
            <button type="submit" data-cuelume-press disabled={isRunningCommand}>
              {isRunningCommand ? 'Running...' : 'Run through Lumo'}
            </button>
          </form>
          <div className="quick-actions">
            {dashboard.commandSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                data-cuelume-hover="tick"
                onClick={() => selectSuggestion(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </section>

        <section className="card response-card dimmable" data-cuelume-hover="tick">
          <div className="meta-row">
            <span>Assistant Output</span>
            <span>{commandResult?.source ?? 'standby'}</span>
          </div>
          <div className="assistant-output">
            <p>
              {commandResult?.response ??
                'Run a command to preview how the frontend will talk to the backend orchestrator.'}
            </p>
            <div className="tool-strip">
              {(commandResult?.toolsUsed.length ? commandResult.toolsUsed : ['searchDocs', 'attio', 'googleCalendar']).map(
                (tool) => (
                  <span key={tool}>{tool}</span>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="card workflow-card dimmable" data-cuelume-hover="whisper">
          <div className="meta-row">
            <span>Workflow Brain</span>
            <span>{activeTab}</span>
          </div>
          <div className="tab-strip" role="tablist" aria-label="Workflow views">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                className={tab === activeTab ? 'active' : ''}
                role="tab"
                aria-selected={tab === activeTab}
                data-cuelume-toggle
                onClick={() => selectTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="active-workflow">
            <span>{activeWorkflow?.owner}</span>
            <h2>{activeWorkflow?.name}</h2>
            <p>{activeWorkflow?.detail}</p>
            <div className="progress-track" aria-label={`${activeWorkflow?.name} progress`}>
              <i style={{ width: `${activeWorkflow?.progress ?? 0}%` }} />
            </div>
            <small>{activeWorkflow?.signal}</small>
          </div>

          <div className="automation-list">
            {dashboard.workflows.map((workflow) => (
              <article key={workflow.id} className={workflowClassName(workflow)}>
                <span>{workflow.progress}%</span>
                <strong>{workflow.name}</strong>
                <small>{workflow.status}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="card queue-card dimmable" data-cuelume-hover="tick">
          <div className="meta-row">
            <span>Decision Queue</span>
            <span>{urgentQueue.length} needs attention</span>
          </div>
          <div className="queue-list">
            {dashboard.queue.map((item) => (
              <article key={item.id} className={`queue-item ${item.urgency}`}>
                <span>{item.type}</span>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
                <small>
                  {item.id} / {item.eta}
                </small>
              </article>
            ))}
          </div>
        </section>

        <section className="card brief-card dimmable" data-cuelume-hover="whisper">
          <div className="meta-row">
            <span>Operator Brief</span>
            <span>{new Date(dashboard.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="brief-list">
            {dashboard.briefs.map((brief) => (
              <article key={brief.title} className={brief.tone}>
                <strong>{brief.title}</strong>
                <p>{brief.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="card trace-card dimmable" data-cuelume-hover="tick">
          <div className="meta-row">
            <span>Backend Trace</span>
            <button
              type="button"
              className="ghost-action"
              data-cuelume-toggle
              aria-pressed={focusMode}
              onClick={() => setFocusMode((enabled) => !enabled)}
            >
              {focusMode ? 'Dense' : 'Focus'}
            </button>
          </div>
          <div className="trace-list">
            {dashboard.trace.map((event) => (
              <article key={`${event.at}-${event.label}`}>
                <span>{event.at}</span>
                <strong>{event.label}</strong>
                <p>{event.detail}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
