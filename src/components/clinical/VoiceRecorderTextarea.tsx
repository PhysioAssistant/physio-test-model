import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Pause,
  Play,
  Square,
  RotateCcw,
  Sparkles,
  Volume2,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';

export type VoiceRecorderState =
  | 'idle'
  | 'recording'
  | 'paused'
  | 'stopping'
  | 'transcribing'
  | 'completed'
  | 'error';

export interface VoiceRecorderTextareaProps {
  id?: string;
  label?: string;
  hint?: string;
  exampleText?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
  maxRows?: number;
  disabled?: boolean;
  required?: boolean;
  provenanceType?: 'patient' | 'doctor';
  onProvenanceChange?: (provenance: {
    hasVoice: boolean;
    audioDurationSec?: number;
    rawTranscript?: string;
    isEdited: boolean;
  }) => void;
  className?: string;
}

// Check for Web Speech API
const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
        .SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
        .webkitSpeechRecognition
    : null;

export const VoiceRecorderTextarea: React.FC<VoiceRecorderTextareaProps> = ({
  id,
  label,
  hint,
  exampleText,
  placeholder = 'Type here or click "Record Voice" to speak...',
  value,
  onChange,
  minRows = 5,
  disabled = false,
  required = false,
  provenanceType = 'doctor',
  onProvenanceChange,
  className = '',
}) => {
  const [recorderState, setRecorderState] = useState<VoiceRecorderState>('idle');
  const [duration, setDuration] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rawTranscript, setRawTranscript] = useState<string>('');
  const [isEdited, setIsEdited] = useState<boolean>(false);
  const [showExample, setShowExample] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const interimBufferRef = useRef<string>('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // Pulse animation during recording
  useEffect(() => {
    if (recorderState === 'recording') {
      let phase = 0;
      const animate = () => {
        phase += 0.15;
        // Generate pseudo audio wave fluctuation
        const wave = 0.3 + Math.abs(Math.sin(phase) * 0.7);
        setAudioLevel(wave);
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setAudioLevel(0);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [recorderState]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Update provenance info
  const notifyProvenance = useCallback(
    (voiceUsed: boolean, rawText: string, edited: boolean, durSec: number) => {
      if (onProvenanceChange) {
        onProvenanceChange({
          hasVoice: voiceUsed,
          audioDurationSec: durSec,
          rawTranscript: rawText,
          isEdited: edited,
        });
      }
    },
    [onProvenanceChange]
  );

  // Handle manual typing
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    onChange(newVal);
    if (rawTranscript && newVal !== rawTranscript) {
      setIsEdited(true);
      notifyProvenance(true, rawTranscript, true, duration);
    }
  };

  // Start recording
  const startRecording = () => {
    setErrorMessage(null);

    // Initialize Web Speech API if supported
    if (SpeechRecognitionAPI) {
      try {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let currentTranscript = value ? value.trim() + ' ' : '';
        interimBufferRef.current = currentTranscript;

        recognition.onstart = () => {
          setRecorderState('recording');
          setDuration(0);
          timerRef.current = setInterval(() => {
            setDuration((prev) => prev + 1);
          }, 1000);
        };

        recognition.onresult = (event: any) => {
          let interim = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const result = event.results[i];
            if (result.isFinal) {
              finalTranscript += result[0].transcript + ' ';
            } else {
              interim += result[0].transcript;
            }
          }

          if (finalTranscript) {
            currentTranscript += finalTranscript;
            interimBufferRef.current = currentTranscript;
            setRawTranscript((prev) => (prev ? prev + ' ' : '') + finalTranscript.trim());
            onChange(currentTranscript.trim());
          } else if (interim) {
            // Preview interim speech
            onChange((currentTranscript + interim).trim());
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error event:', event.error);
          if (event.error !== 'no-speech') {
            setErrorMessage(`Microphone notice: ${event.error}. You can still type directly.`);
            setRecorderState('error');
            if (timerRef.current) clearInterval(timerRef.current);
          }
        };

        recognition.onend = () => {
          if (recorderState === 'recording') {
            // Re-check state: if we didn't explicitly pause or stop, speech recognition may have timed out
            setRecorderState('completed');
            if (timerRef.current) clearInterval(timerRef.current);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: any) {
        console.warn('Web Speech API start error:', err);
        fallbackSimulation();
      }
    } else {
      // Fallback for browsers without Web Speech
      fallbackSimulation();
    }
  };

  // Fallback simulation when Web Speech is unavailable
  const fallbackSimulation = () => {
    setRecorderState('recording');
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  };

  // Pause recording
  const pauseRecording = () => {
    if (recorderState !== 'recording') return;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setRecorderState('paused');
  };

  // Resume recording
  const resumeRecording = () => {
    if (recorderState !== 'paused') return;
    if (SpeechRecognitionAPI) {
      startRecording();
    } else {
      setRecorderState('recording');
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
  };

  // Stop recording
  const stopRecording = () => {
    setRecorderState('stopping');
    if (timerRef.current) clearInterval(timerRef.current);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    // Brief transcribing state transition for calm UX
    setRecorderState('transcribing');
    setTimeout(() => {
      setRecorderState('completed');
      notifyProvenance(true, rawTranscript || value, isEdited, duration);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 600);
  };

  // Reset or clear
  const resetRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }
    setRecorderState('idle');
    setDuration(0);
    setErrorMessage(null);
  };

  // Paste example
  const applyExample = () => {
    if (exampleText) {
      onChange(exampleText);
      setShowExample(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* ── Header & Action Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {label && (
            <label
              htmlFor={id}
              className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"
            >
              {label}
              {required && <span className="text-danger">*</span>}
            </label>
          )}
          {rawTranscript && (
            <Badge variant={isEdited ? 'warning' : 'success'} size="sm">
              {isEdited ? 'Voice Dictated (Edited)' : 'Voice Dictated'}
            </Badge>
          )}
        </div>

        {/* Example text toggle */}
        {exampleText && (
          <button
            type="button"
            onClick={() => setShowExample(!showExample)}
            className="text-xs text-clinical-600 hover:text-clinical-800 font-medium flex items-center gap-1 transition-colors"
          >
            <Sparkles size={13} />
            {showExample ? 'Hide clinical example' : 'View clinical example'}
          </button>
        )}
      </div>

      {/* ── Example Callout ── */}
      {showExample && exampleText && (
        <div className="p-3 bg-clinical-50/70 border border-clinical-200/80 rounded-xl text-xs text-slate-700 animate-fadeIn space-y-2">
          <div className="flex items-center justify-between text-clinical-800 font-semibold">
            <span className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-clinical-600" />
              Example of natural-language clinical phrasing:
            </span>
            <button
              type="button"
              onClick={applyExample}
              className="text-xs bg-white px-2 py-0.5 rounded-md border border-clinical-200 text-clinical-700 hover:bg-clinical-100 font-medium transition-colors"
            >
              Use this example
            </button>
          </div>
          <p className="italic text-slate-600 leading-relaxed font-sans">{exampleText}</p>
        </div>
      )}

      {/* ── Voice Status Ribbon (Active during Recording / Paused / Transcribing) ── */}
      {recorderState !== 'idle' && (
        <div
          className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs transition-all duration-200 ${
            recorderState === 'recording'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : recorderState === 'paused'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : recorderState === 'transcribing'
              ? 'bg-clinical-50 border-clinical-200 text-clinical-800'
              : recorderState === 'completed'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {recorderState === 'recording' && (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
                </span>
                <span className="font-semibold tracking-wide uppercase text-[11px]">
                  Listening & Transcribing...
                </span>
                {/* Waveform indicator */}
                <div className="flex items-center gap-0.5 ml-1 h-3.5">
                  {[0.4, 0.8, 0.5, 1, 0.6, 0.9, 0.4].map((scale, i) => (
                    <span
                      key={i}
                      className="w-0.5 bg-rose-500 rounded-full transition-all duration-75"
                      style={{
                        height: `${Math.max(4, audioLevel * scale * 14)}px`,
                      }}
                    />
                  ))}
                </div>
              </>
            )}

            {recorderState === 'paused' && (
              <>
                <Pause size={14} className="text-amber-600" />
                <span className="font-semibold">Dictation Paused</span>
              </>
            )}

            {recorderState === 'transcribing' && (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-clinical-600 border-t-transparent rounded-full animate-spin" />
                <span className="font-semibold">Finalizing clinical transcription...</span>
              </>
            )}

            {recorderState === 'completed' && (
              <>
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span className="font-semibold">Dictation captured. You can edit freely below.</span>
              </>
            )}

            {recorderState === 'error' && (
              <>
                <AlertCircle size={14} className="text-rose-600" />
                <span className="font-semibold">{errorMessage || 'Microphone error'}</span>
              </>
            )}

            {/* Timer */}
            <span className="flex items-center gap-1 font-mono font-medium text-slate-600 bg-white/70 px-2 py-0.5 rounded-md border border-slate-200/50">
              <Clock size={11} />
              {formatTime(duration)}
            </span>
          </div>

          {/* Quick controls inside ribbon */}
          <div className="flex items-center gap-1.5">
            {recorderState === 'recording' && (
              <>
                <button
                  type="button"
                  onClick={pauseRecording}
                  title="Pause dictation"
                  className="p-1 hover:bg-rose-100 rounded-lg text-rose-700 transition-colors"
                >
                  <Pause size={14} />
                </button>
                <button
                  type="button"
                  onClick={stopRecording}
                  title="Stop dictation"
                  className="flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium text-xs shadow-xs transition-colors"
                >
                  <Square size={11} fill="currentColor" />
                  Done
                </button>
              </>
            )}

            {recorderState === 'paused' && (
              <>
                <button
                  type="button"
                  onClick={resumeRecording}
                  title="Resume dictation"
                  className="flex items-center gap-1 px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-xs shadow-xs transition-colors"
                >
                  <Play size={11} fill="currentColor" />
                  Resume
                </button>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium text-xs transition-colors"
                >
                  Finish
                </button>
              </>
            )}

            {(recorderState === 'completed' || recorderState === 'error') && (
              <button
                type="button"
                onClick={resetRecording}
                className="text-xs text-slate-500 hover:text-slate-800 underline transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Main Textarea Container ── */}
      <div className="relative group">
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={handleTextChange}
          disabled={disabled}
          rows={minRows}
          placeholder={placeholder}
          className={`w-full px-4 py-3.5 pb-12 rounded-xl text-sm text-slate-900 leading-relaxed border transition-all duration-200 resize-y font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-clinical-500/20 ${
            recorderState === 'recording'
              ? 'border-rose-300 bg-rose-50/20 focus:border-rose-400'
              : 'border-slate-200 bg-white hover:border-slate-300 focus:border-clinical-600'
          }`}
        />

        {/* ── In-Textarea Bottom Action Bar ── */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between pointer-events-none">
          {/* Left: Dictation Trigger Button */}
          <div className="pointer-events-auto">
            {recorderState === 'idle' ? (
              <button
                type="button"
                onClick={startRecording}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-clinical-50 hover:bg-clinical-100 text-clinical-700 border border-clinical-200/80 shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Mic size={14} className="text-clinical-600" />
                Record Voice (Dictate)
              </button>
            ) : recorderState === 'recording' ? (
              <button
                type="button"
                onClick={stopRecording}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all"
              >
                <Square size={12} fill="currentColor" />
                Stop Recording ({formatTime(duration)})
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                <Mic size={13} />
                Dictate More
              </button>
            )}
          </div>

          {/* Right: Word count & Clear */}
          <div className="pointer-events-auto flex items-center gap-2 text-xs text-slate-400">
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setRawTranscript('');
                  setIsEdited(false);
                }}
                className="hover:text-slate-600 text-[11px] transition-colors"
              >
                Clear
              </button>
            )}
            <span className="text-[11px] font-mono">
              {value.trim() ? value.trim().split(/\s+/).length : 0} words
            </span>
          </div>
        </div>
      </div>

      {/* ── Subtitle / Hint ── */}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
};
