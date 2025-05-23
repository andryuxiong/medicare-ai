/**
 * API Service for Medicare AI Chatbot
 * This service handles all communication with the backend API endpoints.
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

/**
 * Sends a message to the chat-combined endpoint
 * @param {string} message - The user's message
 * @returns {Promise<Object>} - Response containing AI response and symptom results
 */
export const sendChatMessage = async (message) => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat-combined`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
};

/**
 * Analyzes symptoms with language support
 * @param {string} text - The symptom text to analyze
 * @param {string} lang - Language code (default: 'en')
 * @returns {Promise<Object>} - Response containing analysis results
 */
export const analyzeSymptoms = async (text, lang = 'en') => {
  try {
    const response = await fetch(`${API_BASE_URL}/analyze-ml?lang=${lang}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error analyzing symptoms:', error);
    throw error;
  }
}; 