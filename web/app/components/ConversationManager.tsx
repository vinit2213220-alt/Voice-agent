'use client';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent, DataPacket_Kind } from 'livekit-client';
import { useEffect, useState, useRef } from 'react';

export default function ConversationManager() {
    const room = useRoomContext();
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [lastResponse, setLastResponse] = useState('');
    const recognitionRef = useRef<any>(null);

    // Initialize Speech Recognition
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // @ts-ignore
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error('Browser does not support Speech Recognition');
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
                if (room && room.localParticipant) {
                    const encoder = new TextEncoder();
                    const data = encoder.encode(text);
                    await room.localParticipant.publishData(data, { reliable: true });
                }
            }
        };

        recognition.onerror = (event: any) => {
            console.error('Speech Recognition Error:', event.error);
        };

        recognitionRef.current = recognition;
    }, [room]);

    // Handle Incoming Data (TTS)
    useEffect(() => {
        if (!room) return;

        const handleData = (payload: Uint8Array, participant: any) => {
            const decoder = new TextDecoder();
            const text = decoder.decode(payload);
            console.log('Agent says:', text);
            setLastResponse(text);

            // Speak
            const utterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(utterance);
        };

        room.on(RoomEvent.DataReceived, handleData);
        return () => { room.off(RoomEvent.DataReceived, handleData); };
    }, [room]);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    return (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 p-4 bg-neutral-900/90 text-white rounded-xl border border-neutral-700 shadow-xl max-w-md w-full z-50">
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-mono text-neutral-400">Conversation</span>
                    <button
                        onClick={toggleListening}
                        className={`px-4 py-2 rounded-full font-bold transition-all ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                    >
                        {isListening ? 'Stop Listening' : 'Start Talking'}
                    </button>
                </div>

                {transcript && (
                    <div className="text-right">
                        <p className="text-xs text-neutral-500">You</p>
                        <p className="text-sm">{transcript}</p>
                    </div>
                )}

                {lastResponse && (
                    <div className="text-left">
                        <p className="text-xs text-blue-400">Agent</p>
                        <p className="text-sm">{lastResponse}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
