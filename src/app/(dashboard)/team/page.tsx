"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Plus,
  Mail,
  Phone,
  MoreHorizontal,
  Shield,
  ShieldCheck,
  UserCog,
  TrendingUp,
  Target,
  MessageSquare,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "admin" | "gestor" | "supervisor" | "operador";
  avatar?: string;
  isActive: boolean;
  stats: { leads: number; conversions: number; rate: number; messages: number };
};

const roleConfig: Record<
  string,
  { label: string; icon: typeof ShieldCheck; color: string; bg: string }
> = {
  admin: {
    label: "Admin",
    icon: ShieldCheck,
    color: "text-rose-400",
    bg: "bg-rose-400/10",
  },
  gestor: {
    label: "Gestor",
    icon: Shield,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  supervisor: {
    label: "Supervisor",
    icon: UserCog,
    color: "text-sky-400",
    bg: "bg-sky-400/10",
  },
  operador: {
    label: "Operador",
    icon: UserCog,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    async function loadTeam() {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          const users = data.users || data;
          if (Array.isArray(users)) {
            setMembers(
              users.map((u: Record<string, unknown>) => ({
                id: u.id as string,
                name: u.name as string,
                email: u.email as string,
                phone: (u.phone as string) || "",
                role:
                  (u.role as string as
                    | "admin"
                    | "gestor"
                    | "supervisor"
                    | "operador") || "operador",
                isActive: (u.isActive as boolean) ?? true,
                stats: { leads: 0, conversions: 0, rate: 0, messages: 0 },
              })),
            );
          }
        }
      } catch {
        // API unavailable — keep empty state
      } finally {
        setLoading(false);
      }
    }
    loadTeam();
  }, []);

  const handleAddMember = (member: TeamMember) => {
    setMembers((prev) => [...prev, member]);
    setShowAddMember(false);
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            Equipe
          </h1>
          <p className="text-gray-500 mt-1">
            {members.length} membros ·{" "}
            {members.filter((m) => m.isActive).length} ativos
          </p>
        </div>
        <button
          onClick={() => setShowAddMember(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar Membro
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Membros",
            value: members.length,
            icon: Users,
            color: "text-indigo-400",
          },
          {
            label: "Leads Atribuídos",
            value: members.reduce((s, m) => s + m.stats.leads, 0),
            icon: Target,
            color: "text-emerald-400",
          },
          {
            label: "Total Conversões",
            value: members.reduce((s, m) => s + m.stats.conversions, 0),
            icon: TrendingUp,
            color: "text-violet-400",
          },
          {
            label: "Mensagens Enviadas",
            value: members.reduce((s, m) => s + m.stats.messages, 0),
            icon: MessageSquare,
            color: "text-amber-400",
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white border border-gray-200 rounded-2xl p-5"
          >
            <stat.icon className={cn("w-5 h-5 mb-3", stat.color)} />
            <p className="text-2xl font-bold text-gray-900">
              {stat.value.toLocaleString("pt-BR")}
            </p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
        </div>
      )}

      {!loading && members.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="w-12 h-12 text-gray-300 mb-3" />
          <h3 className="text-base font-semibold text-gray-800">
            Nenhum membro encontrado
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Adicione membros para comecar a gerenciar sua equipe
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {members.map((member, i) => {
          const role = roleConfig[member.role] || roleConfig.operador;
          const RoleIcon = role.icon;

          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group bg-white border border-gray-200 rounded-2xl p-6 hover:bg-gray-50 hover:border-gray-200 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center relative">
                    <span className="text-sm font-bold text-gray-900">
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </span>
                    <div
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white",
                        member.isActive ? "bg-emerald-500" : "bg-gray-400",
                      )}
                    />
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium">{member.name}</p>
                    <div
                      className={cn(
                        "flex items-center gap-1 text-xs",
                        role.color,
                      )}
                    >
                      <RoleIcon className="w-3 h-3" />
                      {role.label}
                    </div>
                  </div>
                </div>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="w-4 h-4 text-gray-400 hover:text-gray-900" />
                </button>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate">{member.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone className="w-3.5 h-3.5" />
                  {member.phone}
                </div>
              </div>

              {member.role !== "admin" && (
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-400">Leads</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {member.stats.leads}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Conversões</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {member.stats.conversions}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Taxa</p>
                    <p className="text-lg font-semibold text-emerald-400">
                      {member.stats.rate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Mensagens</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {member.stats.messages}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Success Toast */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 shadow-lg"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-medium text-emerald-700">
              Membro adicionado com sucesso!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Member Modal */}
      <AnimatePresence>
        {showAddMember && (
          <AddMemberModal
            onClose={() => setShowAddMember(false)}
            onSave={handleAddMember}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Add Member Modal ──────────────────────────────────────────────────────

function AddMemberModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (member: TeamMember) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "operador" as "admin" | "gestor" | "supervisor" | "operador",
  });

  const handleChange = (field: string, val: string) => {
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.email.trim()) return;
    const member: TeamMember = {
      id: `m-${Date.now()}`,
      name: form.name,
      email: form.email,
      phone: form.phone || "",
      role: form.role,
      isActive: true,
      stats: { leads: 0, conversions: 0, rate: 0, messages: 0 },
    };
    onSave(member);
  };

  const inputClass =
    "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-colors";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Adicionar Membro
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-2">
              Nome completo *
            </label>
            <input
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Nome do membro"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-2">E-mail *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="email@empresa.com"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-2">Telefone</label>
            <input
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="+55 11 99999-9999"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-2">Funcao</label>
            <select
              value={form.role}
              onChange={(e) => handleChange("role", e.target.value)}
              className={inputClass}
            >
              <option value="admin">Admin</option>
              <option value="gestor">Gestor</option>
              <option value="supervisor">Supervisor</option>
              <option value="operador">Operador</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.name.trim() || !form.email.trim()}
            className={cn(
              "px-5 py-2.5 text-white text-sm font-medium rounded-xl transition-colors",
              form.name.trim() && form.email.trim()
                ? "bg-indigo-600 hover:bg-indigo-500"
                : "bg-gray-300 cursor-not-allowed",
            )}
          >
            Adicionar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
