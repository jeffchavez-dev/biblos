import { useState, useRef } from 'react'
import { checkAdminCredentials, recordLoginEvent, setSession } from '../auth.js'
import './LoginPage.css'

export default function LoginPage({ onEnter }) {
  const [error, setError] = useState('')
  const emailRef = useRef()
  const passRef = useRef()

  function handleSignIn(e) {
    e.preventDefault()
    const email = emailRef.current.value.trim()
    const pass = passRef.current.value

    if (checkAdminCredentials(email, pass)) {
      setSession('admin')
      recordLoginEvent('admin', email)
      onEnter()
    } else {
      setError('Incorrect email or password.')
    }
  }

  function handleGuest() {
    setSession('guest')
    recordLoginEvent('guest')
    onEnter()
  }

  return (
    <div className="lp-root">
      <div className="lp-left">
        <div className="lp-badge">
          <i className="ti ti-book-2" aria-hidden="true" />
          Koine Greek
        </div>
        <div className="lp-logo">
          <div className="lp-logo-greek">Βίβλος</div>
          <div className="lp-logo-sub">Koine for everyone</div>
        </div>
        <p className="lp-tagline">
          "The word of God is living and active, sharper than any two-edged sword."
        </p>
        <ul className="lp-features" aria-label="App features">
          <li><i className="ti ti-book" aria-hidden="true" /> Interactive story-based lessons</li>
          <li><i className="ti ti-cards" aria-hidden="true" /> 350+ vocabulary flashcards with images</li>
          <li><i className="ti ti-bible" aria-hidden="true" /> NT Greek reader with lexicon</li>
          <li><i className="ti ti-pencil" aria-hidden="true" /> Grammar notes and exercises</li>
        </ul>
      </div>

      <div className="lp-right">
        <div className="lp-card">
          <h1 className="lp-card-title">Welcome back</h1>
          <p className="lp-card-sub">Sign in to continue your study</p>

          <form onSubmit={handleSignIn} noValidate>
            <div className="lp-field">
              <label className="lp-label" htmlFor="lp-email">Email</label>
              <input
                id="lp-email"
                ref={emailRef}
                className="lp-input"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                onChange={() => setError('')}
              />
            </div>
            <div className="lp-field">
              <button type="button" className="lp-forgot">Forgot password?</button>
              <label className="lp-label" htmlFor="lp-pass">Password</label>
              <input
                id="lp-pass"
                ref={passRef}
                className="lp-input"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                onChange={() => setError('')}
              />
            </div>
            {error && <p className="lp-msg lp-msg--error">{error}</p>}
            <button type="submit" className="lp-btn-primary">Sign in</button>
          </form>

          <div className="lp-divider" aria-hidden="true">
            <span className="lp-divider-line" />
            <span className="lp-divider-text">or</span>
            <span className="lp-divider-line" />
          </div>

          <button className="lp-btn-guest" onClick={handleGuest}>
            <i className="ti ti-user" aria-hidden="true" />
            Continue as guest
          </button>

          <p className="lp-footer-note">
            Don't have an account? <span className="lp-link">Sign up free</span>
            <br />
            Guest access gives you full access to all chapters.
          </p>
        </div>
      </div>
    </div>
  )
}
