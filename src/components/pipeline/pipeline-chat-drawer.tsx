"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Loader2, ExternalLink } from "lucide-react";
import { ChatMessageBubble } from "@/components/chat/chat-message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { StageSelector } from "@/components/atendimento/stage-selector";
import { ConversationTransferButton } from "@/components/atendimento/conversation-transfer-button";
import type { ChatMessage } from "@/hooks/use-chat";

interface Props {
  leadId: string;
  leadName: string;
  onClose: () => void;
  onChanged?: () => void; // recarrega o kanban após mudar estágio/transferir
}

function fmtTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMessage(m: any): ChatMessage {
  let mediaId: string | undefined;
  if (m.metadata) {
    try {
      mediaId = JSON.parse(m.metadata).mediaId || undefined;
    } catch {
      /* metadata pode não ser JSON */
    }
  }
  const t = (m.contentType as ChatMessage["type"]) || "text";
  return {
    id: m.id,
    direction: m.direction === "outbound" ? "outbound" : "inbound",
    content: m.content,
    type: ["text", "image", "audio", "document"].includes(t) ? t : "text",
    status: ["sent", "delivered", "read", "failed"].includes(m.status)
      ? (m.status as ChatMessage["status"])
      : "sent",
    aiGenerated: !!m.aiGenerated,
    createdAt: fmtTime(m.createdAt),
    sentAt: m.createdAt as string,
    wamid: (m.externalId as string) || undefined,
    mediaId,
  };
}

export function PipelineChatDrawer({
  leadId,
  leadName,
  onClose,
  onChanged,
}: Props) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [windowOpen, setWindowOpen] = useState(false);
  const [stageId, setStageId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // estágio atual do lead (p/ o seletor resolver o funil certo)
  useEffect(() => {
    let cancel = false;
    fetch(`/api/leads/${leadId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancel) setStageId(d?.lead?.stageId || d?.stageId || null);
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [leadId]);

  const loadConversation = useCallback(async (convId: string) => {
    const res = await fetch(`/api/conversations/${convId}`);
    if (!res.ok) return;
    const { conversation } = await res.json();
    setMessages((conversation.messages || []).map(mapMessage));
    const last = conversation.lastInboundAt;
    setWindowOpen(
      !!last &&
        // eslint-disable-next-line react-hooks/purity
        Date.now() - new Date(last).getTime() < 24 * 60 * 60 * 1000,
    );
  }, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const res = await fetch("/api/conversations/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const d = await res.json().catch(() => null);
      if (cancel) return;
      if (d?.conversationId) {
        setConversationId(d.conversationId);
        await loadConversation(d.conversationId);
      }
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [leadId, loadConversation]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const content = input.trim();
    if (!content || !conversationId) return;
    setInput("");
    setMessages((prev) => [
      ...prev,
      {
        id: `tmp-${prev.length}`,
        direction: "outbound",
        content,
        type: "text",
        status: "sent",
        aiGenerated: false,
        createdAt: fmtTime(new Date().toISOString()),
      },
    ]);
    await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, content }),
    }).catch(() => {});
    await loadConversation(conversationId);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900">{leadName}</p>
            <p className="text-xs text-gray-400">
              {windowOpen ? "Janela aberta (24h)" : "Janela fechada"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <a
              href={`/atendimento?leadId=${leadId}`}
              title="Abrir no Atendimento completo"
              className="rounded p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <button
              onClick={onClose}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Ações: estágio + transferir */}
        <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2">
          <StageSelector
            currentStageId={stageId}
            leadId={leadId}
            onStageChange={() => onChanged?.()}
          />
          {conversationId && (
            <ConversationTransferButton
              conversationId={conversationId}
              onTransferred={() => onChanged?.()}
            />
          )}
        </div>

        {/* Mensagens */}
        <div className="flex-1 space-y-2 overflow-y-auto bg-[#efeae2] px-3 py-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">
              Nenhuma mensagem ainda.
            </p>
          ) : (
            messages.map((m) => (
              <ChatMessageBubble
                key={m.id}
                direction={m.direction}
                content={m.content}
                timestamp={m.createdAt}
                status={m.status}
                aiGenerated={m.aiGenerated}
                type={m.type}
                mediaId={m.mediaId}
              />
            ))
          )}
          <div ref={endRef} />
        </div>

        {/* Composer */}
        {windowOpen ? (
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={send}
            showEmoji={false}
            onToggleEmoji={() => {}}
          />
        ) : (
          <div className="border-t border-gray-100 bg-amber-50 px-4 py-3 text-center text-xs text-amber-700">
            Janela de 24h fechada. Para enviar um modelo aprovado, abra no{" "}
            <a
              href={`/atendimento?leadId=${leadId}`}
              className="font-semibold underline"
            >
              Atendimento
            </a>
            .
          </div>
        )}
      </div>
    </div>
  );
}
