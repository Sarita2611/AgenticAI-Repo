import React from "react";

export default function ChatComposer({
  error,
  message,
  busy,
  loading,
  onMessageChange,
  onSubmit,
}) {
  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form.requestSubmit();
    }
  }

  return (
    <div className="composer-wrap">
      {error && (
        <div className="chat-error" role="alert">
          {error}
        </div>
      )}
      <form className="composer" onSubmit={onSubmit}>
        <textarea
          aria-label="Your message"
          disabled={busy || loading}
          onChange={(event) => onMessageChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a workplace question…"
          rows="1"
          value={message}
        />
        <button
          aria-label="Send message"
          className="send-button"
          disabled={!message.trim() || busy || loading}
          type="submit"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5 12h14M13 5l7 7-7 7"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>
      <div className="composer-caption">
        <span>Thoughtful guidance, not a substitute for official HR policy.</span>
        <span>
          ↵ Send <b>·</b> ⇧↵ New line
        </span>
      </div>
    </div>
  );
}
