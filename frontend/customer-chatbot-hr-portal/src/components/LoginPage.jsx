import React, { useState } from "react";
import { ADMIN_PORTAL_URL, API_URL, request } from "../api.js";
import { Brand } from "./Brand.jsx";
import PhotoCollage from "./PhotoCollage.jsx";

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";

  async function submit(event) {
    event.preventDefault();
    setError("");

    const trimmedUsername = username.trim();
    if (!isSignup && trimmedUsername.toLowerCase() === "admin") {
      const adminUrl = new URL(ADMIN_PORTAL_URL);
      adminUrl.searchParams.set("admin", trimmedUsername);
      window.location.assign(adminUrl);
      return;
    }

    setBusy(true);
    try {
      const user = await request(isSignup ? "/users/" : "/users/login", {
        method: "POST",
        body: JSON.stringify(
          isSignup
            ? { username: trimmedUsername, nickname: nickname.trim() || null }
            : { username: trimmedUsername },
        ),
      });
      onLogin(user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-topbar">
        <Brand />
        <a
          className="docs-link"
          href={`${API_URL}/docs`}
          target="_blank"
          rel="noreferrer"
        >
          API documentation <span aria-hidden="true">↗</span>
        </a>
      </div>
      <div className="login-content">
        <PhotoCollage />

        <section className="login-panel">
          <div className="login-eyebrow">
            <span /> YOUR WORKPLACE, MADE EASIER
          </div>
          <h1>A helping hand can go beyond expectations.</h1>
          <p className="login-intro">
            Get thoughtful answers to your workplace questions, whenever you need
            them.
          </p>
          <div className="auth-tabs" role="tablist" aria-label="Account options">
            <button
              className={!isSignup ? "active" : ""}
              onClick={() => {
                setMode("login");
                setError("");
              }}
              role="tab"
              aria-selected={!isSignup}
              type="button"
            >
              Sign in
            </button>
            <button
              className={isSignup ? "active" : ""}
              onClick={() => {
                setMode("signup");
                setError("");
              }}
              role="tab"
              aria-selected={isSignup}
              type="button"
            >
              Create account
            </button>
          </div>
          <form onSubmit={submit} className="auth-form">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              autoComplete="username"
              maxLength={100}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="e.g. alex.morgan"
              required
              value={username}
            />
            {isSignup && (
              <>
                <label htmlFor="nickname">
                  Display name <span>(optional)</span>
                </label>
                <input
                  id="nickname"
                  autoComplete="name"
                  maxLength={100}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="What should we call you?"
                  value={nickname}
                />
              </>
            )}
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button
              className="primary-button login-submit"
              disabled={busy}
              type="submit"
            >
              {busy ? "One moment…" : isSignup ? "Create your account" : "Continue"}
              {!busy && <span aria-hidden="true">→</span>}
            </button>
          </form>
          <div className="login-footnote">
            By continuing, you agree to use this assistant responsibly and
            respectfully.
          </div>
        </section>
      </div>
      <footer className="login-footer">
        <span>Made for people, by people.</span>
        <span>Private · Supportive · Here to help</span>
      </footer>
    </main>
  );
}
