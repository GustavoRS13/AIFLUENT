"use client";

import { useState, useCallback } from "react";

export interface ChatMessage {
  id: string;
  direction: "inbound" | "outbound";
  content: string;
  type: "text" | "image" | "audio" | "document";
  status: "sent" | "delivered" | "read" | "failed";
  aiGenerated: boolean;
  createdAt: string;
  sender?: string;
  mediaId?: string;
  errorReason?: string; // motivo real da falha (ex.: erro/política da Meta)
}

function now() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export function useChat(initialMessages: ChatMessage[]) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  const sendMessage = useCallback((content: string, aiGenerated = false) => {
    if (!content.trim()) return;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      direction: "outbound",
      content: content.trim(),
      type: "text",
      status: "sent",
      aiGenerated,
      createdAt: now(),
      sender: aiGenerated ? "IA" : undefined,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setShowEmoji(false);
  }, []);

  const handleSend = useCallback(() => {
    sendMessage(input);
  }, [input, sendMessage]);

  const handleFileUpload = useCallback(
    (file: File, type: "document" | "image") => {
      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        direction: "outbound",
        content:
          type === "image" ? "[Imagem enviada]" : `[Arquivo: ${file.name}]`,
        type: type === "image" ? "image" : "document",
        status: "sent",
        aiGenerated: false,
        createdAt: now(),
      };
      setMessages((prev) => [...prev, newMsg]);
    },
    [],
  );

  const handleAudioToggle = useCallback(() => {
    if (recording) {
      setRecording(false);
      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        direction: "outbound",
        content: "[Audio enviado]",
        type: "audio",
        status: "sent",
        aiGenerated: false,
        createdAt: now(),
      };
      setMessages((prev) => [...prev, newMsg]);
    } else {
      setRecording(true);
    }
  }, [recording]);

  return {
    messages,
    setMessages,
    input,
    setInput,
    recording,
    showEmoji,
    setShowEmoji,
    sendMessage,
    handleSend,
    handleFileUpload,
    handleAudioToggle,
  };
}
