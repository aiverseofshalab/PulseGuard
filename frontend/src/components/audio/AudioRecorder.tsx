import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Check, RefreshCw, AlertCircle } from "lucide-react";

interface AudioRecorderProps {
  onAudioReady: (blob: Blob) => void;
  targetDurationSeconds?: number;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onAudioReady,
  targetDurationSeconds = 3,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setErrorMsg(null);
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setHasRecorded(true);
        onAudioReady(audioBlob);

        // Stop all tracks to release hardware mic access
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev + 1 >= targetDurationSeconds) {
            stopRecording();
            return targetDurationSeconds;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      setErrorMsg("Microphone permission denied or no audio input device found.");
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRecording(false);
  };

  return (
    <div className="p-5 rounded-xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-200">Browser Acoustic Recording</h4>
          <p className="text-xs text-slate-400">
            Record {targetDurationSeconds} seconds of machine sound directly via your microphone.
          </p>
        </div>
        <div className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400">
          Target: {targetDurationSeconds}s
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Recording progress meter */}
      {isRecording && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-red-400 animate-pulse font-semibold">
              <span className="h-2 w-2 rounded-full bg-red-500" /> RECORDING...
            </span>
            <span>
              {recordingSeconds}s / {targetDurationSeconds}s
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-red-500 transition-all duration-300"
              style={{ width: `${(recordingSeconds / targetDurationSeconds) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors shadow-lg shadow-cyan-900/30"
          >
            <Mic className="h-4 w-4" />
            <span>{hasRecorded ? "Record Again" : "Start Microphone Recording"}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors animate-pulse"
          >
            <Square className="h-4 w-4" />
            <span>Stop Recording</span>
          </button>
        )}

        {hasRecorded && audioUrl && (
          <div className="flex items-center gap-2 flex-1">
            <audio src={audioUrl} controls className="h-8 flex-1 max-w-xs" />
            <div className="flex items-center gap-1 text-emerald-400 text-xs font-mono">
              <Check className="h-4 w-4" />
              <span>Captured</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

