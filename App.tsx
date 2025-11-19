import React, { useState, useEffect, useRef } from 'react';
import { Scene3D } from './components/Scene3D';
import { useGeminiLive } from './hooks/useGeminiLive';
import { Language, Scenario, Message, MicState } from './types';
import { Play, Mic, MicOff, X, BookOpen, Settings, Send, Keyboard, Loader2, MessageSquare, Minus } from 'lucide-react';

export default function App() {
  const [started, setStarted] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(Language.FRENCH);
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(Scenario.CAFE);
  
  // UI States
  const [isChatOpen, setIsChatOpen] = useState(true);
  
  const [transcripts, setTranscripts] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState("");
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { connect, disconnect, sendText, activateMic, deactivateMic, isConnected, micState, error, volume } = useGeminiLive({
    language: selectedLanguage,
    scenario: selectedScenario,
    onTranscription: (text, role, isFinal) => {
       setTranscripts(prev => {
           const lastMsg = prev[prev.length - 1];
           // If the last message is from the same role and not final, update it
           const newHistory = (lastMsg && !lastMsg.isFinal && lastMsg.role === role) 
                ? prev.slice(0, -1) 
                : prev;
            
           return [...newHistory, {
               id: Date.now().toString(),
               text,
               role,
               timestamp: Date.now(),
               isFinal
           }];
       });
    }
  });

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts, isChatOpen]);

  const handleStart = () => {
    setTranscripts([]);
    setStarted(true);
    connect();
  };

  const handleStop = () => {
    disconnect();
    setStarted(false);
    setIsChatOpen(true);
  };
  
  const handleSendText = (e?: React.FormEvent) => {
      e?.preventDefault();
      if(!textInput.trim()) return;
      sendText(textInput);
      setTextInput("");
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
      // If clicking on the canvas/background wrapper, collapse chat
      if (e.target === e.currentTarget) {
          setIsChatOpen(false);
          inputRef.current?.blur();
      }
  };

  const toggleMic = () => {
      // Manual Toggle Logic
      if (micState === MicState.LISTENING || micState === MicState.SPEAKING || micState === MicState.PROCESSING) {
          // If it's active in any way, stop it
          deactivateMic();
      } else {
          activateMic();
      }
  };

  // -- MENU SCREEN --
  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4 font-sans text-white">
        <div className="max-w-2xl w-full bg-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/10">
          <div className="text-center mb-10">
            <h1 className="text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-teal-200 to-blue-400">
              LinguaVerse 3D
            </h1>
            <p className="text-lg text-gray-300 font-light">
              Experience language learning in a living, breathing world.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-lg font-medium text-teal-200">
                <BookOpen className="w-5 h-5" /> Target Language
              </label>
              <div className="grid grid-cols-2 gap-3">
                {Object.values(Language).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLanguage(lang)}
                    className={`p-3 rounded-xl transition-all duration-200 border ${
                      selectedLanguage === lang
                        ? 'bg-teal-500/20 border-teal-400/50 text-white shadow-[0_0_15px_rgba(20,184,166,0.2)]'
                        : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-2 text-lg font-medium text-blue-200">
                <Settings className="w-5 h-5" /> Scenario
              </label>
              <div className="flex flex-col gap-3">
                {Object.values(Scenario).map((scen) => (
                  <button
                    key={scen}
                    onClick={() => setSelectedScenario(scen)}
                    className={`p-3 rounded-xl transition-all duration-200 text-left border ${
                      selectedScenario === scen
                        ? 'bg-blue-500/20 border-blue-400/50 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                        : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {scen}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleStart}
            className="w-full py-4 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-white text-xl font-bold rounded-2xl shadow-lg transform transition hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
          >
            <Play className="w-6 h-6 fill-current" />
            Enter Simulation
          </button>
        </div>
      </div>
    );
  }

  // -- GAME HUD --
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
      
      {/* 3D Viewport Wrapper - Click to Minimize Chat */}
      <div 
        className="absolute inset-0 z-0 cursor-pointer" 
        onClick={handleBackgroundClick}
      >
        <Scene3D scenario={selectedScenario} isAiSpeaking={micState === MicState.SPEAKING} />
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10 pointer-events-none">
         <div className="bg-black/30 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 text-white shadow-lg pointer-events-auto">
            <h2 className="text-lg font-bold tracking-wide text-shadow">{selectedScenario}</h2>
            <div className="flex items-center gap-2 text-xs text-teal-300 mt-1">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-500'}`}></div>
                {isConnected ? `Active: ${selectedLanguage}` : 'Connecting...'}
            </div>
          </div>
          <button
            onClick={handleStop}
            className="pointer-events-auto bg-red-500/80 hover:bg-red-600 text-white p-2.5 rounded-full transition shadow-lg backdrop-blur-sm border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
      </div>

      {/* LEFT SECTION: TEXT CHAT MODE */}
      {isChatOpen ? (
          <div className="absolute left-4 bottom-4 w-full max-w-[380px] z-20 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden h-[500px] flex flex-col">
                  {/* Chat Header */}
                  <div className="flex items-center justify-between p-4 bg-white/5 border-b border-white/5">
                      <div className="flex items-center gap-2 text-gray-200 text-sm font-medium pl-1">
                          <MessageSquare className="w-4 h-4" />
                          <span>Live Transcript</span>
                      </div>
                      <button 
                          onClick={() => setIsChatOpen(false)}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                      >
                          <Minus className="w-4 h-4" />
                      </button>
                  </div>

                  {/* Chat History */}
                  <div 
                    className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/20"
                    ref={scrollRef}
                  >
                      {transcripts.length === 0 && (
                          <div className="text-gray-400 text-sm text-center mt-10 italic opacity-60">
                              Say hello or type a message to begin...
                          </div>
                      )}
                      {transcripts.map((msg) => (
                          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm backdrop-blur-sm shadow-sm ${
                                  msg.role === 'user' 
                                  ? 'bg-blue-600/70 text-white rounded-br-sm border border-blue-500/30' 
                                  : 'bg-zinc-800/70 text-gray-100 rounded-bl-sm border border-white/10'
                              } ${!msg.isFinal ? 'opacity-70' : ''}`}>
                                  {msg.text}
                              </div>
                          </div>
                      ))}
                  </div>
                  
                  {/* Input Bar */}
                  <div className="p-3 bg-black/20 border-t border-white/5">
                      <form onSubmit={handleSendText} className="flex gap-2">
                          <input 
                             ref={inputRef}
                             type="text"
                             value={textInput}
                             onChange={(e) => setTextInput(e.target.value)}
                             placeholder="Type a message..."
                             className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:bg-white/10 focus:border-teal-500/50 transition-colors placeholder-gray-500"
                          />
                          <button 
                             type="submit"
                             disabled={!textInput.trim() || !isConnected}
                             className="bg-teal-600/80 hover:bg-teal-500 disabled:opacity-50 text-white p-3 rounded-xl transition-colors backdrop-blur-sm"
                          >
                             <Send className="w-4 h-4" />
                          </button>
                      </form>
                  </div>
              </div>
          </div>
      ) : (
          // Minimized Chat Button
          <button 
            onClick={() => setIsChatOpen(true)}
            className="absolute left-4 bottom-4 z-20 p-4 bg-black/40 backdrop-blur-lg rounded-full border border-white/10 text-white hover:bg-blue-600/60 transition-all shadow-lg group"
          >
            <MessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </button>
      )}

      {/* RIGHT SECTION: VOICE INTERACTION MODE */}
      <div className="absolute right-8 bottom-8 z-20 flex flex-col items-center gap-4">
           {/* Voice Status Text */}
           <div className={`px-5 py-2 rounded-full text-sm font-bold backdrop-blur-md border transition-all duration-300 shadow-lg ${
               micState === MicState.LISTENING ? 'bg-red-500/20 border-red-500/50 text-red-200 animate-pulse' :
               micState === MicState.PROCESSING ? 'bg-blue-500/20 border-blue-500/50 text-blue-200' :
               micState === MicState.SPEAKING ? 'bg-teal-500/20 border-teal-500/50 text-teal-200' :
               'bg-black/40 border-white/10 text-gray-300'
           }`}>
               {micState === MicState.LISTENING ? 'Listening...' :
                micState === MicState.PROCESSING ? 'Processing...' :
                micState === MicState.SPEAKING ? 'AI Speaking' :
                'Tap Mic to Speak'}
           </div>

           {/* Big Mic Button */}
           <button
              onClick={toggleMic}
              disabled={!isConnected}
              className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 group border border-white/10 backdrop-blur-sm ${
                  micState === MicState.LISTENING 
                  ? 'bg-red-500 scale-110 shadow-[0_0_50px_rgba(239,68,68,0.4)]' 
                  : micState === MicState.SPEAKING
                  ? 'bg-teal-500 hover:bg-teal-400 hover:scale-105 shadow-[0_0_30px_rgba(20,184,166,0.3)]'
                  : 'bg-white/90 hover:bg-white hover:scale-105'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
           >
              {/* Pulsing Ring for Listening */}
              {micState === MicState.LISTENING && (
                  <>
                    <div className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-30"></div>
                    <div className="absolute inset-0 rounded-full border border-red-400 animate-[ping_1.5s_ease-in-out_infinite] opacity-20 animation-delay-500"></div>
                  </>
              )}
              
              {/* Icon */}
              {micState === MicState.PROCESSING ? (
                  <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              ) : micState === MicState.LISTENING ? (
                  <div className="flex items-center justify-center gap-1.5 h-10">
                       {/* Waveform animation */}
                       <div className="w-1.5 bg-white rounded-full animate-[bounce_1s_infinite] h-4" style={{ animationDelay: '0ms' }}></div>
                       <div className="w-1.5 bg-white rounded-full animate-[bounce_1s_infinite] h-8" style={{ animationDelay: '100ms' }}></div>
                       <div className="w-1.5 bg-white rounded-full animate-[bounce_1s_infinite] h-4" style={{ animationDelay: '200ms' }}></div>
                  </div>
              ) : (
                  <Mic className={`w-10 h-10 ${micState === MicState.SPEAKING ? 'text-white' : 'text-slate-800 group-hover:text-black'}`} />
              )}
           </button>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600/90 backdrop-blur-md text-white px-8 py-6 rounded-2xl shadow-2xl z-50 border border-red-400/30 text-center">
            <p className="text-lg font-semibold mb-4">{error}</p>
            <button onClick={handleStop} className="bg-white/20 hover:bg-white/30 px-6 py-2 rounded-lg text-sm transition-colors">Return to Menu</button>
        </div>
      )}
    </div>
  );
}
