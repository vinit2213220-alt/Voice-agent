'use client';

import { Room, RoomEvent, DataPacket_Kind } from 'livekit-client';
import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [token, setToken] = useState('');
  const [connected, setConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [agentResponse, setAgentResponse] = useState('');
  const [status, setStatus] = useState('Loading...');

  const roomRef = useRef<Room | null>(null);
  const recognitionRef = useRef<any>(null);

  // Fetch token and connect to room
  useEffect(() => {
    const setupRoom = async () => {
      try {
        setStatus('Fetching token...');
        const response = await fetch('http://localhost:3001/api/token?room=restaurant-booking&username=user-' + Math.floor(Math.random() * 1000));
        const data = await response.json();
        setToken(data.token);

        setStatus('Connecting to room...');
        const liveKitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://voice-agent-e90i4yl7.livekit.cloud';

        const room = new Room();

        // Handle incoming data from agent
        room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
          const decoder = new TextDecoder();
          const text = decoder.decode(payload);
          console.log('Agent says:', text);
          setAgentResponse(text);

          // Speak the response
          const utterance = new SpeechSynthesisUtterance(text);

          // Detect Hindi (Devanagari script range: \u0900-\u097F)
          const isHindi = /[\u0900-\u097F]/.test(text);

          if (isHindi) {
            utterance.lang = 'hi-IN';
            // Try to find a Hindi voice
            const voices = window.speechSynthesis.getVoices();
            const hindiVoice = voices.find(v => v.lang.includes('hi'));
            if (hindiVoice) utterance.voice = hindiVoice;
          } else {
            utterance.lang = 'en-US';
          }

          window.speechSynthesis.speak(utterance);
        });

        await room.connect(liveKitUrl, data.token);
        roomRef.current = room;
        setConnected(true);
        setStatus('Connected! Click "Start Talking" to begin.');

      } catch (e) {
        console.error('Setup error:', e);
        setStatus('Error connecting. Check console for details.');
      }
    };

    setupRoom();

    return () => {
      roomRef.current?.disconnect();
    };
  }, []);

  // Setup Speech Recognition
  const isListeningRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus('Browser does not support Speech Recognition');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = async (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal) {
        const text = lastResult[0].transcript;
        console.log('User said:', text);
        setTranscript(text);

        // Send to Agent
        if (roomRef.current && roomRef.current.localParticipant) {
          const encoder = new TextEncoder();
          const data = encoder.encode(text);
          await roomRef.current.localParticipant.publishData(data, { reliable: true });
        }
      }
    };

    recognition.onend = () => {
      // Auto-restart if we're supposed to be listening
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.log('Recognition restart failed:', e);
          setIsListening(false);
          isListeningRef.current = false;
          setStatus('Stopped listening (auto-restart failed)');
        }
      } else {
        setStatus('Stopped listening');
      }
    };

    recognitionRef.current = recognition;
  }, []);

  const toggleListening = () => {
    if (!connected) {
      alert('Not connected to room yet!');
      return;
    }

    if (isListening) {
      setIsListening(false);
      isListeningRef.current = false;
      recognitionRef.current?.stop();
      setStatus('Stopped listening');
    } else {
      setIsListening(true);
      isListeningRef.current = true;
      try {
        recognitionRef.current?.start();
        setStatus('Listening...');
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Text Input Fallback
  const [inputText, setInputText] = useState('');
  const handleSendText = async () => {
    if (!inputText.trim() || !roomRef.current) return;

    console.log('Sending text:', inputText);
    setTranscript(inputText);

    const encoder = new TextEncoder();
    const data = encoder.encode(inputText);
    await roomRef.current.localParticipant.publishData(data, { reliable: true });

    setInputText('');
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-neutral-900 to-black text-white">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Vaiu Voice Agent</h1>
          <p className="text-neutral-400">{status}</p>
        </div>

        {/* Main Control */}
        <div className="flex justify-center">
          <button
            onClick={toggleListening}
            disabled={!connected}
            className={`px-8 py-4 rounded-full text-xl font-bold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${isListening
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-green-500 hover:bg-green-600'
              }`}
          >
            {isListening ? '🛑 Stop Talking' : '🎤 Start Talking'}
          </button>
        </div>

        {/* Text Input Fallback */}
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
            placeholder="Or type your response here..."
            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-full px-6 py-3 text-white focus:outline-none focus:border-blue-500"
            suppressHydrationWarning
          />
          <button
            onClick={handleSendText}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-full font-bold"
            suppressHydrationWarning
          >
            Send
          </button>
        </div>

        {/* Conversation Display */}
        <div className="space-y-4">
          {transcript && (
            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
              <p className="text-xs text-blue-400 mb-1">You said:</p>
              <p className="text-lg">{transcript}</p>
            </div>
          )}

          {agentResponse && (
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
              <p className="text-xs text-green-400 mb-1">Agent replied:</p>
              <p className="text-lg">{agentResponse}</p>
            </div>
          )}
        </div>

        {/* Dashboard Link */}
        <div className="text-center">
          <a
            href="/dashboard"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            View Admin Dashboard
          </a>
        </div>

        {/* Instructions */}
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 text-sm text-neutral-300">
          <p className="font-bold mb-2">How to use:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Wait for "Connected!" message</li>
            <li>Click "Start Talking" and allow microphone access</li>
            <li>Say: "I want to book a table for 2 people tomorrow at 7 PM in New York"</li>
            <li>The agent will respond with weather info and booking details</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
