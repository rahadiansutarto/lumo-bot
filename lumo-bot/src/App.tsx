import { useEffect, useMemo, useState } from 'react'
import { bind, play, setEnabled } from 'cuelume'
import './App.css'
import {
  disconnectedDashboard,
  fetchDashboard,
  runCommand,
  type CommandResult,
  type DesktopAction,
  type DesktopSnapshot,
} from './api'

type Message = {
  id: string
  role: 'user' | 'assistant' | 'system'
  text: string
  meta?: string
}

function percent(done: number, total: number) {
  if (total <= 0) {
    return 0
  }

  return Math.round((done / total) * 100)
}

function stateLabel(state: string) {
  return state.charAt(0).toUpperCase() + state.slice(1)
}

function App() {
  const [soundOn, setSoundOn] = useState(true)
  const [dashboard, setDashboard] = useState<DesktopSnapshot>(disconnectedDashboard)
  const [command, setCommand] = useState('Summarize what needs attention right now.')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'boot',
      role: 'system',
      text: 'Assistant ready. Connect the backend to load live operations data.',
      meta: 'startup',
    },
  ])
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

  const workerCompletion = percent(dashboard.checkins.workersDone, dashboard.checkins.workersTotal)
  const managerCompletion = percent(dashboard.checkins.managersDone, dashboard.checkins.managersTotal)
  const liveSystems = dashboard.systems.filter((system) => system.state === 'online').length
  const readyTools = dashboard.tools.configured.filter((tool) => tool.ready).length
  const attentionCount =
    dashboard.leave.pendingCount +
    dashboard.leave.remindersDue +
    dashboard.checkins.pendingWorkers +
    dashboard.checkins.pendingManagers
  const assistantStyle = useMemo(
    () => ({ '--readiness': `${dashboard.readiness}%` }) as React.CSSProperties,
    [dashboard.readiness],
  )

  async function submitCommand(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const prompt = command.trim()

    if (!prompt) {
      return
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: prompt,
      meta: 'command',
    }

    setMessages((current) => [...current, userMessage])
    setIsRunningCommand(true)
    play('page')

    const result = await runCommand(prompt)
    setCommandResult(result)
    setMessages((current) => [
      ...current,
      {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: result.response,
        meta: result.toolsUsed.length > 0 ? `Tools: ${result.toolsUsed.join(', ')}` : result.source,
      },
    ])
    setIsRunningCommand(false)
    play(result.error ? 'whisper' : 'success')
  }

  function handleAction(action: DesktopAction) {
    if (action.disabled) {
      return
    }

    setCommand(action.prompt)
    play('tick')
  }

  return (
    <div className="app-shell" aria-label="Lumo control surface">
      <header className="page-header">
        <div className="brand-block">
          <p className="eyebrow">Control Surface</p>
          <h1 className="brand-title">Lumo</h1>
          <p className="brand-sub">
            {dashboard.source === 'live' ? 'Live backend session' : 'Disconnected session'}
          </p>
        </div>
        <div className="header-actions">
          <span>{isRefreshing ? 'Syncing' : `Synced ${dashboard.assistant.lastSync}`}</span>
          <button
            type="button"
            className={`sound-toggle ${soundOn ? 'on' : ''}`}
            aria-label="Toggle sound"
            aria-pressed={soundOn}
            data-cuelume-toggle
            onClick={() => setSoundOn((enabled) => !enabled)}
          >
            Sound
          </button>
        </div>
      </header>

      <main className="desktop-grid">
          <aside className="assistant-rail" data-cuelume-hover="whisper">
            <p className="eyebrow">Assistant Core</p>
            <div
              className={[
                'assistant-core',
                dashboard.assistant.state,
                isRefreshing ? 'syncing' : '',
                isRunningCommand ? 'processing' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={assistantStyle}
              aria-hidden="true"
            >
              <div className="core-shell">
                <span className="core-ring" />
                <span className="core-lattice" />
                <span className="core-nucleus" />
              </div>
              <small>{dashboard.readiness}%</small>
            </div>
            <div className="assistant-copy">
              <span>{dashboard.assistant.mode}</span>
              <h1>{dashboard.assistant.headline}</h1>
              <p>{dashboard.assistant.detail}</p>
            </div>
            <div className="readiness-stack">
              <div>
                <strong>{dashboard.readiness}%</strong>
                <span>Readiness</span>
              </div>
              <div>
                <strong>{attentionCount}</strong>
                <span>Open loops</span>
              </div>
              <div>
                <strong>
                  {liveSystems}/{dashboard.systems.length}
                </strong>
                <span>Systems</span>
              </div>
            </div>
          </aside>

          <section className="workspace-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Command Workspace</p>
                <h2>Ask Lumo to operate the backend</h2>
              </div>
              <span className={`source-pill ${dashboard.source}`}>{dashboard.source}</span>
            </div>

            <div className="conversation-feed" aria-live="polite">
              {messages.map((message) => (
                <article key={message.id} className={`message ${message.role}`}>
                  <small>{message.meta}</small>
                  <p>{message.text}</p>
                </article>
              ))}
            </div>

            <form className="command-form" onSubmit={submitCommand}>
              <textarea
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                placeholder="Ask about leave, check-ins, docs, CRM, or calendar..."
              />
              <button type="submit" disabled={isRunningCommand} data-cuelume-press>
                {isRunningCommand ? 'Working' : 'Send to orchestrator'}
              </button>
            </form>

            <div className="action-drawer" aria-label="Suggested backend actions">
              {dashboard.actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  disabled={action.disabled}
                  data-cuelume-hover="tick"
                  onClick={() => handleAction(action)}
                >
                  <span>{action.intent}</span>
                  {action.label}
                </button>
              ))}
            </div>
          </section>

          <aside className="ops-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Live Dashboard</p>
                <h2>Everything visible is backend-backed</h2>
              </div>
            </div>

            <section className="mini-card">
              <div className="metric-row">
                <strong>{dashboard.leave.pendingCount}</strong>
                <span>Pending leave</span>
                <small>{dashboard.leave.remindersDue} reminders due</small>
              </div>
              <div className="item-list">
                {dashboard.leave.pending.length > 0 ? (
                  dashboard.leave.pending.map((item) => (
                    <article key={item.requestId}>
                      <strong>{item.requesterName}</strong>
                      <span>
                        {item.leaveType} / {item.dateRange}
                      </span>
                      <small>
                        {item.totalDays} days / {item.hoursPending}h pending
                      </small>
                    </article>
                  ))
                ) : (
                  <p className="empty-state">No pending leave requests from the backend.</p>
                )}
              </div>
            </section>

            <section className="mini-card">
              <div className="metric-row">
                <strong>{dashboard.leave.oooTodayCount}</strong>
                <span>OOO today</span>
                <small>Approved leaves</small>
              </div>
              <div className="item-list compact-list">
                {dashboard.leave.oooToday.length > 0 ? (
                  dashboard.leave.oooToday.map((item) => (
                    <article key={item.requestId}>
                      <strong>{item.requesterName}</strong>
                      <span>
                        {item.leaveType} / {item.dateRange}
                      </span>
                    </article>
                  ))
                ) : (
                  <p className="empty-state">No approved OOO entries today.</p>
                )}
              </div>
            </section>
          </aside>

          <section className="dock-panel checkin-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Weekly Check-ins</p>
                <h2>{dashboard.checkins.weekId}</h2>
              </div>
              <span>{dashboard.checkins.pendingWorkers + dashboard.checkins.pendingManagers} pending</span>
            </div>
            <div className="completion-grid">
              <div>
                <strong>{workerCompletion}%</strong>
                <span>Workers complete</span>
                <i>
                  <b style={{ width: `${workerCompletion}%` }} />
                </i>
              </div>
              <div>
                <strong>{managerCompletion}%</strong>
                <span>Managers complete</span>
                <i>
                  <b style={{ width: `${managerCompletion}%` }} />
                </i>
              </div>
            </div>
            <div className="name-cloud">
              {dashboard.checkins.pendingWorkerNames.length > 0 ? (
                dashboard.checkins.pendingWorkerNames.map((name) => <span key={name}>{name}</span>)
              ) : (
                <span>No pending workers</span>
              )}
              {dashboard.checkins.pendingManagerIds.map((managerId) => (
                <span key={managerId}>{managerId}</span>
              ))}
            </div>
          </section>

          <section className="dock-panel systems-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Systems</p>
                <h2>Runtime health</h2>
              </div>
            </div>
            <div className="system-grid">
              {dashboard.systems.map((system) => (
                <article key={system.name} className={system.state}>
                  <span />
                  <strong>{system.name}</strong>
                  <p>{system.detail}</p>
                  <small>{system.latencyMs ? `${system.latencyMs}ms` : stateLabel(system.state)}</small>
                </article>
              ))}
            </div>
          </section>

          <section className="dock-panel tool-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Tools</p>
                <h2>
                  {readyTools}/{dashboard.tools.configured.length} configured
                </h2>
              </div>
            </div>
            <div className="tool-list">
              {dashboard.tools.configured.map((tool) => (
                <article key={tool.name} className={tool.ready ? 'ready' : 'missing'}>
                  <strong>{tool.name}</strong>
                  <span>{tool.detail}</span>
                </article>
              ))}
            </div>
            <div className="registry-strip">
              {dashboard.tools.registered.length > 0 ? (
                dashboard.tools.registered.map((tool) => <span key={tool}>{tool}</span>)
              ) : (
                <span>No registered tools</span>
              )}
            </div>
          </section>

          <section className="dock-panel timeline-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Activity</p>
                <h2>Backend timeline</h2>
              </div>
            </div>
            <div className="timeline-list">
              {dashboard.timeline.map((item) => (
                <article key={`${item.at}-${item.title}`} className={item.level}>
                  <span>{item.at}</span>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </article>
              ))}
              {dashboard.leave.audit.map((entry) => (
                <article key={`${entry.at}-${entry.action}-${entry.requestId ?? entry.actor}`} className="idle">
                  <span>{entry.at}</span>
                  <strong>{entry.action}</strong>
                  <p>
                    {entry.actor}
                    {entry.requestId ? ` / ${entry.requestId}` : ''}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </main>

        {commandResult ? (
          <footer className="result-bar">
            <span>{commandResult.source}</span>
            <p>{commandResult.response}</p>
          </footer>
        ) : null}
    </div>
  )
}

export default App
