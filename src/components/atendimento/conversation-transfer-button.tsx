"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRightLeft, Loader2, Check, User, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Dept {
  id: string;
  name: string;
  color: string;
}
interface Member {
  id: string;
  name: string;
  role?: string;
}
type Selected = { kind: "user" | "dept"; id: string; name: string } | null;

interface Props {
  conversationId: string;
  currentTeamId?: string | null;
  onTransferred?: () => void;
}

export function ConversationTransferButton({
  conversationId,
  onTransferred,
}: Props) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Selected>(null);
  const [transferring, setTransferring] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [u, d] = await Promise.all([
        fetch("/api/users")
          .then((r) => r.json())
          .catch(() => null),
        fetch("/api/departments")
          .then((r) => r.json())
          .catch(() => null),
      ]);
      const uArr = (u?.users || u || []) as Member[];
      setUsers(Array.isArray(uArr) ? uArr.filter((x) => x?.id && x?.name) : []);
      const dArr = (d?.departments || d || []) as Dept[];
      setDepartments(Array.isArray(dArr) ? dArr : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchAll();
  }, [open, fetchAll]);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSelected(null);
      }
    }
    if (open) {
      document.addEventListener("mousedown", onOutside);
      return () => document.removeEventListener("mousedown", onOutside);
    }
  }, [open]);

  async function handleTransfer() {
    if (!selected) return;
    setTransferring(true);
    try {
      const res =
        selected.kind === "user"
          ? await fetch(`/api/conversations/${conversationId}/assign`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: selected.id }),
            })
          : await fetch("/api/transfers", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                entityType: "conversation",
                entityId: conversationId,
                toTeamId: selected.id,
              }),
            });
      if (res.ok) {
        toast.success(`Conversa transferida para ${selected.name}`);
        setOpen(false);
        setSelected(null);
        onTransferred?.();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Erro ao transferir");
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setTransferring(false);
    }
  }

  const roleLabel: Record<string, string> = {
    admin: "Admin",
    gestor: "Gestor",
    supervisor: "Supervisor",
    operador: "Operador",
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "p-2 rounded-lg transition-colors",
          open
            ? "text-sky-500 bg-sky-50"
            : "text-gray-400 hover:text-gray-600 hover:bg-gray-50",
        )}
        title="Transferir conversa"
      >
        <ArrowRightLeft className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-lg space-y-2"
          >
            <p className="text-xs font-semibold text-gray-900">
              Transferir conversa
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
              </div>
            ) : (
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {/* Pessoas */}
                {users.length > 0 && (
                  <p className="flex items-center gap-1 px-1 pt-1 text-[10px] font-semibold uppercase text-gray-400">
                    <User className="h-3 w-3" /> Pessoas
                  </p>
                )}
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() =>
                      setSelected({ kind: "user", id: u.id, name: u.name })
                    }
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-left transition-colors",
                      selected?.kind === "user" && selected.id === u.id
                        ? "bg-sky-100 text-sky-700"
                        : "text-gray-700 hover:bg-gray-50",
                    )}
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[9px] font-bold text-sky-700">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate">{u.name}</span>
                    {u.role && (
                      <span className="ml-auto text-[9px] text-gray-400">
                        {roleLabel[u.role] || u.role}
                      </span>
                    )}
                    {selected?.kind === "user" && selected.id === u.id && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-sky-600" />
                    )}
                  </button>
                ))}

                {/* Departamentos */}
                {departments.length > 0 && (
                  <p className="flex items-center gap-1 px-1 pt-2 text-[10px] font-semibold uppercase text-gray-400">
                    <Users className="h-3 w-3" /> Departamentos
                  </p>
                )}
                {departments.map((d) => (
                  <button
                    key={d.id}
                    onClick={() =>
                      setSelected({ kind: "dept", id: d.id, name: d.name })
                    }
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-left transition-colors",
                      selected?.kind === "dept" && selected.id === d.id
                        ? "bg-sky-100 text-sky-700"
                        : "text-gray-700 hover:bg-gray-50",
                    )}
                  >
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: d.color || "#6366f1" }}
                    />
                    <span className="truncate">{d.name}</span>
                    {selected?.kind === "dept" && selected.id === d.id && (
                      <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-sky-600" />
                    )}
                  </button>
                ))}

                {users.length === 0 && departments.length === 0 && (
                  <p className="py-2 text-center text-xs text-gray-400">
                    Nenhum destino disponível
                  </p>
                )}
              </div>
            )}

            {selected && (
              <button
                onClick={handleTransfer}
                disabled={transferring}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-sky-600 disabled:opacity-50"
              >
                {transferring ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                )}
                Transferir para {selected.name}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
