import React, { useState, useEffect, useRef } from 'react';
import { sendChatMessage, analyzeSymptoms } from '../services/api';
import './ChatInterface.css';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setError(null);
    setIsLoading(true);

    // Add user message to chat
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);

    try {
      // Send message to backend
      const response = await sendChatMessage(userMessage);
      
      // Add AI response to chat
      if (response.aiResponse) {
        setMessages(prev => [...prev, { type: 'ai', content: response.aiResponse }]);
      }

      // Add symptom analysis if available
      if (response.symptomResult) {
        const symptomMessage = formatSymptomResult(response.symptomResult);
        setMessages(prev => [...prev, { type: 'analysis', content: symptomMessage }]);
      }
    } catch (err) {
      setError('Failed to get response. Please try again.');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatSymptomResult = (result) => {
    if (!result) return 'No specific condition identified.';
    
    return `
      Condition: ${result.condition || 'Unknown'}
      Medication: ${result.medication || 'None recommended'}
      Advice: ${result.advice || 'Please consult a healthcare provider'}
    `;
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.type}`}>
            <div className="message-content">
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message ai">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSendMessage} className="chat-input-form">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !inputMessage.trim()}>
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatInterface; 