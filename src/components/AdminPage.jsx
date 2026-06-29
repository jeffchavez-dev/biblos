import { useState, useEffect } from 'react'
import { getLoginLog, clearSession } from '../auth.js'
import './AdminPage.css'

const TYPE_LABELS = {
  admin: { label: 'Admin', cls: 'badge-admin' },
  user: { label: 'User', cls: 'badge-user' },
  guest: { label: 'Guest', cls: 'badge-guest' },
}

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function parseDevice(ua) {
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS'
  if (/Android/.test(ua)) return 'Android'
  if (/Macintosh/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Unknown'
}

function parseBrowser(ua) {
  if (/Edg\//.test(ua)) return 'Edge'
  if (/Chrome\//.test(ua)) return 'Chrome'
  if (/Firefox\//.test(ua)) return 'Firefox'
  if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return 'Safari'
  return 'Browser'
}

export default function AdminPage({ onExit }) {
  const [log, setLog] = useState([])
  const [filter, setFilter] = useState('all')

  useEffect(() => { setLog(getLoginLog()) }, [])

  const filtered = filter === 'all' ? log : log.filter(e => e.type === filter)

  function handleSignOut() {
    clearSession()
    onExit()
  }

  const counts = {
    all: log.length,
    admin: log.filter(e => e.type === 'admin').length,
    user: log.filter(e => e.type === 'user').length,
    guest: log.filter(e => e.type === 'guest').length,
  }

  return (
    <div className="ap-root">
      <header className="ap-header">
        <div className="ap-header-left">
          <span className="ap-logo-greek">Βίβλος</span>
          <span className="ap-header-sep" aria-hidden="true" />
          <span className="ap-header-title">Admin — Login Activity</span>
        </div>
        <button className="ap-signout" onClick={handleSignOut}>
          <i className="ti ti-logout" aria-hidden="true" />
          Sign out
        </button>
      </header>

      <main className="ap-main">
        <div className="ap-stats">
          {['all', 'admin', 'user', 'guest'].map(t => (
            <button
              key={t}
              className={`ap-stat-card ${filter === t ? 'ap-stat-card--active' : ''}`}
              onClick={() => setFilter(t)}
            >
              <span className="ap-stat-num">{counts[t]}</span>
              <span className="ap-stat-label">{t === 'all' ? 'Total logins' : `${t.charAt(0).toUpperCase() + t.slice(1)} logins`}</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="ap-empty">
            <i className="ti ti-clock" aria-hidden="true" />
            <p>No login events recorded yet.</p>
          </div>
        ) : (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Type</th>
                  <th>Email</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Device</th>
                  <th>Browser</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => {
                  const badge = TYPE_LABELS[e.type] || TYPE_LABELS.guest
                  return (
                    <tr key={e.id}>
                      <td className="ap-td-num">{filtered.length - i}</td>
                      <td><span className={`ap-badge ${badge.cls}`}>{badge.label}</span></td>
                      <td className="ap-td-email">{e.email || <span className="ap-muted">—</span>}</td>
                      <td>{formatDate(e.timestamp)}</td>
                      <td className="ap-muted">{formatTime(e.timestamp)}</td>
                      <td>{parseDevice(e.userAgent)}</td>
                      <td>{parseBrowser(e.userAgent)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
