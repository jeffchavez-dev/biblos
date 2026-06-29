// Hardcoded admin credentials — replace with real auth when backend is ready
const ADMIN_EMAIL = 'admin@biblos.app'
const ADMIN_PASSWORD = 'Biblos2024!'

export function checkAdminCredentials(email, password) {
  return email === ADMIN_EMAIL && password === ADMIN_PASSWORD
}

export function recordLoginEvent(type, email = null) {
  const log = getLoginLog()
  log.unshift({
    id: Date.now(),
    type,           // 'admin' | 'user' | 'guest'
    email: email || null,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  })
  // Keep last 200 events
  localStorage.setItem('biblos_login_log', JSON.stringify(log.slice(0, 200)))
}

export function getLoginLog() {
  try {
    return JSON.parse(localStorage.getItem('biblos_login_log') || '[]')
  } catch {
    return []
  }
}

export function getSession() {
  return localStorage.getItem('biblos_session') || null
}

export function setSession(role) {
  localStorage.setItem('biblos_session', role)
}

export function clearSession() {
  localStorage.removeItem('biblos_session')
}
