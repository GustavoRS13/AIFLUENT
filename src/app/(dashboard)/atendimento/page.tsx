"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ArrowLeft,
  MessageCircle,
  Phone,
  Hash,
  Filter,
  Wifi,
  WifiOff,
  X,
  ArrowRightLeft,
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { ChatMessageBubble } from "@/components/chat/chat-message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { useChat, type ChatMessage } from "@/hooks/use-chat";
import { SLATimer } from "@/components/atendimento/sla-timer";
import { LeadOperationPanel } from "@/components/atendimento/lead-operation-panel";
import { ConversationTransferButton } from "@/components/atendimento/conversation-transfer-button";

// ── Types ───────────────────────────────────────────────────────────────────

type ConversationChannel = "whatsapp" | "instagram" | "messenger" | "email";

interface Conversation {
  id: string;
  leadId: string;
  name: string;
  avatar: string;
  phone?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  channel: ConversationChannel;
  assignee?: string;
  messages: ChatMessage[];
}

type FilterTab = "meus" | "todos" | "nao_lidos";

// ── Channel helpers ─────────────────────────────────────────────────────────

const channelIcons: Record<ConversationChannel, React.ElementType> = {
  whatsapp: MessageCircle,
  instagram: Hash,
  messenger: MessageCircle,
  email: MessageCircle,
};

const channelColors: Record<ConversationChannel, string> = {
  whatsapp: "text-emerald-500",
  instagram: "text-pink-500",
  messenger: "text-blue-500",
  email: "text-gray-500",
};

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApiMessage(m: any): ChatMessage {
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
    status: ["sent", "delivered", "read"].includes(m.status)
      ? (m.status as ChatMessage["status"])
      : "sent",
    aiGenerated: !!m.aiGenerated,
    createdAt: fmtTime(m.createdAt),
    mediaId,
  };
}

// ── Component ───────────────────────────────────────────────────────────────

export default function AtendimentoPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("todos");
  const [apiStatus] = useState<"connected" | "disconnected">("connected");
  const [allMessages, setAllMessages] = useState<Record<string, ChatMessage[]>>(
    {},
  );
  const [showPanel, setShowPanel] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationListRef = useRef<HTMLDivElement>(null);

  const selectedConv = conversations.find((c) => c.id === selectedId);
  const currentMessages = selectedId
    ? (allMessages[selectedId] ?? selectedConv?.messages ?? [])
    : [];

  const {
    input,
    setInput,
    recording,
    showEmoji,
    setShowEmoji,
    handleAudioToggle,
  } = useChat([]);

  // Fetch conversations from API on mount
  useEffect(() => {
    async function fetchConversations() {
      try {
        const res = await fetch("/api/conversations");
        if (!res.ok) throw new Error();
        const data = await res.json();
        const items = data.conversations || [];
        if (Array.isArray(items)) {
          const mapped: Conversation[] = items.map(
            (c: Record<string, unknown>) => {
              const lead = c.lead as Record<string, unknown> | null;
              const messages = c.messages as
                | Array<Record<string, unknown>>
                | undefined;
              const lastMsg = messages?.[0];
              return {
                id: c.id as string,
                leadId: (lead?.id as string) || "",
                name:
                  [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
                  "Sem nome",
                avatar:
                  ((lead?.firstName as string)?.[0] || "?").toUpperCase() +
                  ((lead?.lastName as string)?.[0] || "").toUpperCase(),
                phone: (lead?.phone || lead?.whatsapp) as string | undefined,
                lastMessage: (lastMsg?.content as string) || "",
                lastMessageAt: (c.lastMessageAt ||
                  c.updatedAt ||
                  new Date().toISOString()) as string,
                unreadCount: (c.unreadCount as number) || 0,
                channel: (c.channel as ConversationChannel) || "whatsapp",
                assignee: (c.assignee as Record<string, unknown>)?.name as
                  | string
                  | undefined,
                messages: [],
              };
            },
          );
          setConversations(mapped);
        }
      } catch {
        // API unavailable — keep empty state
      } finally {
        setLoading(false);
      }
    }
    fetchConversations();
  }, []);

  // Carrega o histórico real da conversa selecionada (+ polling 5s)
  /* eslint-disable react-hooks/set-state-in-effect -- carregamento assíncrono */
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/conversations/${selectedId}`);
        if (!res.ok) return;
        const { conversation } = await res.json();
        if (cancelled) return;
        const msgs: ChatMessage[] = (conversation.messages || []).map(
          mapApiMessage,
        );
        setAllMessages((prev) => ({ ...prev, [selectedId]: msgs }));
      } catch {
        /* mantém estado anterior */
      }
    };
    load();
    const t = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [selectedId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  const now = () => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const addMessage = useCallback(
    (msg: ChatMessage) => {
      if (!selectedId) return;
      setAllMessages((prev) => ({
        ...prev,
        [selectedId]: [...(prev[selectedId] ?? []), msg],
      }));
    },
    [selectedId],
  );

  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content || !selectedId) return;
    setInput("");
    setShowEmoji(false);
    // Exibe otimista enquanto envia
    addMessage({
      id: `tmp-${Date.now()}`,
      direction: "outbound",
      content,
      type: "text",
      status: "sent",
      aiGenerated: false,
      createdAt: now(),
    });
    try {
      // Envia de verdade pelo WhatsApp + persiste
      await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedId, content }),
      });
      // Recarrega do servidor (mensagem real + status de entrega)
      const res = await fetch(`/api/conversations/${selectedId}`);
      if (res.ok) {
        const { conversation } = await res.json();
        const msgs: ChatMessage[] = (conversation.messages || []).map(
          mapApiMessage,
        );
        setAllMessages((prev) => ({ ...prev, [selectedId]: msgs }));
      }
    } catch {
      /* otimista já exibido */
    }
  }, [input, selectedId, addMessage, setInput, setShowEmoji]);

  const handleFileUpload = useCallback(
    async (file: File, type: "document" | "image") => {
      if (!selectedId) return;
      // Exibe otimista
      addMessage({
        id: `tmp-${Date.now()}`,
        direction: "outbound",
        content: type === "image" ? "[Imagem]" : `[Arquivo] ${file.name}`,
        type: type === "image" ? "image" : "document",
        status: "sent",
        aiGenerated: false,
        createdAt: now(),
      });
      try {
        const fd = new FormData();
        fd.append("file", file);
        await fetch(`/api/conversations/${selectedId}/media`, {
          method: "POST",
          body: fd,
        });
        const res = await fetch(`/api/conversations/${selectedId}`);
        if (res.ok) {
          const { conversation } = await res.json();
          const msgs: ChatMessage[] = (conversation.messages || []).map(
            mapApiMessage,
          );
          setAllMessages((prev) => ({ ...prev, [selectedId]: msgs }));
        }
      } catch {
        /* otimista já exibido */
      }
    },
    [selectedId, addMessage],
  );

  const handleAudioToggleLocal = useCallback(() => {
    if (recording) {
      addMessage({
        id: `msg-${Date.now()}`,
        direction: "outbound",
        content: "[Audio enviado]",
        type: "audio",
        status: "sent",
        aiGenerated: false,
        createdAt: now(),
      });
    }
    handleAudioToggle();
  }, [recording, addMessage, handleAudioToggle]);

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      !searchTerm ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone || "").includes(searchTerm);

    const matchesFilter =
      filterTab === "todos" ||
      (filterTab === "nao_lidos" && c.unreadCount > 0) ||
      filterTab === "meus"; // TODO: filter by current user assignment

    return matchesSearch && matchesFilter;
  });

  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);

  const conversationVirtualizer = useVirtualizer({
    count: filteredConversations.length,
    getScrollElement: () => conversationListRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  // Time formatting for conversation list
  function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "agora";
    if (diffMin < 60) return `${diffMin}min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h`;
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-7rem)]">
      {/* 3-column layout */}
      <div className="flex-1 flex rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 min-h-0">
        {/* Column 1: Conversation List (300px) */}
        <div
          className={cn(
            "w-full sm:w-[300px] border-r border-gray-200 bg-white flex flex-col shrink-0",
            selectedId ? "hidden sm:flex" : "flex",
          )}
        >
          {/* Search & filter */}
          <div className="p-3 space-y-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar conversas..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:border-sky-400 focus:outline-none transition-colors"
              />
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1">
              {(
                [
                  { key: "meus", label: "Meus" },
                  { key: "todos", label: "Todos" },
                  {
                    key: "nao_lidos",
                    label: `Nao lidos${totalUnread > 0 ? ` (${totalUnread})` : ""}`,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterTab(tab.key)}
                  className={cn(
                    "flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                    filterTab === tab.key
                      ? "bg-sky-50 text-sky-600 border border-sky-200"
                      : "text-gray-500 hover:bg-gray-50 border border-transparent",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation list (virtualized) */}
          <div ref={conversationListRef} className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-sky-500" />
              </div>
            )}
            {conversations.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <MessageCircle className="w-12 h-12 text-gray-300 mb-3" />
                <h3 className="text-sm font-medium text-gray-900 mb-1">
                  Nenhuma conversa
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Conecte o WhatsApp Business para receber conversas
                </p>
                <button className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-medium rounded-lg transition-colors">
                  Conectar WhatsApp
                </button>
              </div>
            )}
            {!loading &&
              filteredConversations.length === 0 &&
              conversations.length > 0 && (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <MessageCircle className="h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">
                    Nenhuma conversa encontrada
                  </p>
                </div>
              )}
            {!loading && filteredConversations.length > 0 && (
              <div
                style={{
                  height: `${conversationVirtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {conversationVirtualizer.getVirtualItems().map((virtualRow) => {
                  const conv = filteredConversations[virtualRow.index];
                  const ChannelIcon = channelIcons[conv.channel];
                  return (
                    <button
                      key={conv.id}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      onClick={() => setSelectedId(conv.id)}
                      className={cn(
                        "flex items-start gap-3 p-3 text-left transition-colors border-b border-gray-50",
                        selectedId === conv.id
                          ? "bg-sky-50"
                          : "hover:bg-gray-50",
                      )}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center">
                          <span className="text-xs font-bold text-white">
                            {conv.avatar}
                          </span>
                        </div>
                        <div
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white flex items-center justify-center",
                            conv.channel === "whatsapp"
                              ? "bg-emerald-500"
                              : conv.channel === "instagram"
                                ? "bg-pink-500"
                                : "bg-blue-500",
                          )}
                        >
                          <ChannelIcon className="h-2.5 w-2.5 text-white" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {conv.name}
                          </p>
                          <span className="text-[10px] text-gray-400 shrink-0">
                            {formatTime(conv.lastMessageAt)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {conv.lastMessage}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <SLATimer lastMessageAt={conv.lastMessageAt} />
                          {conv.unreadCount > 0 && (
                            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-bold text-white">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Connection status */}
          <div className="border-t border-gray-200 px-3 py-2">
            <div
              className={cn(
                "flex items-center gap-1.5 text-[10px] font-medium",
                apiStatus === "connected"
                  ? "text-emerald-600"
                  : "text-rose-500",
              )}
            >
              {apiStatus === "connected" ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              {apiStatus === "connected" ? "API Conectada" : "API Desconectada"}
            </div>
          </div>
        </div>

        {/* Column 2: Chat Area (flex-1) */}
        <div
          className={cn(
            "flex-1 flex flex-col min-w-0 bg-white",
            !selectedId && "hidden sm:flex",
          )}
        >
          {selectedConv ? (
            <>
              {/* Chat header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setSelectedId(null)}
                    className="sm:hidden flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                    aria-label="Voltar"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className="relative">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">
                        {selectedConv.avatar}
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {selectedConv.name}
                      </p>
                      {(() => {
                        const ChannelIcon = channelIcons[selectedConv.channel];
                        return (
                          <span
                            className={cn(
                              "inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium",
                              channelColors[selectedConv.channel],
                            )}
                          >
                            <ChannelIcon className="h-2.5 w-2.5" />
                            {selectedConv.channel}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <SLATimer lastMessageAt={selectedConv.lastMessageAt} />
                      {selectedConv.phone && (
                        <span className="text-[10px] text-gray-400">
                          {selectedConv.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    <Phone className="h-4 w-4" />
                  </button>
                  <ConversationTransferButton
                    conversationId={selectedConv.id}
                  />
                  <button
                    onClick={() => setShowPanel((p) => !p)}
                    className={cn(
                      "hidden lg:flex p-2 rounded-lg transition-colors",
                      showPanel
                        ? "text-sky-500 bg-sky-50"
                        : "text-gray-400 hover:text-gray-600 hover:bg-gray-50",
                    )}
                    title={showPanel ? "Ocultar painel" : "Mostrar painel"}
                  >
                    <Filter className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                {currentMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageCircle className="h-10 w-10 text-gray-200 mb-3" />
                    <p className="text-sm text-gray-400">
                      Nenhuma mensagem ainda
                    </p>
                    <p className="text-xs text-gray-300 mt-1">
                      Envie a primeira mensagem para iniciar a conversa
                    </p>
                  </div>
                )}
                {currentMessages.map((msg) => (
                  <ChatMessageBubble
                    key={msg.id}
                    direction={msg.direction}
                    content={msg.content}
                    timestamp={msg.createdAt}
                    status={msg.status}
                    aiGenerated={msg.aiGenerated}
                    senderName={msg.sender}
                    type={msg.type}
                    mediaId={msg.mediaId}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <ChatInput
                value={input}
                onChange={setInput}
                onSend={handleSend}
                onFileUpload={handleFileUpload}
                onAudioToggle={handleAudioToggleLocal}
                isRecording={recording}
                showEmoji={showEmoji}
                onToggleEmoji={() => setShowEmoji(!showEmoji)}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 mb-4">
                <MessageCircle className="h-8 w-8 text-sky-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                Atendimento
              </h2>
              <p className="text-sm text-gray-500 mt-1 max-w-xs">
                Selecione uma conversa para iniciar o atendimento ao cliente
              </p>
            </div>
          )}
        </div>

        {/* Column 3: Lead Operation Panel (340px) */}
        <AnimatePresence>
          {showPanel && selectedConv && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="hidden lg:block border-l border-gray-200 overflow-hidden shrink-0 bg-white"
            >
              <div className="w-[340px] h-full">
                <LeadOperationPanel
                  leadId={selectedConv.leadId || null}
                  className="h-full"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
