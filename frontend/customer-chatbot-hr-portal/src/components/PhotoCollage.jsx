import React from "react";

export default function PhotoCollage() {
  return (
    <div
      className="login-art"
      aria-label="People supporting one another at work"
    >
      <div className="photo-collage">
        <div className="photo-bubble photo-bubble-one">
          <img
            src="/images/hr-team.jpg"
            alt="Colleagues sharing ideas around a table"
          />
        </div>
        <div className="photo-bubble photo-bubble-two">
          <img
            src="/images/hr-support.jpg"
            alt="Colleagues supporting one another"
          />
        </div>
        <div className="photo-bubble photo-bubble-three">
          <img
            src="/images/hr-interview.jpg"
            alt="A welcoming workplace conversation"
          />
        </div>
        <div className="photo-bubble photo-bubble-four">
          <img
            src="/images/hr-collaboration.jpg"
            alt="A team working together"
          />
        </div>
        <div className="photo-message">
          <span>PEOPLE FIRST, ALWAYS</span>
          <strong>A better workplace starts with a conversation.</strong>
        </div>
        <a
          className="photo-credit"
          href="https://unsplash.com"
          target="_blank"
          rel="noreferrer"
        >
          Photos via Unsplash
        </a>
      </div>
    </div>
  );
}
