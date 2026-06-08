"use client";

import { motion } from "framer-motion";
import { Bot, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatBubbleProps {
  direction: "inbound" | "outbound";
  content: string;
  timestamp: string;
  status?: "sent" | "delivered" | "read";
  aiGenerated?: boolean;
  senderName?: string;
}

export function ChatMessageBubble({
  direction,
  content,
  timestamp,
  status,
  aiGenerated,
  senderName,
}: ChatBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex",
        direction === "outbound" ? "justify-end" : "justify-start",
      )}
    >
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
        <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-900">
          {content}
        </p>
        <div
          className={cn(
            "flex items-center gap-1 mt-1",
            direction === "outbound" ? "justify-end" : "",
          )}
        >
          <span className="text-[10px] text-gray-500">{timestamp}</span>
          {direction === "outbound" &&
            status &&
            (status === "read" ? (
              <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
            ) : status === "delivered" ? (
              <CheckCheck className="w-3.5 h-3.5 text-gray-400" />
            ) : (
              <Check className="w-3.5 h-3.5 text-gray-400" />
            ))}
        </div>
      </div>
    </motion.div>
  );
}
