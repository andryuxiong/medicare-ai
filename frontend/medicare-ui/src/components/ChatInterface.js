import React, { useState, useEffect, useRef } from 'react';
import { sendChatMessage, analyzeSymptoms } from '../services/api';
import './ChatInterface.css';

const MEDICAL_DISCLAIMER = "⚠️ IMPORTANT: This is not medical advice. This AI assistant provides general health information only and cannot diagnose, treat, or prescribe medications. Always consult a qualified healthcare professional for medical concerns. In case of emergency, call 911 immediately.";

const ChatInterface = () => {
  const [messages, setMessages] = useState([
    {
      type: 'disclaimer',
      content: MEDICAL_DISCLAIMER
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e, isRetry = false) => {
    e.preventDefault();
    
    // Input validation
    const userMessage = isRetry ? 
      messages[messages.length - 2]?.content : 
      inputMessage.trim();
      
    if (!userMessage) return;
    
    // Sanitize input
    const sanitizedMessage = userMessage.slice(0, 1000); // Limit length
    
    if (!isRetry) {
      setInputMessage('');
      // Add user message to chat
      setMessages(prev => [...prev, { type: 'user', content: sanitizedMessage }]);
    }
    
    setError(null);
    setIsLoading(true);

    try {
      // Send message to backend with timeout
      const response = await Promise.race([
        sendChatMessage(sanitizedMessage),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 30000)
        )
      ]);
      
      // Add AI response to chat
      if (response.aiResponse) {
        setMessages(prev => [...prev, { type: 'ai', content: response.aiResponse }]);
      }

      // Add disclaimer after AI response
      if (response.aiResponse && !isRetry) {
        setMessages(prev => [...prev, { 
          type: 'disclaimer', 
          content: "💡 Remember: This information is for educational purposes only. Please consult with a healthcare professional for personalized medical advice."
        }]);
      }

      // Add symptom analysis if available
      if (response.symptomResult) {
        const symptomMessage = formatSymptomResult(response.symptomResult);
        setMessages(prev => [...prev, { type: 'analysis', content: symptomMessage }]);
      }
      
      setRetryCount(0); // Reset retry count on success
      
    } catch (err) {
      console.error('Error:', err);
      
      // Implement retry logic
      if (retryCount < 3 && (err.message === 'Request timeout' || err.message.includes('fetch'))) {
        setRetryCount(prev => prev + 1);
        setError(`Connection issue. Retrying... (${retryCount + 1}/3)`);
        setTimeout(() => handleSendMessage(e, true), 2000);
      } else {
        let errorMessage = 'Sorry, I\'m having trouble connecting right now. ';
        
        if (err.message.includes('429')) {
          errorMessage += 'Too many requests. Please wait a moment and try again.';
        } else if (err.message.includes('500')) {
          errorMessage += 'The service is temporarily unavailable.';
        } else {
          errorMessage += 'Please check your internet connection and try again.';
        }
        
        setError(errorMessage);
        setRetryCount(0);
      }
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