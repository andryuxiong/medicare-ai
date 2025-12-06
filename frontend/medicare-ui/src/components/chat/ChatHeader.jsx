import React from 'react';

const ChatHeader = ({ theme, onToggleTheme, onClear }) => {
  return (
    <header className="chat-header">
      <div>
        <p className="eyebrow">Medicare companion</p>
        <h1>Medicare AI</h1>
        <p className="subline">
          Guidance for symptoms, medications, and Medicare coverage. Friendly tone, real citations.
        </p>
      </div>
      <div className="header-actions">
        <button
          type="button"
          className="pill-btn"
          aria-label="Toggle color theme"
          onClick={onToggleTheme}
        >
          {theme === 'day' ? 'Night mode' : 'Day mode'}
        </button>
        <button
          type="button"
          className="pill-btn ghost"
          aria-label="Clear chat history"
          onClick={onClear}
        >
          Reset chat
        </button>
      </div>
    </header>
  );
};

export default ChatHeader;
