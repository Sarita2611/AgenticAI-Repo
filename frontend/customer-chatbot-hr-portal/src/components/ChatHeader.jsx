import React from "react";
import { Avatar } from "./Brand.jsx";

export default function ChatHeader({ displayName }) {
  return (
    <header className="chat-header">
      <div className="breadcrumb">
        <span>YOUR SPACE</span>
        <b>/</b>
        <strong className="assistant-title">HR Assistant</strong>
      </div>
      <div className="header-account">
        <div className="header-status">
          <span className="status-dot" /> Here to help
        </div>
        <div className="header-user" aria-label={`Signed in as ${displayName}`}>
          <Avatar name={displayName} small />
          <span>{displayName}</span>
        </div>
      </div>
    </header>
  );
}
