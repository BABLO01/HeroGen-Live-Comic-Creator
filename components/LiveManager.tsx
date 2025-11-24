import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createBlob, decode, decodeAudioData } from '../services/audioUtils';
import { AudioStatus } from '../types';

interface LiveManagerProps {
  status: AudioStatus;
  setStatus: (status: AudioStatus) => void;
  isActive: boolean;
}

const LiveManager: React.FC<LiveManagerProps> = ({ status, setStatus, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const disconnect = useCallback(() => {
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => session.close());
      sessionPromiseRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    setStatus(AudioStatus.DISCONNECTED);
  }, [stream, setStatus]);

  const connect = useCallback(async () => {
    try {
      setStatus(AudioStatus.CONNECTING);
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      inputAudioContextRef.current = inputAudioContext;
      outputAudioContextRef.current = outputAudioContext;
      
      const outputNode = outputAudioContext.createGain();
      outputNode.connect(outputAudioContext.destination);

      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(mediaStream);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setStatus(AudioStatus.CONNECTED);
            
            const source = inputAudioContext.createMediaStreamSource(mediaStream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
               const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
               const pcmBlob = createBlob(inputData);
               sessionPromise.then((session) => {
                 session.sendRealtimeInput({ media: pcmBlob });
               });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64EncodedAudioString) {
                setStatus(AudioStatus.SPEAKING);
                
                nextStartTimeRef.current = Math.max(
                  nextStartTimeRef.current,
                  outputAudioContext.currentTime
                );
                
                const audioBuffer = await decodeAudioData(
                  decode(base64EncodedAudioString),
                  outputAudioContext,
                  24000,
                  1
                );
                
                const source = outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputNode);
                
                source.addEventListener('ended', () => {
                   sourcesRef.current.delete(source);
                   if (sourcesRef.current.size === 0) {
                      setStatus(AudioStatus.CONNECTED);
                   }
                });
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
            }
            
            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
               for (const source of sourcesRef.current.values()) {
                 source.stop();
                 sourcesRef.current.delete(source);
               }
               nextStartTimeRef.current = 0;
               setStatus(AudioStatus.CONNECTED);
            }
          },
          onclose: () => {
            setStatus(AudioStatus.DISCONNECTED);
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setStatus(AudioStatus.ERROR);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } },
          },
          systemInstruction: `You are the Director and Narrator of a superhero comic book being created live. 
          The user is the star. Be enthusiastic, hype up their superpowers, and act like a movie trailer voiceover guy or a comic book geek. 
          Keep responses relatively short and punchy unless asked for deep lore.`,
        },
      });
      
      sessionPromiseRef.current = sessionPromise;
      
    } catch (e) {
      console.error(e);
      setStatus(AudioStatus.ERROR);
    }
  }, [setStatus]);

  useEffect(() => {
    if (isActive && status === AudioStatus.DISCONNECTED) {
      connect();
    } else if (!isActive && status !== AudioStatus.DISCONNECTED) {
      disconnect();
    }
    
    return () => {
      // Cleanup on unmount handled by dependency change to isActive=false effectively
      if (!isActive) disconnect(); 
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]); // Only react to active toggle

  return null; // Headless component
};

export default LiveManager;
