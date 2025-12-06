import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ChatTimeline = ({ messages, isTyping, scrollRef, endRef, onScroll }) => {
  return (
    <section className="chat-feed" ref={scrollRef} onScroll={onScroll}>
      {messages.map((message) => (
        <article
          key={message.id}
          className={`chat-message chat-message--${message.from}`}
        >
          <div className="chat-message__avatar" aria-hidden="true">
            {message.from === 'bot' ? 'rx' : 'you'}
          </div>
          <div className="chat-message__body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
          </div>
        </article>
      ))}
      {isTyping && (
        <article className="chat-message chat-message--bot">
          <div className="chat-message__avatar" aria-hidden="true">rx</div>
          <div className="chat-message__body typing">
            <span />
            <span />
            <span />
          </div>
        </article>
      )}
      <div ref={endRef} />
    </section>
  );
};

export default ChatTimeline;
