import React, { useState, useEffect, useRef } from 'react';
import { ConnectionState, FileData, Language, TranscriptMessage, ModelType, VoiceName } from './types';
import { liveClient } from './services/liveClient';
import { Visualizer } from './components/Visualizer';
import { FileUploader } from './components/FileUploader';

const App: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [currentFile, setCurrentFile] = useState<FileData | null>(null);
  const [volume, setVolume] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('hu');
  const [model, setModel] = useState<ModelType>('gemini-2.5-flash-native-audio-preview-12-2025');
  const [voice, setVoice] = useState<VoiceName>('Zephyr');
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);
  const [showTranscript, setShowTranscript] = useState(true);
  
  const disconnectRef = useRef<(() => void) | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    liveClient.onVolumeChange = (vol) => {
      setVolume(vol);
    };
    return () => {
      if (disconnectRef.current) disconnectRef.current();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  const handleFileLoaded = (file: FileData) => {
    setCurrentFile(file);
    setErrorMsg(null);
  };

  const handleTranscript = (sender: 'user' | 'model', text: string, isFinal: boolean) => {
    setTranscripts(prev => {
      const newHistory = [...prev];
      let targetIndex = -1;
      for (let i = newHistory.length - 1; i >= 0; i--) {
        if (newHistory[i].sender === sender) {
          targetIndex = i;
          break;
        }
      }

      if (targetIndex !== -1 && !newHistory[targetIndex].isFinal) {
        newHistory[targetIndex] = { ...newHistory[targetIndex], text, isFinal, timestamp: new Date() };
        return newHistory;
      } else {
        return [...newHistory, { id: Date.now().toString(), sender, text, isFinal, timestamp: new Date() }];
      }
    });
  };

  const toggleConnection = async () => {
    if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
      if (disconnectRef.current) {
        disconnectRef.current();
        disconnectRef.current = null;
      }
      setConnectionState(ConnectionState.DISCONNECTED);
      setVolume(0);
    } else {
      if (!currentFile) {
        setErrorMsg("Kérlek, tölts fel egy dokumentumot a kezdéshez!");
        return;
      }

      setConnectionState(ConnectionState.CONNECTING);
      setErrorMsg(null);
      setTranscripts([]);
      
      const disconnect = await liveClient.connect(
        currentFile.content,
        language,
        model,
        voice,
        showTranscript,
        () => setConnectionState(ConnectionState.CONNECTED),
        () => setConnectionState(ConnectionState.DISCONNECTED),
        (err) => {
          setErrorMsg(err.message);
          setConnectionState(ConnectionState.ERROR);
        },
        handleTranscript
      );

      disconnectRef.current = disconnect;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col p-4 sm:p-6 pt-safe pb-safe selection:bg-teal-500 selection:text-white select-none overflow-hidden font-sans">
      <header className="w-full py-4 px-2 flex flex-wrap justify-between items-center z-10 gap-4 mb-6 sticky top-0 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/50 rounded-b-2xl shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-400 to-blue-600 flex items-center justify-center shadow-lg shadow-teal-500/20 rotate-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div>
            <span className="text-xl font-black tracking-tighter text-white block leading-none underline decoration-teal-500/30">Verbalize <span className="text-teal-400 italic">NATIVE</span></span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Contextual Audio Intelligence</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4 no-scrollbar overflow-x-auto pb-1">
          <button 
            onClick={() => setShowTranscript(!showTranscript)}
            className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[10px] font-bold uppercase tracking-wider ${
              showTranscript ? 'bg-teal-500/10 border-teal-500/30 text-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.1)]' : 'bg-slate-900 border-slate-700 text-slate-500'
            }`}
          >
            {showTranscript ? 'Transcript ON' : 'Transcript OFF'}
          </button>

          <div className="relative flex-shrink-0">
            <select 
              value={voice}
              onChange={(e) => setVoice(e.target.value as VoiceName)}
              disabled={connectionState !== ConnectionState.DISCONNECTED}
              className="appearance-none bg-slate-900 border border-slate-700 text-teal-400 text-[11px] font-black rounded-lg focus:ring-teal-500 block w-full pl-3 pr-8 py-2 disabled:opacity-50 cursor-pointer hover:border-teal-500/50 transition-colors"
            >
              <option value="Zephyr">🗣️ Zephyr</option>
              <option value="Puck">🗣️ Puck</option>
              <option value="Charon">🗣️ Charon</option>
              <option value="Kore">🗣️ Kore</option>
              <option value="Fenrir">🗣️ Fenrir</option>
            </select>
          </div>

          <div className="relative flex-shrink-0">
            <select 
              value={model}
              onChange={(e) => setModel(e.target.value as ModelType)}
              disabled={connectionState !== ConnectionState.DISCONNECTED}
              className="appearance-none bg-slate-900 border border-slate-700 text-teal-400 text-[11px] font-black rounded-lg focus:ring-teal-500 block w-full pl-3 pr-8 py-2 disabled:opacity-50 cursor-pointer hover:border-teal-500/50 transition-colors"
            >
              <option value="gemini-2.5-flash-native-audio-preview-12-2025">🎙️ NATIVE</option>
              <option value="gemini-3-pro-preview">🧠 PRO</option>
            </select>
          </div>

          <div className="relative flex-shrink-0">
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              disabled={connectionState !== ConnectionState.DISCONNECTED}
              className="appearance-none bg-slate-900 border border-slate-700 text-slate-300 text-[11px] font-bold rounded-lg focus:ring-teal-500 block w-full pl-3 pr-8 py-2 disabled:opacity-50"
            >
              <option value="hu">HU</option>
              <option value="en">EN</option>
            </select>
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-stretch gap-6 flex-1 min-h-0">
        <div className={`flex-1 flex flex-col gap-6 transition-all duration-500 ${showTranscript ? 'lg:max-w-[55%]' : 'max-w-4xl mx-auto w-full'}`}>
           <div className="flex justify-center">
            <div className={`px-4 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase border transition-all shadow-sm ${
              connectionState === ConnectionState.CONNECTED ? 'bg-teal-500/20 text-teal-400 border-teal-500/40 animate-pulse' : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}>
              {connectionState === ConnectionState.CONNECTED ? 'CONNECTED' : connectionState}
            </div>
          </div>

          <div className="relative w-full h-[300px] lg:h-[450px] flex items-center justify-center bg-slate-900/40 rounded-[3rem] border border-slate-800/50 backdrop-blur-sm overflow-hidden shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] group">
            <Visualizer volume={volume} isActive={connectionState === ConnectionState.CONNECTED} />
            
            {!currentFile && connectionState === ConnectionState.DISCONNECTED && (
              <div className="absolute inset-0 flex items-center justify-center p-8 text-center bg-slate-950/20">
                <div className="space-y-3">
                  <p className="text-slate-400 text-2xl font-black tracking-tighter">Waiting for document...</p>
                  <p className="text-slate-600 text-[10px] uppercase tracking-[0.4em] font-bold">Native Audio RAG Engine</p>
                </div>
              </div>
            )}
            
            {connectionState === ConnectionState.CONNECTED && (
              <div className="absolute top-8 left-8 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live Stream</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <FileUploader onFileLoaded={handleFileLoaded} disabled={connectionState !== ConnectionState.DISCONNECTED} />
            <div className="bg-slate-900/80 rounded-3xl p-6 border border-slate-800/80 shadow-2xl backdrop-blur-md">
              {currentFile && (
                <div className="mb-6 flex items-center gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 transition-all hover:border-teal-500/40">
                  <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 shadow-inner">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" /></svg>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm text-slate-200 truncate font-black tracking-tight">{currentFile.name}</p>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">
                      {Math.round(currentFile.size / 1024)} KB • Context ready
                    </p>
                  </div>
                </div>
              )}
              {errorMsg && <div className="mb-4 text-red-400 text-[11px] bg-red-400/10 p-3 rounded-xl border border-red-400/20 font-bold uppercase tracking-tight">{errorMsg}</div>}
              <button
                onClick={toggleConnection}
                disabled={!currentFile && connectionState === ConnectionState.DISCONNECTED}
                className={`w-full py-5 rounded-2xl font-black text-white text-lg tracking-tighter transition-all active:scale-[0.97] shadow-2xl border-b-4 ${
                  connectionState === ConnectionState.CONNECTED 
                    ? 'bg-red-600 hover:bg-red-700 border-red-800 shadow-red-500/20' 
                    : 'bg-gradient-to-r from-teal-500 to-blue-600 border-blue-800 hover:shadow-teal-500/30 shadow-teal-500/10'
                } disabled:opacity-20 disabled:grayscale disabled:border-transparent`}
              >
                {connectionState === ConnectionState.CONNECTED ? 'STOP CONVERSATION' : 'START CONVERSATION'}
              </button>
            </div>
          </div>
        </div>

        {showTranscript && (
          <div className="flex-1 flex flex-col bg-slate-900/40 rounded-[2.5rem] border border-slate-800/60 h-[450px] lg:h-auto overflow-hidden shadow-2xl transition-all duration-500 backdrop-blur-sm">
            <div className="p-6 border-b border-slate-800/80 bg-slate-900/60 flex justify-between items-center">
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-teal-500 rounded-full shadow-[0_0_12px_rgba(45,212,191,0.6)] animate-pulse"></span> Analysis Feed
              </h2>
              <button onClick={() => setTranscripts([])} className="text-[10px] text-slate-600 hover:text-slate-400 font-black uppercase tracking-widest transition-colors">Clear</button>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950/30 scroll-smooth custom-scrollbar">
              {transcripts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-700 text-center opacity-30 grayscale">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <p className="text-sm font-black tracking-widest uppercase">No feed yet</p>
                </div>
              ) : (
                transcripts.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-[1.5rem] px-5 py-3.5 text-sm leading-relaxed shadow-lg border ${
                      msg.sender === 'user' 
                        ? 'bg-teal-600 text-white rounded-br-none border-teal-500' 
                        : 'bg-slate-800/90 text-slate-100 rounded-bl-none border-slate-700'
                    } ${!msg.isFinal ? 'animate-pulse opacity-70' : ''}`}>
                      <p className="font-medium tracking-tight">{msg.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="py-8 text-center">
        <div className="flex justify-center items-center gap-6 opacity-20 hover:opacity-40 transition-opacity duration-700">
          <span className="text-[10px] uppercase tracking-[0.5em] text-slate-500 font-black">AI Audio Engine v1.3.0</span>
          <div className="w-1.5 h-1.5 bg-teal-500 rounded-full"></div>
          <span className="text-[10px] uppercase tracking-[0.5em] text-slate-500 font-black">Connected to GitHub context</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
