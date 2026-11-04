import React from "react";

export function PeopleIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="10.5" r="3.25" fill="currentColor" />
      <circle cx="7.5" cy="13" r="2.4" fill="currentColor" opacity=".8" />
      <circle cx="24.5" cy="13" r="2.4" fill="currentColor" opacity=".8" />
      <path
        d="M9.3 25c.4-4.1 2.7-6.3 6.7-6.3s6.3 2.2 6.7 6.3M3.7 24c.3-3.1 1.8-4.9 5-5.3m19.6 5.3c-.3-3.1-1.8-4.9-5-5.3"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Brand({ compact = false }) {
  return (
    <div className={`brand${compact ? " brand-compact" : ""}`}>
      <span className="brand-mark" aria-hidden="true">
        <PeopleIcon />
      </span>
      {!compact && (
        <span className="brand-copy">
          <strong>People &amp; Culture</strong>
          <span>HR ASSISTANT</span>
        </span>
      )}
    </div>
  );
}

export function Avatar({ name, small = false }) {
  const initials =
    name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?";

  return <span className={`avatar${small ? " avatar-small" : ""}`}>{initials}</span>;
}
