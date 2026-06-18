"use client";

import { motion } from "framer-motion";
import {
  Bot,
  Check,
  CheckCheck,
  FileText,
  AlertCircle,
  Reply,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatBubbleProps {
  direction: "inbound" | "outbound";
  content: string;
  timestamp: string;
  status?: "sent" | "delivered" | "read" | "failed";
  aiGenerated?: boolean;
  senderName?: string;
  type?: "text" | "image" | "audio" | "document";
  mediaId?: string;
  errorReason?: string;
  onReply?: () => void;
}

export function ChatMessageBubble({
  direction,
  content,
  timestamp,
  status,
  aiGenerated,
  senderName,
  type = "text",
  mediaId,
  errorReason,
  onReply,
}: ChatBubbleProps) {
  const mediaSrc = mediaId ? `/api/whatsapp/media/${mediaId}` : undefined;
  // Legenda só aparece se não for o placeholder automático
  const showCaption =
    !!content &&
    !/^\[(image|audio|document|video|imagem|arquivo)/i.test(content);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group flex items-center gap-1.5",
        direction === "outbound" ? "justify-end" : "justify-start",
      )}
    >
      {onReply && direction === "outbound" && (
        <button
          onClick={onReply}
          title="Responder"
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity"
        >
          <Reply className="h-4 w-4" />
        </button>
      )}
      <div
        className={cn(
          "max-w-[70%] rounded-lg px-3 py-2 shadow-sm",
          direction === "outbound"
            ? "bg-[#d9fdd3]" // WhatsApp: balão enviado (verde claro)
            : "bg-white border border-gray-100", // WhatsApp: balão recebido (branco)
        )}
      >
        {aiGenerated && (
          <div className="flex items-center gap-1 mb-1">
            <Bot className="w-3 h-3 text-emerald-600" />
            <span className="text-[10px] text-emerald-600 font-medium">
              Gerado por IA
            </span>
          </div>
        )}
        {senderName && !aiGenerated && direction === "outbound" && (
          <p className="text-[10px] text-emerald-700 mb-1">{senderName}</p>
        )}
        {type === "image" && mediaSrc ? (
          <a href={mediaSrc} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaSrc}
              alt={content || "Imagem"}
              className="rounded-md max-w-[240px] max-h-[280px] object-cover"
            />
          </a>
        ) : type === "audio" && mediaSrc ? (
          <audio controls src={mediaSrc} className="max-w-[240px]" />
        ) : type === "document" && mediaSrc ? (
          <a
            href={mediaSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-gray-900 underline"
          >
            <FileText className="w-4 h-4 shrink-0" />
            {content || "Documento"}
          </a>
        ) : (
          <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-900">
            {content}
          </p>
        )}
        {showCaption && type !== "text" && (
          <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-900 mt-1">
            {content}
          </p>
        )}
        <div
          className={cn(
            "flex items-center gap-1 mt-1",
            direction === "outbound" ? "justify-end" : "",
          )}
        >
          <span className="text-[10px] text-gray-500">{timestamp}</span>
          {direction === "outbound" &&
            status &&
            (status === "failed" ? (
              <span
                className="flex items-center gap-0.5 text-[10px] text-rose-600 font-medium cursor-help"
                title={errorReason || "Falha no envio"}
              >
                <AlertCircle className="w-3.5 h-3.5" /> falhou
              </span>
            ) : status === "read" ? (
              <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
            ) : status === "delivered" ? (
              <CheckCheck className="w-3.5 h-3.5 text-gray-400" />
            ) : (
              <Check className="w-3.5 h-3.5 text-gray-400" />
            ))}
        </div>
      </div>
      {onReply && direction === "inbound" && (
        <button
          onClick={onReply}
          title="Responder"
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity"
        >
          <Reply className="h-4 w-4" />
        </button>
      )}
    </motion.div>
  );
}
