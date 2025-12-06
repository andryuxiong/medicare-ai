import React from 'react';

const SuggestionTray = ({ suggestions, onSuggest }) => {
  return (
    <div className="suggestion-tray">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          className="pill-btn ghost"
          onClick={() => onSuggest(suggestion)}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
};

export default SuggestionTray;
