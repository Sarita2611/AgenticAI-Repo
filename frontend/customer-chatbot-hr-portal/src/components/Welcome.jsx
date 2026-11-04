import React from "react";
import { Brand } from "./Brand.jsx";

const PROMPTS = [
  { icon: "◷", title: "Time off & leave", text: "How do I request time off?" },
  { icon: "♡", title: "Wellbeing", text: "What wellbeing support is available?" },
  { icon: "↗", title: "Growing at work", text: "How can I talk about career growth?" },
];

export default function Welcome({ displayName, onSelectPrompt }) {
  const firstName = displayName.split(/\s+/)[0];

  return (
    <div className="welcome">
      <div className="welcome-icon">
        <Brand compact />
      </div>
      <div className="welcome-kicker">A HUMAN-CENTERED HR ASSISTANT</div>
      <h1>
        Hi {firstName},<br />
        what's on your mind?
      </h1>
      <p>
        Work questions can be tricky. I'm here to help you find a thoughtful place
        to start — no question is too small.
      </p>
      <div className="prompt-grid">
        {PROMPTS.map((prompt) => (
          <button
            className="prompt-card"
            key={prompt.title}
            onClick={() => onSelectPrompt(prompt.text)}
            type="button"
          >
            <span className="prompt-icon">{prompt.icon}</span>
            <strong>{prompt.title}</strong>
            <span>{prompt.text}</span>
            <b aria-hidden="true">↗</b>
          </button>
        ))}
      </div>
    </div>
  );
}
