"use client";

import { useRef, useState, useCallback, useMemo } from "react";

// Melhor formato GRAVÁVEL pelo navegador. Preferimos os já aceitos pelo
// WhatsApp (ogg/opus, mp4/aac, mpeg); o webm (Chrome) é permitido porque o
// backend transcodifica para ogg/opus antes de enviar. Retorna null só se o
// navegador não suportar gravação nenhuma.
function pickRecordableAudioMime(): string | null {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported)
    return null;
  // Preferimos webm/opus a mp4 no Chrome: o mp4 fragmentado do MediaRecorder
  // não tem timestamps confiáveis e gera ogg inválido (erro 131053). webm tem.
  const candidates = [
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mpeg",
    "audio/mp4",
  ];
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? null;
}
import { AnimatePresence } from "framer-motion";
import { Send, Paperclip, Smile, Mic, Image, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmojiPanel } from "./emoji-panel";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onFileUpload?: (file: File, type: "document" | "image") => void;
  onAudioToggle?: () => void;
  onAudioRecorded?: (blob: Blob) => void;
  onAiGenerate?: () => void;
  isRecording?: boolean;
  showEmoji: boolean;
  onToggleEmoji: () => void;
  placeholder?: string;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onFileUpload,
  onAudioToggle,
  onAudioRecorded,
  onAiGenerate,
  isRecording = false,
  showEmoji,
  onToggleEmoji,
  placeholder = "Digite sua mensagem...",
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  // Formato de áudio aceito pelo WhatsApp e suportado por este navegador.
  const audioMime = useMemo(() => pickRecordableAudioMime(), []);
  const canRecordAudio = !!audioMime;

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  // Gravação real de áudio via MediaRecorder (quando onAudioRecorded é fornecido)
  const startRecording = useCallback(async () => {
    if (!audioMime) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: audioMime });
      chunksRef.current = [];
      cancelledRef.current = false;
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stopTimer();
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || audioMime,
        });
        stream.getTracks().forEach((t) => t.stop());
        // Só envia se NÃO foi cancelado
        if (!cancelledRef.current && blob.size > 0) onAudioRecorded?.(blob);
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(
        () => setRecordingTime((t) => t + 1),
        1000,
      );
    } catch {
      alert("Não foi possível acessar o microfone. Verifique a permissão.");
    }
  }, [onAudioRecorded, audioMime, stopTimer]);

  // Para e ENVIA
  const stopRecording = useCallback(() => {
    cancelledRef.current = false;
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }, []);

  // Cancela e DESCARTA (não envia)
  const cancelRecording = useCallback(() => {
    cancelledRef.current = true;
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
    stopTimer();
  }, [stopTimer]);

  const handleMicClick = useCallback(() => {
    if (onAudioRecorded) {
      if (recording) stopRecording();
      else startRecording();
    } else {
      onAudioToggle?.();
    }
  }, [
    onAudioRecorded,
    recording,
    startRecording,
    stopRecording,
    onAudioToggle,
  ]);

  const isRec = onAudioRecorded ? recording : isRecording;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "document" | "image",
  ) => {
    const file = e.target.files?.[0];
    if (!file || !onFileUpload) return;
    onFileUpload(file, type);
    e.target.value = "";
  };

  const handleEmojiSelect = (emoji: string) => {
    onChange(value + emoji);
    textareaRef.current?.focus();
  };

  return (
    <>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => handleFileChange(e, "document")}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileChange(e, "image")}
      />

      {/* Emoji Panel */}
      <AnimatePresence>
        {showEmoji && (
          <EmojiPanel onSelect={handleEmojiSelect} onClose={onToggleEmoji} />
        )}
      </AnimatePresence>

      {/* Recording indicator */}
      {isRec && (
        <div className="px-4 sm:px-6 pb-2">
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-sm text-rose-700 font-medium">Gravando</span>
            <span className="text-sm text-rose-700 font-mono tabular-nums">
              {Math.floor(recordingTime / 60)}:
              {(recordingTime % 60).toString().padStart(2, "0")}
            </span>
            <div className="ml-auto flex items-center gap-3">
              {onAudioRecorded && (
                <button
                  onClick={cancelRecording}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={handleMicClick}
                className="text-xs text-rose-600 hover:text-rose-800 font-medium"
              >
                Parar e enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="px-4 sm:px-6 py-4 bg-white border-t border-gray-200">
        <div className="flex items-end gap-2">
          <div className="flex gap-1">
            {onFileUpload && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  title="Enviar arquivo"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  title="Enviar imagem"
                >
                  <Image className="w-5 h-5" />
                </button>
              </>
            )}
            {(onAudioToggle || (onAudioRecorded && canRecordAudio)) && (
              <button
                onClick={handleMicClick}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isRec
                    ? "text-rose-500 bg-rose-50 hover:bg-rose-100"
                    : "text-gray-400 hover:text-gray-900 hover:bg-gray-50",
                )}
                title={isRec ? "Parar gravacao" : "Gravar audio"}
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-sky-500/30 focus:outline-none resize-y transition-colors min-h-[88px] max-h-[240px]"
            />
          </div>
          <button
            onClick={onToggleEmoji}
            className={cn(
              "p-2 rounded-lg transition-colors",
              showEmoji
                ? "text-emerald-600 bg-emerald-50"
                : "text-gray-400 hover:text-gray-900 hover:bg-gray-50",
            )}
          >
            <Smile className="w-5 h-5" />
          </button>
          <button
            onClick={onSend}
            className="p-2.5 rounded-xl bg-[#25d366] hover:bg-[#20bd5a] text-white transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
          {onAiGenerate && (
            <button
              onClick={onAiGenerate}
              className="p-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white transition-colors"
              title="Gerar resposta com IA"
            >
              <Bot className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
