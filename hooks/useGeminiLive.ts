import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, LiveSession } from '@google/genai';
import { createBlob, decode, decodeAudioData } from '../utils/audio';
import { Language, Scenario, MicState } from '../types';

interface UseGeminiLiveProps {
  language: Language;
  scenario: Scenario;
  onTranscription: (text: string, role: 'user' | 'ai', isFinal: boolean) => void;
}

export const useGeminiLive = ({ language, scenario, onTranscription }: UseGeminiLiveProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [micState, setMicState] = useState<MicState>(MicState.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);

  // Refs
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Audio Processing Refs
  const isMicOnRef = useRef<boolean>(false);

  // Accumulators for transcriptions
  const currentAiTextRef = useRef<string>("");
  const currentUserTextRef = useRef<string>("");

  const stopAudioPlayback = useCallback(() => {
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  const disconnect = useCallback(async () => {
    try {
      if (sessionPromiseRef.current) {
        const session = await sessionPromiseRef.current;
        session.close();
      }
    } catch (e) {
      console.error("Error closing session", e);
    }

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current.onaudioprocess = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (inputAudioContextRef.current) inputAudioContextRef.current.close();
    if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    
    stopAudioPlayback();
    sessionPromiseRef.current = null;
    setIsConnected(false);
    setMicState(MicState.IDLE);
    setVolume(0);
    setError(null);
  }, [stopAudioPlayback]);

  const activateMic = useCallback(() => {
    if (!isConnected) return;
    isMicOnRef.current = true;
    setMicState(MicState.LISTENING);
    stopAudioPlayback(); // Stop AI if interrupting (Barge-in)
  }, [isConnected, stopAudioPlayback]);

  const deactivateMic = useCallback(() => {
    isMicOnRef.current = false;
    setMicState(MicState.IDLE);
    setVolume(0);
  }, []);

  const sendText = useCallback(async (text: string) => {
    if (!sessionPromiseRef.current) return;
    
    // Stop any current AI speech to handle the interruption
    stopAudioPlayback();
    // Temporarily disable mic logic to prevent echo during text turn
    // But keep isMicOnRef true if user wants to toggle it manually
    
    // Optimistically update UI
    onTranscription(text, 'user', true);

    const session = await sessionPromiseRef.current;
    
    try {
        await session.send({
            clientContent: {
                turns: [{
                    role: 'user',
                    parts: [{ text }]
                }],
                turnComplete: true
            }
        });
    } catch(e) {
        console.error("Failed to send text", e);
    }

  }, [onTranscription, stopAudioPlayback]);

  const connect = useCallback(async () => {
    if (isConnected) return;

    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API_KEY not found");

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      // Request mic access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey });

      const systemPrompt = `
        You are a roleplay partner in a 3D language learning game. 
        Current Scenario: ${scenario}.
        Target Language: ${language}.
        
        Your Role: Act as a character fitting the scenario (e.g., a Barista in a Cafe, a Ticket Agent at a station).
        Goal: Help the user practice speaking ${language}. 
        
        Instructions:
        1. Speak ONLY in ${language} unless the user is completely stuck, then offer a hint in English.
        2. Keep responses short (1-3 sentences) to keep the conversation flowing naturally.
        3. Be encouraging.
        4. Start by greeting the user in ${language} and asking what they need.
      `;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log('Session opened');
            setIsConnected(true);
            setMicState(MicState.IDLE);
            
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
               // Only process audio if Mic is explicitly ON
               if (!isMicOnRef.current) {
                   return;
               }

               const inputData = e.inputBuffer.getChannelData(0);
               
               // Calculate RMS for volume visualization
               let sum = 0;
               for(let i=0; i<inputData.length; i++) {
                   sum += inputData[i] * inputData[i];
               }
               const rms = Math.sqrt(sum / inputData.length);
               setVolume(rms);

               // Stream audio
               if (sessionPromiseRef.current) {
                    const pcmBlob = createBlob(inputData);
                    sessionPromiseRef.current.then(session => {
                        session.sendRealtimeInput({ media: pcmBlob });
                    });
               }
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
            scriptProcessorRef.current = processor;
          },
          onmessage: async (message: LiveServerMessage) => {
            // Detect Start of AI Response (Text or Audio)
            const hasAiAudio = !!message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            const hasAiText = !!message.serverContent?.outputTranscription;

            // If AI starts responding, assume User turn is done.
            // Finalize any pending user text to prevent duplication or hanging pending states.
            if ((hasAiAudio || hasAiText) && currentUserTextRef.current) {
                onTranscription(currentUserTextRef.current, 'user', true);
                currentUserTextRef.current = "";
            }

            // Handle Text Transcription
            if (message.serverContent?.outputTranscription?.text) {
                currentAiTextRef.current += message.serverContent.outputTranscription.text;
                onTranscription(currentAiTextRef.current, 'ai', false);
            }
            
            if (message.serverContent?.inputTranscription?.text) {
                currentUserTextRef.current += message.serverContent.inputTranscription.text;
                onTranscription(currentUserTextRef.current, 'user', false);
            }

            // Turn Complete
            if (message.serverContent?.turnComplete) {
                if (currentAiTextRef.current) {
                    onTranscription(currentAiTextRef.current, 'ai', true);
                    currentAiTextRef.current = "";
                }
                // Double check user text (should be cleared above, but safety net)
                if (currentUserTextRef.current) {
                    onTranscription(currentUserTextRef.current, 'user', true);
                    currentUserTextRef.current = "";
                }
            }

            // Audio Output
            if (hasAiAudio && outputCtx) {
                const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (audioData) {
                    // Visual state: AI is speaking
                    setMicState(MicState.SPEAKING);
                    
                    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                    const audioBuffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
                    const source = outputCtx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputCtx.destination);
                    source.addEventListener('ended', () => {
                        sourcesRef.current.delete(source);
                        if (sourcesRef.current.size === 0) {
                            // If mic was on, return to LISTENING, else IDLE
                            setMicState(isMicOnRef.current ? MicState.LISTENING : MicState.IDLE);
                        }
                    });
                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += audioBuffer.duration;
                    sourcesRef.current.add(source);
                }
            }

            if (message.serverContent?.interrupted) {
                stopAudioPlayback();
                currentAiTextRef.current = "";
                // Restore mic state if needed
                setMicState(isMicOnRef.current ? MicState.LISTENING : MicState.IDLE);
            }
          },
          onclose: () => {
              setIsConnected(false);
              setMicState(MicState.IDLE);
          },
          onerror: (e) => {
              console.error(e);
              setError("Connection error.");
              setIsConnected(false);
              setMicState(MicState.IDLE);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: systemPrompt,
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        }
      });

      sessionPromiseRef.current = sessionPromise;
    } catch (err: any) {
      setError(err.message || "Failed to connect");
      setIsConnected(false);
    }
  }, [isConnected, language, scenario, onTranscription, stopAudioPlayback]);

  return {
    connect,
    disconnect,
    sendText,
    activateMic,
    deactivateMic,
    isConnected,
    micState,
    error,
    volume
  };
};