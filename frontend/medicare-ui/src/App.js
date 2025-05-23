import { useState, useRef, useEffect } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Get the backend URL from environment variable

// The fetch call will append '/api/chat-combined' to this base URL.
const BACKEND_URL = process.env.REACT_APP_API_URL || "https://medicare-ai.up.railway.app";
console.log("Current BACKEND_URL:", BACKEND_URL);

// Add a list of quick suggestion questions
const SUGGESTIONS = [
  "What should I do if I have a fever?",
  "How can I improve my sleep?"
];

// pop sound
const POP_SOUND_URL = process.env.PUBLIC_URL + '/pop.mp3';

function App() {
  const [input, setInput] = useState("");
  const [chat,  setChat]  = useState([]);
  const [lang, setLang] = useState("en")
  const [sendAnim, setSendAnim] = useState(false);
  const chatEndRef = useRef(null);
  const [isBotTyping, setIsBotTyping] = useState(false); // Track if bot is 'typing'
  const [theme, setTheme] = useState('light'); // 'light' or 'dark'
  const [showScrollButton, setShowScrollButton] = useState(false);
  const chatSectionRef = useRef(null);

  /* Hook gives us live transcript + listening flag*/
  const { transcript, listening, resetTranscript } = useSpeechRecognition();

  // How this works, startListening() tells the browser to begin the speech recognition onMouseDown
  // When onMouseUp, stopListening() activates which stop the recogntion and copies the sentence into chat (should implement to automatically input on voice input)

  // Called while user is holding down the mic button
  function startListening(){
    console.log("🔴 startListening");
    SpeechRecognition.startListening({continuous: false}); // stop on silence
  }

  // Called when user releases the mic button 
  function stopListening(){
    SpeechRecognition.stopListening();
    console.log("🟢 stopListening:", transcript);
    /* Move transcript text into the input box, clear the transcript buffer*/
    if (transcript){
      setInput(transcript);
      resetTranscript();
    }
  }
  
  // Enhanced auto-scroll and scroll button logic
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    if (chatSectionRef.current) {
      const el = chatSectionRef.current;
      // If user is near the bottom, hide the button
      setShowScrollButton(el.scrollHeight - el.scrollTop - el.clientHeight < 60);
    }
  }, [chat]);

  // Show/hide scroll button on manual scroll
  function handleChatScroll() {
    if (chatSectionRef.current) {
      const el = chatSectionRef.current;
      setShowScrollButton(el.scrollHeight - el.scrollTop - el.clientHeight < 60);
    }
  }

  function scrollToBottom() {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }

  // Play pop sound when a new bot message arrives
  useEffect(() => {
    if (chat.length > 1 && chat[chat.length-1].from === 'bot') {
      const audio = new Audio(POP_SOUND_URL);
      audio.volume = 0.5; // Increased volume for clarity (adjust as needed)
      audio.play();
    }
  }, [chat]);

  // Add Google Fonts import for Quicksand
  // (This will be injected into the document head)
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  // Update the welcome message to be friendlier and spaced out
  useEffect(() => {
    if (chat.length === 0) {
      setChat([
        {
          from: 'bot',
          text: "Hi there! 👋\n\nI'm your friendly Medicare bot.\nHow can I help you today?"
        }
      ]);
    }
    // eslint-disable-next-line
  }, []);

  // Persistent chat: load from localStorage on mount
  useEffect(() => {
    const savedChat = localStorage.getItem('medicare-chat');
    if (savedChat) {
      setChat(JSON.parse(savedChat));
    }
  }, []);

  // Persistent chat: save to localStorage on chat change
  useEffect(() => {
    if (chat.length > 0) {
      localStorage.setItem('medicare-chat', JSON.stringify(chat));
    }
  }, [chat]);

  // Theme color palettes
  const palette = theme === 'light' ? {
    background: 'linear-gradient(135deg, #e0eafc 0%, #b6e2d3 100%)',
    card: 'white',
    cardBorder: '6px solid',
    cardBorderImage: 'linear-gradient(180deg, #1976d2 0%, #b6e2d3 100%) 1',
    cardShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
    header: '#1976d2',
    headerGradient: 'linear-gradient(90deg, #1976d2 60%, #b6e2d3 100%)',
    bubbleBot: '#e3f2fd',
    bubbleUser: '#b6e2d3',
    text: '#222',
    label: '#1976d2',
    inputBg: '#f0f4fa',
    suggestionBg: '#e3f2fd',
    suggestionText: '#1976d2',
  } : {
    background: 'linear-gradient(135deg, #232946 0%, #1a1a2e 100%)',
    card: '#232946',
    cardBorder: '6px solid',
    cardBorderImage: 'linear-gradient(180deg, #f6c90e 0%, #232946 100%) 1',
    cardShadow: '0 8px 32px 0 rgba(246, 201, 14, 0.10)',
    header: '#f6c90e',
    bubbleBot: '#2e3350', // darker for better contrast
    bubbleUser: '#f6c90e',
    text: '#f4f4f4',
    label: '#f6c90e',
    inputBg: '#393e46',
    suggestionBg: '#393e46',
    suggestionText: '#f6c90e',
  };

  async function send() {
    if (!input.trim()) return;
    setSendAnim(true);
    setTimeout(() => setSendAnim(false), 250);
    setIsBotTyping(true);

    const userMsg = { from: "user", text: input };
    setChat((c) => [...c, userMsg]);
    setInput("");

    try {
      // The backend endpoint is at /api/chat-combined, so we append it here.
      // If BACKEND_URL already ends with /api, this would result in a double /api/api/chat-combined (which is incorrect!)
      console.log("Sending request to:", `${BACKEND_URL}/api/chat-combined`);
      const res = await fetch(`${BACKEND_URL}/api/chat-combined`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.text })
      });

      if (!res.ok) {
        console.error("API response not OK:", res.status, res.statusText);
        setChat((c) => [
          ...c,
          {
            from: "bot",
            text: "Sorry, I couldn't reach the Bot. Please try again later."
          }
        ]);
        setIsBotTyping(false);
        return;
      }

      const data = await res.json();
      setIsBotTyping(false);

      // Add the AI response to the chat
      if (data.aiResponse) {
        setChat((c) => [...c, { from: "bot", text: data.aiResponse }]);
      }

      // Add the symptom checker result if present
      if (data.symptomResult) {
        const { condition, medication, advice } = data.symptomResult;
        setChat((c) => [
          ...c,
          {
            from: "bot",
            text:
              "Symptom Checker Result:\n" +
              `• Condition: ${condition || "Unknown"}\n` +
              `• Medication: ${medication || "None recommended"}\n` +
              `• Advice: ${advice || "Please consult a healthcare provider."}`
          }
        ]);
      }
    } catch (error) {
      console.error("API call failed:", error);
      setChat((c) => [
        ...c,
        {
          from: "bot",
          text: "Sorry, something went wrong. Please try again later 😔"
        }
      ]);
      setIsBotTyping(false);
    }
  }

  // Clear chat handler
  function clearChat() {
    setChat([
      {
        from: 'bot',
        text: "Hi there! 👋\n\nI'm your friendly Medicare bot.\nHow can I help you today?"
      }
    ]);
    localStorage.removeItem('medicare-chat');
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: palette.background,
      backgroundImage: theme === 'light'
        ? 'radial-gradient(circle, #d1eaff 1px, transparent 1px), radial-gradient(circle, #b6e2d3 1px, transparent 1px)'
        : 'radial-gradient(circle, #393e46 1px, transparent 1px), radial-gradient(circle, #232946 1px, transparent 1px)',
      backgroundSize: '28px 28px',
      backgroundPosition: '0 0, 14px 14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Quicksand, sans-serif',
      padding: '1rem',
      color: palette.text,
      transition: 'background 0.4s',
    }}>
      <div className="card-accent fade-in-card" style={{
        background: palette.card,
        borderRadius: '32px',
        boxShadow: palette.cardShadow,
        padding: '2rem',
        maxWidth: 420,
        width: '100%',
        minHeight: 500,
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        position: 'relative',
        transition: 'box-shadow 0.3s, background 0.4s',
        ...(theme === 'dark' ? { boxShadow: '0 0 24px 0 #f6c90e33' } : {}), // Soft glow in night mode
      }}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:0}}>
          <h1 style={{
            textAlign: 'center',
            marginBottom: 0,
            letterSpacing: 1,
            fontFamily: 'Quicksand, Segoe UI',
            fontWeight: 700,
            fontSize: '2.1em',
            color: palette.header,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5em',
            ...(theme === 'light' ? {
              background: palette.headerGradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 2px 8px #b6e2d3',
            } : {
              background: 'none',
              WebkitBackgroundClip: 'initial',
              WebkitTextFillColor: 'initial',
              textShadow: '0 2px 8px #232946',
            }),
            transition: 'color 0.4s',
          }}>
            {/* Friendly waving hand emoji for warmth */}
            <span role="img" aria-label="wave" style={{fontSize:'1.2em'}}>👋</span>
            Medicare AI
          </h1>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            {/* Day/Night mode toggle button */}
            <button
              aria-label="Toggle day/night mode"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.7em',
                marginLeft: 12,
                transition: 'transform 0.2s',
                transform: theme === 'dark' ? 'rotate(-20deg) scale(1.1)' : 'rotate(0deg) scale(1)',
                outline: 'none',
                color: theme === 'dark' ? '#f6c90e' : '#1976d2',
                filter: theme === 'dark' ? 'drop-shadow(0 0 6px #f6c90e88)' : 'none',
              }}
            >
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>
            {/* Clear Chat button with trash icon */}
            <button
              aria-label="Clear chat"
              title="Clear chat"
              onClick={clearChat}
              className="clear-chat-btn"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.4em',
                color: theme === 'dark' ? '#f6c90e' : '#1976d2',
                transition: 'color 0.2s, transform 0.2s',
                marginLeft: 4,
                outline: 'none',
              }}
            >
              🗑️
            </button>
          </div>
        </div>
        {/* Subtle divider/accent under the header for structure */}
        <div style={{
          height: 2,
          width: '100%',
          background: theme === 'light' ? 'linear-gradient(90deg, #b6e2d3 0%, #1976d2 100%)' : 'linear-gradient(90deg, #393e46 0%, #f6c90e 100%)',
          borderRadius: 2,
          margin: '0 0 8px 0',
          opacity: 0.5,
        }} />
        <div style={{marginBottom:0}}>
          <select 
            value={lang} 
            onChange={e => setLang(e.target.value)}
            style={{padding:"4px 8px", borderRadius:12, border:'1px solid #bbb', background:'#f0f4fa', fontFamily:'Quicksand'}}
            disabled
          >
            <option value="en">English</option>
          </select>
        </div>
        <section
          ref={chatSectionRef}
          onScroll={handleChatScroll}
          style={{
            flex:1,
            borderRadius: '20px',
            background: palette.bubbleBot,
            boxShadow: '0 2px 8px 0 rgba(31,38,135,0.05)',
            overflowY: 'auto',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            maxHeight: 400,
            minHeight: 200,
            position: 'relative',
          }}
        >
          {chat.map((m,i) => (
            <div
              key={i}
              className="chat-bubble"
              style={{
                alignSelf: m.from === 'bot' ? 'flex-start' : 'flex-end',
                maxWidth: '90%', // More width for mobile
                background: m.from === 'bot' ? palette.bubbleBot : palette.bubbleUser,
                color: theme === 'dark' ? (m.from === 'bot' ? '#f4f4f4' : '#232946') : palette.text, // Better contrast in dark mode
                borderRadius: m.from === 'bot' ? '20px 20px 20px 8px' : '20px 20px 8px 20px',
                padding: '0.95em 1.2em', // More padding
                marginBottom: '12px', // Increased spacing between messages
                boxShadow: '0 4px 16px 0 rgba(31,38,135,0.10)', // Softer, larger shadow
                opacity: 1,
                animation: 'popIn 0.4s', // Pop animation
                transition: 'background 0.2s, transform 0.15s',
                fontSize: '1.08em',
                wordBreak: 'break-word',
                display: 'flex',
                alignItems: 'flex-start', // Changed from center to flex-start
                gap: m.from === 'bot' ? '0.7em' : 0,
                fontFamily: 'Quicksand, sans-serif',
                position: 'relative',
                flexDirection: 'row', // Changed from column to row
              }}
            >
              {/* Show a friendly bot avatar for bot messages, nothing else */}
              {m.from === 'bot' && (
                // Use a universally friendly emoji for the bot avatar
                <span style={{fontSize:'1.3em', animation:'botBounce 0.7s', marginTop: '0.2em'}}>😊</span>
              )}
              <div style={{display: 'flex', flexDirection: 'column', flex: 1}}>
                {/* Show 'You' as a label above user messages, never inline */}
                {m.from === 'user' && (
                  <span style={{
                    fontWeight: 600,
                    fontSize: '0.92em',
                    color: palette.label,
                    marginBottom: 2,
                    alignSelf: 'flex-end',
                    letterSpacing: 0.5,
                  }}>You</span>
                )}
                {/* Render the message text as Markdown for both user and bot */}
                <div className="chat-message">
                  <ReactMarkdown>{m.text}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {/* Show a typing indicator when the bot is responding */}
          {isBotTyping && (
            <div className="chat-bubble" style={{
              alignSelf: 'flex-start',
              maxWidth: '60%',
              background: palette.bubbleBot,
              color: theme === 'dark' ? '#f4f4f4' : palette.header, // Better contrast in dark mode
              borderRadius: '20px 20px 20px 8px',
              padding: '0.85em 1.1em',
              marginBottom: '2px',
              boxShadow: '0 2px 8px 0 rgba(31,38,135,0.10)',
              fontSize: '1.08em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.7em',
              fontFamily: 'Quicksand, sans-serif',
              opacity: 0.8,
            }}>
              {/* Use the same friendly bot avatar for typing indicator */}
              <span style={{fontSize:'1.3em', animation:'botBounce 0.7s'}}>😊</span>
              {/* Animated typing indicator: bouncing dots */}
              <span className="typing-dots" style={{display:'inline-block', minWidth:32}}>
                <span className="dot" style={{animationDelay:'0s'}}>.</span>
                <span className="dot" style={{animationDelay:'0.15s'}}>.</span>
                <span className="dot" style={{animationDelay:'0.3s'}}>.</span>
              </span>
            </div>
          )}
          <div ref={chatEndRef} />
        </section>
        {/* Scroll to Bottom Button */}
        {!showScrollButton && chat.length > 3 && (
          <button
            onClick={scrollToBottom}
            style={{
              position: 'absolute',
              bottom: 90,
              right: 32,
              zIndex: 10,
              background: 'rgba(25, 118, 210, 0.9)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              cursor: 'pointer',
              transition: 'transform 0.2s, background 0.2s',
              outline: 'none',
            }}
            aria-label="Scroll to latest message"
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span style={{fontSize:'1.2em'}}>⬇️</span>
          </button>
        )}
        {/* Quick suggestion buttons for common questions */}
        <div style={{display:'flex', flexWrap:'wrap', gap:8, margin:'8px 0 0 0'}}>
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              style={{
                background: palette.suggestionBg,
                color: palette.suggestionText,
                border:'none',
                borderRadius:12,
                padding:'8px 14px',
                fontFamily:'Quicksand, sans-serif',
                fontSize:'0.98em',
                cursor:'pointer',
                marginBottom:4,
                boxShadow:'0 1px 4px 0 rgba(31,38,135,0.07)',
                transition:'background 0.2s',
              }}
              onClick={() => setInput(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:"8px",flexWrap:'wrap'}}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Describe how you feel…"
            className="animated-placeholder chat-input"
            style={{
              width:"80%",
              padding:"14px",
              borderRadius:14,
              border:'1.5px solid #b6e2d3',
              fontSize:'1.08em',
              outline:'none',
              background: palette.inputBg,
              flex:1,
              minWidth:120,
              fontFamily:'Quicksand, sans-serif',
              color: palette.text,
              transition: 'background 0.4s, color 0.4s',
            }}
          />
          <button 
            onMouseDown={startListening}
            onMouseUp={stopListening}
            onMouseLeave={stopListening}
            className="mic-btn"
            style={{
              padding:"14px 16px",
              background: listening ? "#ff4444" : "#4CAF50",
              color:"white",
              border:"none",
              borderRadius:"12px",
              cursor:"pointer",
              fontSize:'1.2em',
              transition:'background 0.2s',
              minWidth:48,
              fontFamily:'Quicksand, sans-serif',
            }}
          >
            🎤
          </button>
          <button 
            onClick={send} 
            className={`send-btn${sendAnim ? ' send-anim' : ''}`}
            style={{
              padding:"14px 16px",
              background:"#1976d2",
              color:"white",
              border:"none",
              borderRadius:"12px",
              cursor:"pointer",
              fontSize:'1.2em',
              transition:'background 0.2s, transform 0.15s',
              minWidth:64,
              display:'flex',
              alignItems:'center',
              gap:'0.5em',
              fontFamily:'Quicksand, sans-serif',
            }}
          >
            <span style={{fontSize:'1.1em'}}>✉️</span> Send
          </button>
        </div>
      </div>
      <style>{`
        body {
          background: repeating-linear-gradient(135deg, #e0eafc 0px, #e0eafc 8px, #b6e2d3 8px, #b6e2d3 16px);
        }
        .card-accent {
          transition: all 0.3s ease;
        }
        .card-accent:hover {
          box-shadow: 0 16px 48px 0 rgba(31,38,135,0.22);
          transform: translateY(-2px);
        }
        .fade-in-card {
          animation: fadeInCard 0.7s;
        }
        @keyframes fadeInCard {
          from { opacity: 0; transform: scale(0.97) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .clear-chat-btn:hover {
          color: #ff4444 !important;
          transform: scale(1.15);
        }
        .send-btn.send-anim {
          transform: scale(1.12);
          background: #2196f3;
        }
        .send-btn:hover {
          background: #1565c0;
        }
        .mic-btn:hover {
          background: #388e3c;
        }
        .chat-bubble:hover {
          transform: scale(1.03);
          background: ${theme === 'light' ? '#e0eafc' : '#393e46'} !important;
          color: ${theme === 'light' ? '#222' : '#f6c90e'} !important;
        }
        .chat-bubble {
          transition: background 0.2s, transform 0.15s, color 0.2s;
          box-shadow: 0 4px 16px 0 rgba(31,38,135,0.10);
        }
        .animated-placeholder::placeholder {
          color: #b6b6b6;
          opacity: 1;
          transition: color 0.5s;
          animation: placeholderPulse 2s infinite alternate;
        }
        @keyframes placeholderPulse {
          from { color: #b6b6b6; }
          to { color: #1976d2; }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.95) translateY(10px); }
          80% { opacity: 1; transform: scale(1.03) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes botBounce {
          0% { transform: translateY(0); }
          30% { transform: translateY(-8px); }
          60% { transform: translateY(2px); }
          100% { transform: translateY(0); }
        }
        .chat-input:focus {
          box-shadow: 0 0 0 2px #1976d2aa;
          border-color: #1976d2;
          background: #e3f2fd;
          transition: box-shadow 0.2s, border-color 0.2s, background 0.2s;
        }
        @media (max-width: 600px) {
          main {
            padding: 0.5rem !important;
          }
          .card-accent {
            padding: 1rem !important;
            min-height: 350px !important;
          }
          h1 {
            font-size: 1.3em !important;
          }
          section[style*='flex:1'] {
            padding: 0.5rem !important;
          }
          .chat-bubble {
            max-width: 98% !important;
            padding: 0.8em 0.7em !important;
            font-size: 1em !important;
          }
          .chat-input {
            font-size: 0.95em !important;
            padding: 8px !important;
          }
          .send-btn, .mic-btn {
            font-size: 1em !important;
            padding: 8px 10px !important;
          }
        }
        .typing-dots {
          letter-spacing: 2px;
        }
        .dot {
          display: inline-block;
          font-size: 1.5em;
          line-height: 1;
          opacity: 0.7;
          animation: bounceDot 1s infinite;
        }
        .dot:nth-child(2) { animation-delay: 0.15s; }
        .dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes bounceDot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.7; }
          40% { transform: translateY(-7px); opacity: 1; }
        }
      `}</style>
    </main>
  );
}

export default App;