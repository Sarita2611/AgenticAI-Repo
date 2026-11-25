import React from "react";
import { Avatar, Brand } from "./Brand.jsx";

const policyPagesPattern =
  /\n\nSource: HR Policy Manual 2023\.pdf \(pages: ([\d, ]+)\)$/;
const webSearchOffer =
  "Would you like me to search the web for a general answer? Reply yes or no.";

function Message({
  message,
  displayName,
  onQuickReply,
  busy,
  isLastMessage,
}) {
  const isUser = message.role === "user";
  const content = message.content || "";
  const citation = isUser ? null : content.match(policyPagesPattern);
  const messageContent = citation
    ? content.slice(0, citation.index)
    : content;
  const sourcePages = citation
    ? citation[1]
        .split(",")
        .map((page) => page.trim())
        .filter(Boolean)
    : [];

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
        <p>{messageContent}</p>
        {sourcePages.length > 0 && (
          <small className="message-source">
            Source: HR Policy Manual 2023.pdf · page
            {sourcePages.length > 1 ? "s" : ""} {sourcePages.join(", ")}
          </small>
        )}
        {!isUser && isLastMessage && content.includes(webSearchOffer) && (
          <div className="web-search-choices" aria-label="Web search choice">
            <button
              type="button"
              disabled={busy}
              onClick={() => onQuickReply("Yes")}
            >
              Yes, search
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onQuickReply("No")}
            >
              No, thanks
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export default function MessageList({
  messages,
  displayName,
  busy,
  feedRef,
  onQuickReply,
}) {
  return (
    <div className="message-list" ref={feedRef} aria-live="polite">
      <div className="conversation-date">YOUR CONVERSATION</div>
      {messages.map((message, index) => (
        <Message
          key={message.localId || `${index}-${message.role}`}
          message={message}
          displayName={displayName}
          busy={busy}
          onQuickReply={onQuickReply}
          isLastMessage={index === messages.length - 1}
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
