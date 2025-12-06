import React from 'react';

const ChatComposer = ({
  value,
  onChange,
  onSubmit,
  isSending,
  listening,
  onMicPress,
  onMicRelease,
}) => {
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="chat-composer">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write a symptom, medication, or Medicare question"
        rows={2}
      />
      <div className="composer-actions">
        <button
          type="button"
          className={`icon-btn mic ${listening ? 'active' : ''}`}
          onMouseDown={onMicPress}
          onMouseUp={onMicRelease}
          onTouchStart={onMicPress}
          onTouchEnd={onMicRelease}
          aria-label="Hold to dictate"
        >
          🎙️
        </button>
        <button
          type="button"
          className="icon-btn send"
          onClick={onSubmit}
          disabled={isSending || !value.trim()}
          aria-label="Send message"
        >
          {isSending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
};

export default ChatComposer;
