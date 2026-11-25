import React, { useEffect, useRef, useState } from "react";
import { request } from "../api.js";
import ChatComposer from "./ChatComposer.jsx";
import ChatHeader from "./ChatHeader.jsx";
import ChatSidebar from "./ChatSidebar.jsx";
import MessageList from "./MessageList.jsx";
import Welcome from "./Welcome.jsx";

export default function ChatPage({ user, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState("");
  const feedRef = useRef(null);
  const displayName = user.nickname?.trim() || user.username;

  useEffect(() => {
    let active = true;
    request(`/chat/history/${user.id}`)
      .then((history) => {
        if (active) {
          setMessages(
            history.map((entry) => ({
              role: entry.role,
              content: entry.content,
              createdAt: entry.created_at,
            })),
          );
        }
      })
      .catch((historyError) => {
        if (active) setError(historyError.message);
      })
      .finally(() => {
        if (active) setLoadingHistory(false);
      });
    return () => {
      active = false;
    };
  }, [user.id]);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, busy]);

  async function submitMessage(content) {
    if (!content || busy) return;

    const optimisticId = crypto.randomUUID();
    setError("");
    setMessage("");
    setMessages((current) => [
      ...current,
      { role: "user", content, localId: optimisticId },
    ]);
    setBusy(true);

    try {
      const response = await request("/chat/", {
        method: "POST",
        body: JSON.stringify({ user_id: user.id, message: content }),
      });
      setMessages((current) => [
        ...current,
        { role: "assistant", content: response.reply },
      ]);
    } catch (sendError) {
      setError(sendError.message);
      setMessages((current) =>
        current.filter((item) => item.localId !== optimisticId),
      );
      setMessage(content);
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    await submitMessage(message.trim());
  }

  return (
    <div className="app-shell">
      <ChatSidebar displayName={displayName} onLogout={onLogout} />
      <main className="chat-main">
        <ChatHeader displayName={displayName} />
        <section className="conversation">
          {loadingHistory ? (
            <div className="history-loading">
              <span className="loading-spinner" />
              Loading your conversation…
            </div>
          ) : messages.length === 0 ? (
            <Welcome displayName={displayName} onSelectPrompt={setMessage} />
          ) : (
            <MessageList
              messages={messages}
              displayName={displayName}
              busy={busy}
              feedRef={feedRef}
              onQuickReply={submitMessage}
            />
          )}
        </section>
        <ChatComposer
          error={error}
          message={message}
          busy={busy}
          loading={loadingHistory}
          onMessageChange={setMessage}
          onSubmit={sendMessage}
        />
      </main>
    </div>
  );
}
