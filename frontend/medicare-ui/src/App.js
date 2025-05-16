import { useState } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";


function App() {
  const [input, setInput] = useState("");
  const [chat,  setChat]  = useState([]);

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

  async function send() {
    if (!input.trim()) return;

    const userMsg = { from: "user", text: input };
    setChat(c => [...c, userMsg]);
    setInput("");

    // call Spring backend
    const res  = await fetch("http://localhost:8080/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: input })
    });
    const data = await res.json();

    const botMsg = data.followup
      ? { from: "bot", text: data.followup }
      : { from: "bot",
          text: `Condition: ${data.condition}\nMedication: ${data.medication}\nAdvice: ${data.advice}` };

    setChat(c => [...c, botMsg]);
  }

  return (
    <main style={{maxWidth:600,margin:"2rem auto",fontFamily:"sans-serif"}}>
      <h1>Medicare AI</h1>

      <section style={{border:"1px solid #ccc",height:260,overflowY:"auto",padding:"1rem"}}>
        {chat.map((m,i) => (
          <p key={i} style={{whiteSpace:"pre-wrap"}}>
            <strong>{m.from === "bot" ? "MediMate: " : "You: "}</strong>
            {m.text}
          </p>
        ))}
      </section>

      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === "Enter" && send()}
        placeholder="Describe how you feel…"
        style={{width:"80%",padding:"8px"}}
      />
      <button onClick={send} style={{marginLeft:8,padding:"8px 16px"}}>
        Send
      </button>
      {/* Hold-to-Talk Button*/}
      <button 
        onMouseDown={startListening}
        onMouseUp={stopListening}
        style={{marginLeft:8, padding:"8px 16px "}}
        >
          {listening ? "Listening..." : "Hold to talk"}

        </button>
    </main>
  );
}

export default App;