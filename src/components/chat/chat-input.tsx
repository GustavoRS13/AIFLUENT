"use client";

import { useRef, useState, useCallback } from "react";
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
  const [recording, setRecording] = useState(false);

  // Gravação real de áudio via MediaRecorder (quando onAudioRecorded é fornecido)
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // WhatsApp aceita ogg(opus)/mp4(aac)/mpeg/amr. Escolhe o melhor formato
      // SUPORTADO pelo navegador, na ordem de compatibilidade com o WhatsApp.
      const candidates = [
        "audio/ogg;codecs=opus",
        "audio/mp4",
        "audio/mpeg",
        "audio/webm;codecs=opus",
        "audio/webm",
      ];
      const mimeType =
        typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported
          ? candidates.find((c) => MediaRecorder.isTypeSupported(c))
          : undefined;
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        // Usa o mime REAL gravado (não rotula errado)
        const realType = mr.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: realType });
        stream.getTracks().forEach((t) => t.stop());
        if (blob.size > 0) onAudioRecorded?.(blob);
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      alert("Não foi possível acessar o microfone. Verifique a permissão.");
    }
  }, [onAudioRecorded]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }, []);

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
            <span className="text-sm text-rose-700 font-medium">
              Gravando...
            </span>
            <button
              onClick={handleMicClick}
              className="ml-auto text-xs text-rose-600 hover:text-rose-800 font-medium"
            >
              Parar e enviar
            </button>
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
            {(onAudioToggle || onAudioRecorded) && (
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
              rows={1}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-sky-500/30 focus:outline-none resize-none transition-colors"
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
