import { useCallback, useEffect, useRef, useState } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

import ChatHeader from './components/chat/ChatHeader';
import ChatTimeline from './components/chat/ChatTimeline';
import ChatComposer from './components/chat/ChatComposer';
import SuggestionTray from './components/chat/SuggestionTray';
import { sendChatMessage } from './services/api';
import './App.css';

const POP_SOUND_URL = process.env.PUBLIC_URL + '/pop.mp3';
const STORAGE_KEY = 'medicare-chat';
const DEFAULT_BOT_GREETING = `Hi there! I'm your Medicare AI companion.\n\nTell me what's going on and we'll look at trusted sources together.`;
const SUGGESTIONS = [
  'I have chest tightness and dizziness',
  'Explain how Medicare Part D works',
  'What should I ask before starting a new medication?',
  'Can insomnia be related to blood pressure meds?'
];

let messageSeed = 0;
const createMessage = (from, text) => ({ id: `${Date.now()}-${messageSeed++}`, from, text });

function App() {
  const [messages, setMessages] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return saved ? JSON.parse(saved) : [createMessage('bot', DEFAULT_BOT_GREETING)];
  });
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [theme, setTheme] = useState('day');
  const [sessionId, setSessionId] = useState(null);
  const [requestError, setRequestError] = useState(null);

  const chatRef = useRef(null);
  const chatEndRef = useRef(null);

  const { transcript, listening, resetTranscript } = useSpeechRecognition();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isBotTyping]);

  useEffect(() => {
    if (messages.length > 1 && messages[messages.length - 1].from === 'bot') {
      const audio = new Audio(POP_SOUND_URL);
      audio.volume = 0.35;
      audio.play().catch(() => {});
    }
  }, [messages]);

  const startListening = () => {
    SpeechRecognition.startListening({ continuous: false, language: 'en-US' });
  };

  const stopListening = () => {
    SpeechRecognition.stopListening();
    if (transcript) {
      setInput(transcript);
      resetTranscript();
    }
  };

  const appendMessage = useCallback((from, text) => {
    setMessages((prev) => [...prev, createMessage(from, text)]);
  }, []);

  const formatSymptomResult = (result) => {
    if (!result) return null;
    return `Symptom checker result\n\nCondition: ${result.condition || 'Unknown'}\nMedication: ${result.medication || 'None recommended'}\nAdvice: ${result.advice || 'Please consult a healthcare professional.'}`;
  };

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    appendMessage('user', trimmed);
    setInput('');
    setIsSending(true);
    setIsBotTyping(true);
    setRequestError(null);

    try {
      const response = await sendChatMessage(trimmed);
      if (response.sessionId) {
        setSessionId(response.sessionId);
      }

      if (response.aiResponse) {
        appendMessage('bot', response.aiResponse);
      } else {
        appendMessage('bot', "I'm still pulling up the reference materials. Could you try again?");
      }

      const symptomBlock = formatSymptomResult(response.symptomResult);
      if (symptomBlock) {
        appendMessage('bot', symptomBlock);
      }

      if (response.disclaimer) {
        appendMessage('system', response.disclaimer);
      }
    } catch (error) {
      console.error('Chat error', error);
      setRequestError('Unable to reach the assistant right now. Please try again soon.');
      appendMessage('bot', 'I lost my connection to the medical references. Mind trying once more in a minute?');
    } finally {
      setIsSending(false);
      setIsBotTyping(false);
    }
  }, [appendMessage, input, isSending]);

  const handleSuggestion = (suggestion) => {
    setInput(suggestion);
  };

  const clearChat = () => {
    setMessages([createMessage('bot', DEFAULT_BOT_GREETING)]);
    setSessionId(null);
    setRequestError(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'day' ? 'night' : 'day'));
  };

  const handleScroll = () => {
    // placeholder for future analytics / pinned states
  };

  return (
    <div className="app-shell" data-theme={theme}>
      <div className="chat-panel">
        <ChatHeader theme={theme} onToggleTheme={toggleTheme} onClear={clearChat} />
        <div className="session-chip">
          <span className="dot" />
          {sessionId ? `Session ${sessionId.slice(0, 5)}` : 'New session'}
        </div>
        <ChatTimeline
          messages={messages}
          isTyping={isBotTyping}
          scrollRef={chatRef}
          endRef={chatEndRef}
          onScroll={handleScroll}
        />
        <SuggestionTray suggestions={SUGGESTIONS} onSuggest={handleSuggestion} />
        {requestError && <p className="error-banner">{requestError}</p>}
        <ChatComposer
          value={input}
          onChange={setInput}
          onSubmit={send}
          isSending={isSending}
          listening={listening}
          onMicPress={startListening}
          onMicRelease={stopListening}
        />
        <p className="disclaimer">
          ⚠️ Educational guidance only. Call 911 for emergencies and speak with your healthcare team before acting on any information here.
        </p>
      </div>
    </div>
  );
}

export default App;
