import { useEffect, useMemo, useState } from 'react'
import { bind, play, setEnabled } from 'cuelume'
import './App.css'

const modes = [
  {
    name: 'Support',
    detail: 'Answers team questions with doc-aware context.',
  },
  {
    name: 'Ops',
    detail: 'Coordinates requests, reminders, and approvals.',
  },
  {
    name: 'Research',
    detail: 'Turns scattered notes into clean next steps.',
  },
]

const signals = ['Slack', 'Calendar', 'Docs', 'Sheets', 'CRM', 'Tasks']

const automations = [
  ['01', 'Daily check-ins', 'Collects team updates and flags blockers.'],
  ['02', 'Leave requests', 'Guides policy checks and calendar coverage.'],
  ['03', 'Client memory', 'Keeps relationship details ready for action.'],
  ['04', 'Search docs', 'Finds the right source before responding.'],
]

function App() {
  const [soundOn, setSoundOn] = useState(true)
  const [focusMode, setFocusMode] = useState(false)
  const [activeMode, setActiveMode] = useState(0)
  const [readiness, setReadiness] = useState(76)

  useEffect(() => {
    bind()
    play('ready')
  }, [])

  useEffect(() => {
    setEnabled(soundOn)
  }, [soundOn])

  const mode = modes[activeMode]
  const ringStyle = useMemo(
    () => ({ '--readiness': `${readiness}%` }) as React.CSSProperties,
    [readiness],
  )

  function cycleMode() {
    setActiveMode((index) => (index + 1) % modes.length)
    setReadiness((value) => Math.min(value + 6, 96))
    play('page')
  }

  function tuneBot() {
    setReadiness((value) => (value > 92 ? 68 : value + 8))
    play('success')
  }

  return (
    <div className={`app-shell ${focusMode ? 'focus-mode' : ''}`}>
      <header className="space-header">
        <div>
          <p className="eyebrow">Lumo OS / Adaptive Agent</p>
          <h1>Lumo</h1>
        </div>
        <p>A bot that fits your needs</p>
      </header>

      <main className="bento" aria-label="Lumo command dashboard">
        <section className="card hero-card" data-cuelume-hover="whisper">
          <div className="shine" />
          <div className="hero-controls">
            <span className="sound-label">Sound</span>
            <button
              className={`toggle ${soundOn ? 'on' : ''}`}
              type="button"
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

          <div className="meta-row">
            <span>Live profile</span>
            <span>v0.1</span>
          </div>

          <div className="hero-core">
            <div className="orb" aria-hidden="true">
              <span />
            </div>
            <div>
              <p className="mono-sub">Current fit</p>
              <h2>{mode.name}</h2>
              <p>{mode.detail}</p>
            </div>
          </div>

          <div className="hero-foot">
            <button
              type="button"
              className="primary-action"
              data-cuelume-press
              data-cuelume-release
              onClick={cycleMode}
            >
              Cycle Fit
            </button>
            <button
              type="button"
              className="ghost-action"
              data-cuelume-toggle
              aria-pressed={focusMode}
              onClick={() => setFocusMode((enabled) => !enabled)}
            >
              {focusMode ? 'Exit Focus' : 'Focus UI'}
            </button>
          </div>
        </section>

        <section className="card readiness-card dimmable" data-cuelume-hover="tick">
          <div className="meta-row">
            <span>Readiness</span>
            <span>{readiness}%</span>
          </div>
          <button
            className="ring-wrap"
            style={ringStyle}
            type="button"
            data-cuelume-press
            data-cuelume-release
            onClick={tuneBot}
            aria-label="Tune Lumo readiness"
          >
            <span className="ring-fill" />
            <span className="ring-value">{readiness}<small>%</small></span>
          </button>
          <p className="mono-sub">Tap to tune the assistant profile.</p>
        </section>

        <section className="card signal-card dimmable" data-cuelume-hover="tick">
          <div className="meta-row">
            <span>Signals</span>
            <span>6 active</span>
          </div>
          <div className="signal-grid">
            {signals.map((signal, index) => (
              <button
                key={signal}
                type="button"
                data-cuelume-press="press"
                data-cuelume-release="release"
                style={{ '--delay': `${index * 50}ms` } as React.CSSProperties}
              >
                <span className="led" />
                {signal}
              </button>
            ))}
          </div>
        </section>

        <section className="card command-card dimmable" data-cuelume-hover="whisper">
          <div className="meta-row">
            <span>Command</span>
            <span>⌘K ready</span>
          </div>
          <div className="command-line">
            <span className="prompt">&gt;</span>
            <span>Ask Lumo to summarize, schedule, draft, or decide.</span>
            <span className="cursor" />
          </div>
          <div className="quick-actions">
            {['Plan day', 'Find policy', 'Draft reply'].map((action) => (
              <button key={action} type="button" data-cuelume-hover="tick" data-cuelume-press>
                {action}
              </button>
            ))}
          </div>
        </section>

        <section className="card automation-card dimmable" data-cuelume-hover="whisper">
          <div className="meta-row">
            <span>Automations</span>
            <span>adaptive</span>
          </div>
          <div className="automation-list">
            {automations.map(([id, title, detail]) => (
              <button key={id} type="button" data-cuelume-hover="tick" data-cuelume-press>
                <span>{id}</span>
                <strong>{title}</strong>
                <small>{detail}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="card memory-card dimmable" data-cuelume-hover="tick">
          <div className="meta-row">
            <span>Memory</span>
            <span>contextual</span>
          </div>
          <p className="metric">24<small>hrs</small></p>
          <p className="mono-sub">Recent decisions, people, and project facts stay available without extra prompting.</p>
          <div className="segbar" aria-hidden="true">
            {Array.from({ length: 16 }).map((_, index) => (
              <i key={index} className={index < 12 ? 'on' : ''} />
            ))}
          </div>
        </section>

        <section className="card fit-card dimmable" data-cuelume-hover="tick">
          <div className="meta-row">
            <span>Fit Profile</span>
            <span>{mode.name}</span>
          </div>
          <div className="profile-stack">
            {modes.map((item, index) => (
              <button
                key={item.name}
                type="button"
                className={index === activeMode ? 'active' : ''}
                data-cuelume-toggle
                onClick={() => {
                  setActiveMode(index)
                  setReadiness(74 + index * 7)
                }}
              >
                <span>{item.name}</span>
                <small>{item.detail}</small>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
