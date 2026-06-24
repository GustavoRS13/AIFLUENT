"use client";

import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  ArrowLeft,
  MessageCircle,
  Phone,
  Hash,
  Filter,
  Wifi,
  WifiOff,
  Upload,
  FileText,
  Plus,
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { ChatMessageBubble } from "@/components/chat/chat-message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { FileUploadModal } from "@/components/chat/file-upload-modal";
import { TemplatePicker } from "@/components/chat/template-picker";
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
  lastInboundAt?: string | null;
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
    status: ["sent", "delivered", "read", "failed"].includes(m.status)
      ? (m.status as ChatMessage["status"])
      : "sent",
    aiGenerated: !!m.aiGenerated,
    createdAt: fmtTime(m.createdAt),
    sentAt: m.createdAt as string,
    wamid: (m.externalId as string) || undefined,
    mediaId,
    errorReason:
      m.status === "failed"
        ? errorReasonText(m.errorCode, m.errorTitle)
        : undefined,
  };
}

// Traduz o erro da Meta em uma explicação curta e clara pro atendente.
function errorReasonText(code?: string | null, title?: string | null): string {
  switch (String(code)) {
    case "131047":
      return "Fora da janela de 24h — use um modelo aprovado.";
    case "131049":
      return "Meta limitou: modelo de MARKETING tem teto por usuário. Use um modelo UTILITY.";
    case "131026":
      return "Mensagem não entregue (número pode não ter WhatsApp).";
    case "131053":
      return "Mídia inválida para o WhatsApp.";
    default:
      return title || "Falha no envio (Meta).";
  }
}

// ── Validação de anexos ──────────────────────────────────────────────────────
const MAX_FILE_MB = 16; // limite seguro do WhatsApp (mídia/áudio/vídeo)
const ALLOWED_MIME =
  /^(image\/(jpeg|jpg|png|webp|gif)|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet)|application\/vnd\.ms-excel|text\/plain|audio\/.+|video\/(mp4|3gpp))$/;

// Janela de 24h da Meta: aberta só se houve mensagem recebida nas últimas 24h.
// Fora dela, só dá pra enviar TEMPLATE aprovado (texto livre é rejeitado).
function isWindowOpen(lastInboundAt?: string | null): boolean {
  if (!lastInboundAt) return false;
  // eslint-disable-next-line react-hooks/purity -- janela relativa ao agora
  return Date.now() - new Date(lastInboundAt).getTime() < 24 * 60 * 60 * 1000;
}

// Rótulo do separador de dia: Hoje / Ontem / DD/MM/AAAA.
function dayLabel(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  // eslint-disable-next-line react-hooks/purity -- comparação com o dia atual
  const now = new Date();
  const startOf = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  return d.toLocaleDateString("pt-BR");
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
  const [isDragging, setIsDragging] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creatingConv, setCreatingConv] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesBoxRef = useRef<HTMLDivElement>(null);
  // true = usuário está no fim da conversa (pode auto-descer). false = subiu p/ ler.
  const nearBottomRef = useRef(true);
  const conversationListRef = useRef<HTMLDivElement>(null);

  const selectedConv = conversations.find((c) => c.id === selectedId);
  const windowOpen = isWindowOpen(selectedConv?.lastInboundAt);
  const currentMessages = selectedId
    ? (allMessages[selectedId] ?? selectedConv?.messages ?? [])
    : [];

  const { input, setInput, showEmoji, setShowEmoji } = useChat([]);
  // mensagem sendo respondida (citação), igual o WhatsApp
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  // arquivos aguardando confirmação no modal de envio (drag&drop / anexo)
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);

  // Fetch conversations from API (q = busca por nome/telefone/conteúdo de msg)
  const fetchConversations = useCallback(async (q?: string) => {
    try {
      const res = await fetch(
        q
          ? `/api/conversations?q=${encodeURIComponent(q)}`
          : "/api/conversations",
      );
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
              lastInboundAt: (c.lastInboundAt as string | null) ?? null,
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
  }, []);

  // Carrega a lista no mount + atualiza a cada 6s
  useEffect(() => {
    const run = () => fetchConversations(searchTerm || undefined);
    // busca com debounce; sem busca carrega na hora. Poll a cada 6s mantém vivo.
    const debounce = setTimeout(run, searchTerm ? 350 : 0);
    const interval = setInterval(run, 6000);
    return () => {
      clearTimeout(debounce);
      clearInterval(interval);
    };
  }, [fetchConversations, searchTerm]);

  // Abre/cria a conversa do lead vindo do pipeline (?leadId=)
  const [leadParamDone, setLeadParamDone] = useState(false);
  /* eslint-disable react-hooks/set-state-in-effect -- abertura assíncrona */
  useEffect(() => {
    if (leadParamDone || loading) return;
    const leadId = new URLSearchParams(window.location.search).get("leadId");
    if (!leadId) return;
    setLeadParamDone(true);
    const existing = conversations.find((c) => c.leadId === leadId);
    if (existing) {
      setSelectedId(existing.id);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/conversations/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId }),
        });
        const d = await res.json();
        if (d.conversationId) {
          await fetchConversations();
          setSelectedId(d.conversationId);
        }
      } catch {
        /* silencioso */
      }
    })();
  }, [leadParamDone, loading, conversations, fetchConversations]);
  /* eslint-enable react-hooks/set-state-in-effect */

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

  // Desce só se o usuário ESTÁ no fim (senão respeita a leitura de msgs antigas).
  useEffect(() => {
    if (nearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentMessages]);

  // Ao TROCAR de conversa, sempre vai pro fim (e reseta o "near bottom").
  useEffect(() => {
    nearBottomRef.current = true;
    messagesEndRef.current?.scrollIntoView();
  }, [selectedId]);

  // Rede de segurança: limpa o overlay de drag se o arraste for cancelado
  // fora da área (ex.: screenshot, soltar fora, sair da janela).
  useEffect(() => {
    const clear = () => setIsDragging(false);
    window.addEventListener("dragend", clear);
    window.addEventListener("drop", clear);
    window.addEventListener("mouseup", clear);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("dragend", clear);
      window.removeEventListener("drop", clear);
      window.removeEventListener("mouseup", clear);
      window.removeEventListener("blur", clear);
    };
  }, []);

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
    const replyTo = replyingTo?.wamid;
    setInput("");
    setShowEmoji(false);
    setReplyingTo(null);
    nearBottomRef.current = true; // ao enviar, desce p/ mostrar sua mensagem
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
        body: JSON.stringify({ conversationId: selectedId, content, replyTo }),
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
  }, [input, selectedId, replyingTo, addMessage, setInput, setShowEmoji]);

  // Envio unificado de arquivo (botão de anexo, imagem, áudio gravado e drag&drop).
  // Valida tipo e tamanho, exibe otimista, envia pela mesma rota e recarrega.
  const uploadFile = useCallback(
    async (file: File, caption?: string) => {
      if (!selectedId) return;
      nearBottomRef.current = true;
      const mime = file.type || "";
      if (!ALLOWED_MIME.test(mime)) {
        alert(
          `Tipo de arquivo não suportado: ${mime || "desconhecido"}. Aceitos: imagem, PDF, Word, Excel, texto, áudio e vídeo do WhatsApp.`,
        );
        return;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        alert(
          `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: ${MAX_FILE_MB}MB.`,
        );
        return;
      }
      const optimisticType: ChatMessage["type"] = mime.startsWith("image/")
        ? "image"
        : mime.startsWith("audio/")
          ? "audio"
          : "document";
      const label = mime.startsWith("image/")
        ? "[Imagem]"
        : mime.startsWith("audio/")
          ? "[Áudio]"
          : mime.startsWith("video/")
            ? "[Vídeo]"
            : `[Arquivo] ${file.name}`;
      addMessage({
        id: `tmp-${Date.now()}-${file.name}`,
        direction: "outbound",
        content: label,
        type: optimisticType,
        status: "sent",
        aiGenerated: false,
        createdAt: now(),
      });
      try {
        const fd = new FormData();
        fd.append("file", file);
        if (caption) fd.append("caption", caption);
        const up = await fetch(`/api/conversations/${selectedId}/media`, {
          method: "POST",
          body: fd,
        });
        const upData = await up.json().catch(() => ({}));
        if (!up.ok || upData?.ok === false) {
          alert(
            "Não consegui enviar este arquivo pelo WhatsApp. Tente novamente.",
          );
        }
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

  const handleFileUpload = useCallback((file: File) => {
    // abre o modal de envio (preview + legenda), em vez de enviar direto
    setPendingFiles([file]);
  }, []);

  // Envia o áudio gravado (Blob) como mídia real pelo WhatsApp
  const handleAudioRecorded = useCallback(
    (blob: Blob) => {
      // Extensão coerente com o mime real gravado (apenas formatos aceitos)
      const ext = blob.type.includes("ogg")
        ? "ogg"
        : blob.type.includes("mp4")
          ? "m4a"
          : blob.type.includes("mpeg")
            ? "mp3"
            : "ogg";
      const audioFile = new File([blob], `audio.${ext}`, {
        type: blob.type || "audio/ogg",
      });
      void uploadFile(audioFile);
    },
    [uploadFile],
  );

  // ── Drag & drop de arquivos na conversa ──
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (!selectedId) return;
      const files = Array.from(e.dataTransfer.files || []);
      if (!files.length) return;
      // abre o modal de envio (preview + legenda + adicionar mais)
      setPendingFiles(files);
    },
    [selectedId],
  );

  // Envia um template aprovado pela conversa selecionada
  const handleSendTemplate = useCallback(
    async (data: {
      templateName: string;
      languageCode: string;
      params: string[];
      preview: string;
    }) => {
      if (!selectedId) return;
      addMessage({
        id: `tmp-${Date.now()}`,
        direction: "outbound",
        content: data.preview,
        type: "text",
        status: "sent",
        aiGenerated: false,
        createdAt: now(),
      });
      try {
        const up = await fetch(`/api/conversations/${selectedId}/template`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const r = await up.json().catch(() => ({}));
        if (!up.ok || r?.ok === false) {
          alert(
            `Não consegui enviar o template${r?.error ? `: ${r.error}` : ""}.`,
          );
        }
        const res = await fetch(`/api/conversations/${selectedId}`);
        if (res.ok) {
          const { conversation } = await res.json();
          setAllMessages((prev) => ({
            ...prev,
            [selectedId]: (conversation.messages || []).map(mapApiMessage),
          }));
        }
      } catch {
        /* otimista exibido */
      }
    },
    [selectedId, addMessage],
  );

  // Cria lead + conversa nova a partir do Atendimento
  async function handleStartConversation() {
    if (!newName.trim() || !newPhone.trim() || creatingConv) return;
    setCreatingConv(true);
    try {
      const res = await fetch("/api/conversations/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: newName, phone: newPhone }),
      });
      const data = await res.json();
      if (!res.ok || !data.conversationId) {
        alert(data.error || "Não foi possível iniciar a conversa.");
        return;
      }
      setNewConvOpen(false);
      setNewName("");
      setNewPhone("");
      // recarrega a lista e abre a conversa nova
      const list = await fetch("/api/conversations").then((r) => r.json());
      const items = (list.conversations || []) as Record<string, unknown>[];
      const mapped: Conversation[] = items.map((c) => {
        const lead = c.lead as Record<string, unknown> | null;
        const msgs = c.messages as Array<Record<string, unknown>> | undefined;
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
          lastMessage: (msgs?.[0]?.content as string) || "",
          lastMessageAt: (c.lastMessageAt ||
            c.updatedAt ||
            new Date().toISOString()) as string,
          lastInboundAt: (c.lastInboundAt as string | null) ?? null,
          unreadCount: (c.unreadCount as number) || 0,
          channel: (c.channel as ConversationChannel) || "whatsapp",
          assignee: (c.assignee as Record<string, unknown>)?.name as
            | string
            | undefined,
          messages: [],
        };
      });
      setConversations(mapped);
      setSelectedId(data.conversationId);
      // abre o seletor de modelos (1º envio a lead novo exige template)
      setTimeout(() => setTemplateOpen(true), 300);
    } catch {
      alert("Falha ao iniciar conversa.");
    } finally {
      setCreatingConv(false);
    }
  }

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    // A busca (nome/telefone/conteúdo de mensagem) é feita no SERVIDOR via ?q=.
    // Aqui só aplicamos o filtro de aba (Todos / Não lidos / Meus).
    const matchesFilter =
      filterTab === "todos" ||
      (filterTab === "nao_lidos" && c.unreadCount > 0) ||
      filterTab === "meus"; // TODO: filter by current user assignment

    return matchesFilter;
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

            <button
              onClick={() => setNewConvOpen(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#25d366] py-2 text-sm font-medium text-white transition-colors hover:bg-[#20bd5a]"
            >
              <Plus className="h-4 w-4" /> Nova conversa
            </button>

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
                          <SLATimer lastInboundAt={conv.lastInboundAt} />
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
            "flex-1 flex flex-col min-w-0 bg-white relative",
            !selectedId && "hidden sm:flex",
          )}
          onDragOver={(e) => {
            // Só ativa para ARQUIVOS sendo arrastados (não texto/screenshot)
            if (selectedConv && e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
              setIsDragging(true);
            }
          }}
          onDragLeave={(e) => {
            // Reseta ao sair do container (ou se o ponteiro saiu da janela)
            if (
              e.currentTarget === e.target ||
              !e.relatedTarget ||
              !(e.currentTarget as Node).contains(e.relatedTarget as Node)
            ) {
              setIsDragging(false);
            }
          }}
          onDrop={handleDrop}
        >
          {isDragging && selectedConv && (
            <div className="absolute inset-2 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-50/90 pointer-events-none">
              <div className="text-center">
                <Upload className="mx-auto mb-2 h-9 w-9 text-emerald-500" />
                <p className="text-sm font-semibold text-emerald-700">
                  Solte os arquivos aqui para enviar
                </p>
                <p className="mt-1 text-xs text-emerald-600">
                  Imagem, PDF, documento, áudio ou vídeo (até {MAX_FILE_MB}MB)
                </p>
              </div>
            </div>
          )}
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
                      <SLATimer lastInboundAt={selectedConv.lastInboundAt} />
                      {selectedConv.phone && (
                        <span className="text-[10px] text-gray-400">
                          {selectedConv.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTemplateOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                    title="Enviar modelo aprovado (template)"
                  >
                    <FileText className="h-4 w-4" />
                    Modelos
                  </button>
                  {selectedConv.phone && (
                    <a
                      href={`tel:${selectedConv.phone}`}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      title="Ligar (telefone) — chamada de voz no WhatsApp ainda não disponível"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  )}
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
              <div
                ref={messagesBoxRef}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  // "no fim" = a menos de 120px do final
                  nearBottomRef.current =
                    el.scrollHeight - el.scrollTop - el.clientHeight < 120;
                }}
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50"
              >
                {currentMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center px-6">
                    <MessageCircle className="h-12 w-12 text-gray-200 mb-3" />
                    <p className="text-sm font-medium text-gray-500">
                      Você ainda não iniciou nenhuma conversa com este contato.
                    </p>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs">
                      Para iniciar, use o botão de <b>Modelos</b> abaixo (o
                      primeiro contato no WhatsApp exige um modelo aprovado pela
                      regra das 24h).
                    </p>
                    <button
                      onClick={() => setTemplateOpen(true)}
                      className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                    >
                      Iniciar conversa com modelo
                    </button>
                  </div>
                )}
                {currentMessages.map((msg, i) => {
                  const label = dayLabel(msg.sentAt);
                  const showSep =
                    !!label &&
                    label !== dayLabel(currentMessages[i - 1]?.sentAt);
                  return (
                    <Fragment key={msg.id}>
                      {showSep && (
                        <div className="my-2 flex justify-center">
                          <span className="rounded-full bg-gray-200/80 px-3 py-0.5 text-[11px] font-medium text-gray-600">
                            {label}
                          </span>
                        </div>
                      )}
                      <ChatMessageBubble
                        direction={msg.direction}
                        content={msg.content}
                        timestamp={msg.createdAt}
                        status={msg.status}
                        aiGenerated={msg.aiGenerated}
                        senderName={msg.sender}
                        type={msg.type}
                        mediaId={msg.mediaId}
                        errorReason={msg.errorReason}
                        onReply={
                          msg.wamid ? () => setReplyingTo(msg) : undefined
                        }
                      />
                    </Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input — janela aberta: texto livre; fechada: só modelo (regra 24h Meta) */}
              {windowOpen ? (
                <div>
                  {replyingTo && (
                    <div className="mx-3 mb-1 flex items-start gap-2 rounded-lg border-l-4 border-emerald-500 bg-gray-50 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-emerald-700">
                          Respondendo{" "}
                          {replyingTo.direction === "inbound"
                            ? "ao cliente"
                            : "à sua mensagem"}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {replyingTo.content}
                        </p>
                      </div>
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <ChatInput
                    value={input}
                    onChange={setInput}
                    onSend={handleSend}
                    onFileUpload={handleFileUpload}
                    onAudioRecorded={handleAudioRecorded}
                    showEmoji={showEmoji}
                    onToggleEmoji={() => setShowEmoji(!showEmoji)}
                  />
                </div>
              ) : (
                <div className="border-t border-gray-200 bg-gray-50/60 px-6 py-5 text-center">
                  <p className="mx-auto max-w-md text-sm text-gray-600">
                    A conversa com este contato está{" "}
                    <b>fora da janela de 24h</b> da Meta. Você só pode enviar
                    mensagens usando <b>modelos aprovados</b>.
                  </p>
                  <button
                    onClick={() => setTemplateOpen(true)}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500"
                  >
                    <FileText className="h-4 w-4" />
                    Selecionar modelo de mensagem
                  </button>
                </div>
              )}
              <TemplatePicker
                open={templateOpen}
                onClose={() => setTemplateOpen(false)}
                onSend={handleSendTemplate}
              />
              {pendingFiles && pendingFiles.length > 0 && (
                <FileUploadModal
                  initialFiles={pendingFiles}
                  onClose={() => setPendingFiles(null)}
                  onSend={async (files, caption) => {
                    // legenda vai no 1º arquivo (WhatsApp: caption por mídia)
                    for (let i = 0; i < files.length; i++) {
                      await uploadFile(files[i], i === 0 ? caption : undefined);
                    }
                  }}
                />
              )}
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

      {/* Modal: Nova conversa */}
      {newConvOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setNewConvOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-sm font-bold text-gray-900">
              Nova conversa
            </h3>
            <label className="text-xs text-gray-500">Nome</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome do contato"
              className="mt-1 mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
            />
            <label className="text-xs text-gray-500">
              WhatsApp (com DDD e país)
            </label>
            <input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="Ex.: 5511999998888"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
            />
            <p className="mt-2 text-[11px] text-gray-400">
              A 1ª mensagem a um contato novo é enviada por <b>modelo</b> (regra
              de 24h do WhatsApp). O seletor de Modelos abre em seguida.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setNewConvOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleStartConversation}
                disabled={creatingConv || !newName.trim() || !newPhone.trim()}
                className="rounded-lg bg-[#25d366] px-4 py-2 text-sm font-medium text-white hover:bg-[#20bd5a] disabled:opacity-50"
              >
                {creatingConv ? "Criando..." : "Iniciar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
