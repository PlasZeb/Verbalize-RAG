import React, { useState, useEffect, useRef } from 'react';
import { ConnectionState, FileData, Language, TranscriptMessage } from './types';
import { liveClient } from './services/liveClient';
import { Visualizer } from './components/Visualizer';
import { FileUploader } from './components/FileUploader';

const App: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [currentFile, setCurrentFile] = useState<FileData | null>(null);
  const [volume, setVolume] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);
  
  const disconnectRef = useRef<(() => void) | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Volume listener
    liveClient.onVolumeChange = (vol) => {
      setVolume(vol);
    };

    return () => {
      if (disconnectRef.current) {
        disconnectRef.current();
      }
    };
  }, []);

  // Auto-scroll chat
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
      
      // Find the last message from this sender to potentially update
      // We search backwards because the message to update might not be the absolute last one
      // (e.g., if Model started streaming before User turn was finalized)
      let targetIndex = -1;
      for (let i = newHistory.length - 1; i >= 0; i--) {
        if (newHistory[i].sender === sender) {
          targetIndex = i;
          break;
        }
      }

      // If we found a message from this sender, and it's NOT final yet, update it.
      if (targetIndex !== -1 && !newHistory[targetIndex].isFinal) {
        newHistory[targetIndex] = {
          ...newHistory[targetIndex],
          text,
          isFinal,
          timestamp: new Date()
        };
        return newHistory;
      } else {
        // Otherwise, if no previous message or the last one was final, create a new one
        return [...newHistory, {
          id: Date.now().toString(),
          sender,
          text,
          isFinal,
          timestamp: new Date()
        }];
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
        setErrorMsg("Please upload a file to start the context session.");
        return;
      }

      setConnectionState(ConnectionState.CONNECTING);
      setErrorMsg(null);
      setTranscripts([]); // Clear old transcript on new session

      const disconnect = await liveClient.connect(
        currentFile.content,
        language,
        () => setConnectionState(ConnectionState.CONNECTED),
        () => setConnectionState(ConnectionState.DISCONNECTED),
        (err) => {
          console.error(err);
          setErrorMsg(err.message);
          setConnectionState(ConnectionState.ERROR);
        },
        handleTranscript
      );

      disconnectRef.current = disconnect;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-teal-500 selection:text-white">
      
      {/* Header */}
      <header className="absolute top-0 left-0 w-full p-6 flex flex-wrap justify-between items-center z-10 gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-400 to-blue-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Verbalize <span className="text-teal-400">RAG</span></span>
        </div>
        
        <div className="flex items-center gap-4">
           {/* Language Selector */}
           <div className="relative">
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              disabled={connectionState !== ConnectionState.DISCONNECTED}
              className="appearance-none bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5 pr-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="en">English</option>
              <option value="hu">Magyar</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>

          <div className="hidden sm:flex gap-4 text-sm font-medium text-slate-400">
            <span>Gemini 2.5 Flash</span>
            <span>|</span>
            <span>Live API</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-4xl flex flex-col md:flex-row items-stretch gap-8 z-0 relative mt-20 mb-10 h-[calc(100vh-140px)]">
        
        {/* Left Column: Visuals & Controls */}
        <div className="flex-1 flex flex-col gap-6 h-full overflow-y-auto pr-2">
          
           {/* Connection Status */}
           <div className="flex justify-center">
            <div className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase border transition-all ${
              connectionState === ConnectionState.CONNECTED 
                ? 'bg-teal-500/10 text-teal-400 border-teal-500/20 shadow-[0_0_15px_rgba(45,212,191,0.2)]'
                : connectionState === ConnectionState.CONNECTING
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : connectionState === ConnectionState.ERROR
                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}>
              {connectionState === ConnectionState.ERROR ? 'Connection Error' : connectionState}
            </div>
          </div>

          {/* Visualizer */}
          <div className="relative w-full h-[300px] shrink-0 flex items-center justify-center">
            <Visualizer 
              volume={volume} 
              isActive={connectionState === ConnectionState.CONNECTED} 
            />
            {!currentFile && connectionState === ConnectionState.DISCONNECTED && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-slate-500 text-lg animate-pulse">Waiting for document...</p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-4">
             {/* File Upload */}
            <FileUploader 
              onFileLoaded={handleFileLoaded} 
              disabled={connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING} 
            />

            {/* Context Info & Connect */}
            <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
              <div className="mb-4">
                <p className="text-sm text-slate-300 font-medium mb-2">Active Context</p>
                {currentFile ? (
                  <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded border border-slate-700">
                    <div className="w-8 h-8 rounded bg-teal-500/20 flex items-center justify-center text-teal-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm text-slate-200 truncate font-medium">{currentFile.name}</p>
                      <p className="text-xs text-slate-500">{Math.round(currentFile.size / 1024)} KB</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No file loaded yet.</p>
                )}
              </div>

              {errorMsg && (
                <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-2 rounded-md text-sm">
                  {errorMsg}
                </div>
              )}

              <button
                onClick={toggleConnection}
                disabled={!currentFile && connectionState === ConnectionState.DISCONNECTED}
                className={`w-full py-3 rounded-md font-semibold text-white transition-all shadow-lg ${
                  connectionState === ConnectionState.CONNECTED
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                    : !currentFile 
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 shadow-teal-500/20 hover:scale-[1.02]'
                }`}
              >
                {connectionState === ConnectionState.CONNECTED ? 'End Session' : 'Start Conversation'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Transcription Log */}
        <div className="md:w-96 flex flex-col bg-slate-900 rounded-lg border border-slate-800 h-full overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Live Transcript
            </h2>
          </div>
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
            {transcripts.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-600 text-sm gap-2 opacity-60">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                 </svg>
                 <p>Conversation history will appear here</p>
               </div>
            ) : (
              transcripts.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                    msg.sender === 'user' 
                      ? 'bg-teal-600 text-white rounded-br-none' 
                      : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                  } ${!msg.isFinal ? 'opacity-70 animate-pulse' : ''}`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="absolute bottom-4 text-center w-full pointer-events-none">
        <p className="text-xs text-slate-600">
          Powered by Gemini Multimodal Live API
        </p>
      </footer>
    </div>
  );
};

export default App;