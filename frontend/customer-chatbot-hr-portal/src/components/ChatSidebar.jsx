import React from "react";
import { Avatar, Brand, PeopleIcon } from "./Brand.jsx";

export default function ChatSidebar({ displayName, onLogout }) {
  return (
    <aside className="sidebar">
      <Brand />
      <div className="sidebar-label">YOUR SPACE</div>
      <button className="side-nav active" type="button">
        <span className="nav-icon">
          <PeopleIcon />
        </span>{" "}
        HR Assistant
        <span className="nav-indicator" />
      </button>
      <div className="sidebar-note">
        <span className="note-icon">♡</span>
        <strong>A safe space to ask</strong>
        <p>Get guidance on work, wellbeing, and everything in between.</p>
      </div>
      <div className="sidebar-bottom">
        <div className="profile">
          <Avatar name={displayName} />
          <span className="profile-name">
            <strong>{displayName}</strong>
            <small>Team member</small>
          </span>
          <button
            className="logout-button"
            onClick={onLogout}
            title="Sign out"
            type="button"
          >
            ↪
          </button>
        </div>
      </div>
    </aside>
  );
}
