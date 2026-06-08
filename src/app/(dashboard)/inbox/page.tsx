"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search,
  Phone,
  Video,
  Filter,
  Archive,
  MessageCircle,
  Camera,
  MessagesSquare,
  Mail,
  UserPlus,
  Inbox,
  ArrowLeft,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMessageBubble } from "@/components/chat/chat-message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import type { ChatMessage } from "@/hooks/use-chat";

type Channel = "all" | "whatsapp" | "instagram" | "messenger";

interface UIConversation {
  id: string;
  channel: "whatsapp" | "instagram" | "messenger";
  name: string;
  phone: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  status: string;
  assignee?: string;
  priority: "normal" | "high" | "urgent";
}

interface LeadInfo {
  firstName?: string;
  lastName?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  source?: string;
  temperature?: string;
  score?: number;
  courseInterest?: string;
}

const channelIcons = {
  whatsapp: MessageCircle,
  instagram: Camera,
  messenger: MessagesSquare,
};
const channelColors = {
  whatsapp: "text-emerald-400",
  instagram: "text-pink-400",
  messenger: "text-blue-400",
};
const channelBg = {
  whatsapp: "bg-emerald-500/10",
  instagram: "bg-pink-500/10",
  messenger: "bg-blue-500/10",
};
const temperatureLabel: Record<string, string> = {
  hot: "Lead Quente",
  warm: "Lead Morno",
  cold: "Lead Frio",
};

function formatTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapConversation(c: any): UIConversation {
  const name =
    `${c.lead?.firstName || ""} ${c.lead?.lastName || ""}`.trim() || "Lead";
  return {
    id: c.id,
    channel: (c.channel as UIConversation["channel"]) || "whatsapp",
    name,
    phone: c.lead?.phone || c.lead?.whatsapp || "",
    lastMessage: c.messages?.[0]?.content || "",
    lastMessageAt: formatTime(c.lastMessageAt),
    unreadCount: c.unreadCount || 0,
    status: c.status || "open",
    assignee: c.assignee?.name,
    priority: (c.priority as UIConversation["priority"]) || "normal",
  };
}

const OUTBOUND_STATUS = new Set(["sent", "delivered", "read"]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMessage(m: any): ChatMessage {
  return {
    id: m.id,
    direction: m.direction === "outbound" ? "outbound" : "inbound",
    content: m.content,
    type: (m.contentType as ChatMessage["type"]) || "text",
    status:
      m.direction === "outbound" && OUTBOUND_STATUS.has(m.status)
        ? (m.status as ChatMessage["status"])
        : "sent",
    aiGenerated: !!m.aiGenerated,
    createdAt: formatTime(m.createdAt),
    sender: m.aiGenerated ? "IA" : undefined,
  };
}

export default function InboxPage() {
  const [channel, setChannel] = useState<Channel>("all");
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<UIConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedLead, setSelectedLead] = useState<LeadInfo | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations((data.conversations || []).map(mapConversation));
      }
    } catch {
      /* mantém estado anterior */
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const { conversation } = await res.json();
        setMessages((conversation.messages || []).map(mapMessage));
        setSelectedLead(conversation.lead || null);
      }
    } catch {
      /* mantém estado anterior */
    }
  }, []);

  // Lista de conversas (polling 6s)
  /* eslint-disable react-hooks/set-state-in-effect -- loadConversations é assíncrono (setState após await) */
  useEffect(() => {
    loadConversations();
    const t = setInterval(loadConversations, 6000);
    return () => clearInterval(t);
  }, [loadConversations]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Mensagens da conversa selecionada (polling 4s)
  /* eslint-disable react-hooks/set-state-in-effect -- limpa/recarrega ao trocar de conversa */
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setSelectedLead(null);
      return;
    }
    loadMessages(selectedId);
    const t = setInterval(() => loadMessages(selectedId), 4000);
    return () => clearInterval(t);
  }, [selectedId, loadMessages]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedId, messages]);

  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content || !selectedId || sending) return;
    setSending(true);
    setInput("");
    try {
      await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedId, content }),
      });
      await loadMessages(selectedId);
      loadConversations();
    } catch {
      setInput(content);
    } finally {
      setSending(false);
    }
  }, [input, selectedId, sending, loadMessages, loadConversations]);

  const filtered = conversations.filter((c) => {
    if (channel !== "all" && c.channel !== channel) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const selected = conversations.find((c) => c.id === selectedId);
  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);
  const leadName = selectedLead
    ? `${selectedLead.firstName || ""} ${selectedLead.lastName || ""}`.trim() ||
      "Lead"
    : selected?.name || "Lead";

  return (
    <div className="flex h-[calc(100dvh-4rem)] -m-6">
      {/* Conversation List */}
      <div
        className={cn(
          "w-full sm:w-[380px] flex flex-col border-r border-gray-200 bg-white",
          selectedId ? "hidden sm:flex" : "flex",
        )}
      >
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Inbox</h2>
              <p className="text-xs text-gray-500">{totalUnread} nao lidas</p>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                <Filter className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                <Archive className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversas..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-sky-500/30 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex gap-1">
            {[
              { key: "all" as const, label: "Todos" },
              { key: "whatsapp" as const, label: "WhatsApp" },
              { key: "instagram" as const, label: "Instagram" },
              { key: "messenger" as const, label: "Messenger" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setChannel(tab.key)}
                className={cn(
                  "flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  channel === tab.key
                    ? "bg-sky-50 text-sky-700 border border-sky-200"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50",
                )}
              >
                {tab.label}
                <span className="ml-1 opacity-60">
                  {tab.key === "all"
                    ? conversations.length
                    : conversations.filter((c) => c.channel === tab.key).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="p-6 text-sm text-gray-400 text-center">
              Carregando...
            </p>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Nenhuma conversa ainda</p>
              <p className="text-xs text-gray-400 mt-1">
                As conversas do WhatsApp aparecem aqui automaticamente.
              </p>
            </div>
          ) : (
            filtered.map((conv) => {
              const ChannelIcon = channelIcons[conv.channel];
              const isActive = conv.id === selectedId;
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={cn(
                    "w-full flex items-start gap-3 p-4 text-left transition-colors border-b border-gray-100",
                    isActive
                      ? "bg-sky-50 border-l-2 border-l-sky-500"
                      : "hover:bg-gray-50",
                  )}
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">
                        {initials(conv.name)}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full",
                        channelBg[conv.channel],
                      )}
                    >
                      <ChannelIcon
                        className={cn("w-3 h-3", channelColors[conv.channel])}
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p
                        className={cn(
                          "text-sm truncate",
                          conv.unreadCount > 0
                            ? "text-gray-900 font-semibold"
                            : "text-gray-700 font-medium",
                        )}
                      >
                        {conv.name}
                      </p>
                      <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                        {conv.lastMessageAt}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "text-xs truncate mt-0.5",
                        conv.unreadCount > 0
                          ? "text-gray-700 font-medium"
                          : "text-gray-400",
                      )}
                    >
                      {conv.lastMessage}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {conv.assignee && (
                        <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                          {conv.assignee}
                        </span>
                      )}
                      {conv.priority === "urgent" && (
                        <span className="text-[10px] text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded font-medium">
                          Urgente
                        </span>
                      )}
                      {conv.priority === "high" && (
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                          Alta
                        </span>
                      )}
                    </div>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-500 px-1.5 text-[10px] font-bold text-white shrink-0">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selected ? (
        <div
          className={cn(
            "flex-1 flex flex-col",
            !selectedId ? "hidden sm:flex" : "flex",
          )}
        >
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedId("")}
                className="sm:hidden flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {initials(leadName)}
                  </span>
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {leadName}
                </p>
                <div className="flex items-center gap-2">
                  {(() => {
                    const CI = channelIcons[selected.channel];
                    return (
                      <CI
                        className={cn(
                          "w-3 h-3",
                          channelColors[selected.channel],
                        )}
                      />
                    );
                  })()}
                  <span className="text-xs text-gray-500">
                    {selected.phone || selected.channel}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                <Phone className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                <Video className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50">
            {messages.length === 0 ? (
              <p className="text-center text-xs text-gray-400 mt-8">
                Nenhuma mensagem nesta conversa ainda.
              </p>
            ) : (
              messages.map((msg) => (
                <ChatMessageBubble
                  key={msg.id}
                  direction={msg.direction}
                  content={msg.content}
                  timestamp={msg.createdAt}
                  status={msg.status}
                  aiGenerated={msg.aiGenerated}
                  senderName={msg.sender}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onFileUpload={() => {}}
            onAudioToggle={() => {}}
            isRecording={false}
            showEmoji={showEmoji}
            onToggleEmoji={() => setShowEmoji(!showEmoji)}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Inbox className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              Selecione uma conversa
            </h3>
            <p className="text-sm text-gray-500">
              Escolha uma conversa para comecar a atender
            </p>
          </div>
        </div>
      )}

      {/* Right Panel - Lead Info (dados reais) */}
      {selected && (
        <div className="hidden lg:block w-[300px] border-l border-gray-200 overflow-y-auto">
          <div className="p-5 space-y-5">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center mx-auto mb-3">
                <span className="text-lg font-bold text-white">
                  {initials(leadName)}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-gray-900">
                {leadName}
              </h3>
              <p className="text-xs text-gray-600">
                {selectedLead?.phone || selectedLead?.whatsapp || ""}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Phone, label: "Ligar" },
                { icon: Mail, label: "Email" },
                { icon: UserPlus, label: "Atribuir" },
              ].map((action) => (
                <button
                  key={action.label}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <action.icon className="w-4 h-4 text-gray-600" />
                  <span className="text-[10px] text-gray-600">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Detalhes
              </h4>
              {[
                {
                  label: "Canal",
                  value:
                    selected.channel.charAt(0).toUpperCase() +
                    selected.channel.slice(1),
                },
                {
                  label: "Status",
                  value: selectedLead?.temperature
                    ? temperatureLabel[selectedLead.temperature] ||
                      selectedLead.temperature
                    : "—",
                },
                { label: "Origem", value: selectedLead?.source || "—" },
                {
                  label: "Interesse",
                  value: selectedLead?.courseInterest || "—",
                },
                {
                  label: "Score IA",
                  value:
                    selectedLead?.score != null
                      ? `${selectedLead.score}/100`
                      : "—",
                },
                {
                  label: "Consultor",
                  value: selected.assignee || "Nao atribuido",
                },
                { label: "Email", value: selectedLead?.email || "—" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex justify-between items-center gap-2"
                >
                  <span className="text-xs text-gray-500 shrink-0">
                    {item.label}
                  </span>
                  <span className="text-xs text-gray-900 font-medium truncate text-right">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
