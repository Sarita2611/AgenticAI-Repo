import React from "react";
import { Avatar, Brand } from "./Brand.jsx";

function Message({ message, displayName }) {
  const isUser = message.role === "user";
  return (
    <article className={`message-row ${isUser ? "from-user" : ""}`}>
      {isUser ? (
        <Avatar name={displayName} small />
      ) : (
        <div className="assistant-avatar">
          <Brand compact />
        </div>
      )}
      <div className="message-body">
        <div className="message-meta">
          <strong>{isUser ? displayName : "HR Assistant"}</strong>
          <span>{isUser ? "YOU" : "PEOPLE & CULTURE"}</span>
        </div>
        <p>{message.content}</p>
      </div>
    </article>
  );
}

export default function MessageList({
  messages,
  displayName,
  busy,
  feedRef,
}) {
  return (
    <div className="message-list" ref={feedRef} aria-live="polite">
      <div className="conversation-date">YOUR CONVERSATION</div>
      {messages.map((message, index) => (
        <Message
          key={message.localId || `${index}-${message.role}`}
          message={message}
          displayName={displayName}
        />
      ))}
      {busy && (
        <article className="message-row">
          <div className="assistant-avatar">
            <Brand compact />
          </div>
          <div className="typing-indicator" aria-label="Assistant is typing">
            <i />
            <i />
            <i />
          </div>
        </article>
      )}
    </div>
  );
}
