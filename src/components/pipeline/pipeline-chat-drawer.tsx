"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Loader2, ExternalLink, ChevronLeft, Search } from "lucide-react";
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

interface ConvRow {
  id: string;
  leadId: string;
  name: string;
  lastMessage: string;
  unreadCount: number;
}

const MAX_FILE_MB = 16;

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
  const [view, setView] = useState<"chat" | "list">("chat");
  const [current, setCurrent] = useState<{ leadId: string; name: string }>({
    leadId,
    name: leadName,
  });
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [windowOpen, setWindowOpen] = useState(false);
  const [stageId, setStageId] = useState<string | null>(null);
  // lista de atendimentos (botão voltar)
  const [conversations, setConversations] = useState<ConvRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [search, setSearch] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async (convId: string) => {
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

  // Abre uma conversa (por leadId; cria/encontra a conversa) ou por convId direto.
  const openConversation = useCallback(
    async (lead: { leadId: string; name: string }, convId?: string) => {
      setView("chat");
      setCurrent(lead);
      setLoading(true);
      setMessages([]);
      let cid = convId || null;
      if (!cid) {
        const res = await fetch("/api/conversations/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId: lead.leadId }),
        });
        const d = await res.json().catch(() => null);
        cid = d?.conversationId || null;
      }
      setConversationId(cid);
      if (cid) await loadMessages(cid);
      // estágio do lead (p/ o seletor)
      fetch(`/api/leads/${lead.leadId}`)
        .then((r) => r.json())
        .then((d) => setStageId(d?.stageId || d?.lead?.stageId || null))
        .catch(() => {});
      setLoading(false);
    },
    [loadMessages],
  );

  // abre a conversa inicial (do card)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga assíncrona
    void openConversation({ leadId, name: leadName });
  }, [leadId, leadName, openConversation]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadList = useCallback(async () => {
    setListLoading(true);
    const res = await fetch("/api/conversations");
    const data = await res.json().catch(() => ({}));
    const items = (data.conversations || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c: any) => ({
        id: c.id,
        leadId: c.lead?.id || c.leadId || "",
        name: c.lead?.firstName || c.name || "Contato",
        lastMessage: c.messages?.[0]?.content || c.lastMessage || "",
        unreadCount: c.unreadCount || 0,
      }),
    );
    setConversations(items);
    setListLoading(false);
  }, []);

  function goToList() {
    setView("list");
    void loadList();
  }

  // upload de arquivo/áudio pela conversa atual
  const uploadFile = useCallback(
    async (file: File) => {
      if (!conversationId) return;
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        alert(`Arquivo muito grande. Máximo ${MAX_FILE_MB}MB.`);
        return;
      }
      const fd = new FormData();
      fd.append("file", file);
      await fetch(`/api/conversations/${conversationId}/media`, {
        method: "POST",
        body: fd,
      }).catch(() => {});
      await loadMessages(conversationId);
    },
    [conversationId, loadMessages],
  );

  const onAudio = useCallback(
    (blob: Blob) => {
      const ext = blob.type.includes("mp4")
        ? "m4a"
        : blob.type.includes("mpeg")
          ? "mp3"
          : "ogg";
      void uploadFile(
        new File([blob], `audio.${ext}`, { type: blob.type || "audio/ogg" }),
      );
    },
    [uploadFile],
  );

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
    await loadMessages(conversationId);
  }

  const filteredConvs = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {view === "list" ? (
          /* ─── Lista de atendimentos ─── */
          <>
            <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
              <span className="font-semibold text-gray-900">Atendimento</span>
              <button
                onClick={onClose}
                className="ml-auto rounded p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="border-b border-gray-100 px-3 py-2">
              <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-2 py-1.5">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar..."
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {listLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : filteredConvs.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-400">
                  Nenhuma conversa.
                </p>
              ) : (
                filteredConvs.map((c) => (
                  <button
                    key={c.id}
                    onClick={() =>
                      openConversation({ leadId: c.leadId, name: c.name }, c.id)
                    }
                    className="flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3 text-left hover:bg-gray-50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {c.name}
                      </p>
                      <p className="truncate text-xs text-gray-400">
                        {c.lastMessage}
                      </p>
                    </div>
                    {c.unreadCount > 0 && (
                      <span className="rounded-full bg-sky-500 px-1.5 text-[10px] font-semibold text-white">
                        {c.unreadCount}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          /* ─── Conversa ─── */
          <>
            <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-3">
              <button
                onClick={goToList}
                title="Voltar para a lista de atendimentos"
                className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-gray-900">
                  {current.name}
                </p>
                <p className="text-xs text-gray-400">
                  {windowOpen ? "Janela aberta (24h)" : "Janela fechada"}
                </p>
              </div>
              <a
                href={`/atendimento?leadId=${current.leadId}`}
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

            <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2">
              <StageSelector
                currentStageId={stageId}
                leadId={current.leadId}
                onStageChange={() => onChanged?.()}
              />
              {conversationId && (
                <ConversationTransferButton
                  conversationId={conversationId}
                  onTransferred={() => onChanged?.()}
                />
              )}
            </div>

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

            {windowOpen ? (
              <ChatInput
                value={input}
                onChange={setInput}
                onSend={send}
                onFileUpload={(file) => void uploadFile(file)}
                onAudioRecorded={onAudio}
                showEmoji={false}
                onToggleEmoji={() => {}}
              />
            ) : (
              <div className="border-t border-gray-100 bg-amber-50 px-4 py-3 text-center text-xs text-amber-700">
                Janela de 24h fechada. Para enviar um modelo aprovado, abra no{" "}
                <a
                  href={`/atendimento?leadId=${current.leadId}`}
                  className="font-semibold underline"
                >
                  Atendimento
                </a>
                .
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
