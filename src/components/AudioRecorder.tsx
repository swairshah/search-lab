import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

interface AudioRecorderProps {
  onAudioCapture: (audioBlob: Blob) => void;
  disabled?: boolean;
}

export function AudioRecorder({ onAudioCapture, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onAudioCapture(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setDuration(0);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 0.1);
      }, 100);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [onAudioCapture]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{
        width: '44px',
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isRecording ? 'var(--color-error)' : 'var(--color-surface)',
        border: `1px solid ${isRecording ? 'var(--color-error)' : 'var(--color-border)'}`,
        borderRadius: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: isRecording ? 'white' : 'var(--color-text)',
        opacity: disabled ? 0.5 : 1,
        position: 'relative',
        overflow: 'hidden',
      }}
      title={isRecording ? `Recording... ${duration.toFixed(1)}s` : 'Voice search'}
    >
      {isRecording ? (
        <>
          {/* Pulsing background */}
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'var(--color-error)',
              borderRadius: '8px',
            }}
          />
          {/* Stop icon */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ position: 'relative', zIndex: 1 }}
          >
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </>
      ) : (
        /* Microphone icon */
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      )}
    </motion.button>
  );
}
