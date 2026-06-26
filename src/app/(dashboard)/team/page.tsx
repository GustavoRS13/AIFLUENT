"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Plus,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  UserCog,
  TrendingUp,
  Target,
  MessageSquare,
  X,
  KeyRound,
  Copy,
  Loader2,
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
  scopeGroup?: string | null;
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
  const [manageUser, setManageUser] = useState<TeamMember | null>(null);

  const loadTeam = useCallback(async () => {
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
              scopeGroup: (u.scopeGroup as string | null) ?? null,
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
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- loadTeam é assíncrono (setState após await) */
  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleMemberCreated = () => {
    setShowAddMember(false);
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 3000);
    loadTeam();
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
                <button
                  onClick={() => setManageUser(member)}
                  title="Gerenciar acesso"
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  <UserCog className="h-3.5 w-3.5" /> Acesso
                </button>
              </div>
              {member.scopeGroup && (
                <p className="mb-3 inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600">
                  Escopo: {member.scopeGroup}
                </p>
              )}

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
            onSave={handleMemberCreated}
          />
        )}
      </AnimatePresence>

      {/* Gerenciar acesso (ADM) */}
      <AnimatePresence>
        {manageUser && (
          <ManageAccessModal
            user={manageUser}
            onClose={() => setManageUser(null)}
            onSaved={() => {
              setManageUser(null);
              loadTeam();
            }}
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
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "operador" as "admin" | "gestor" | "supervisor" | "operador",
  });
  const [sendWelcome, setSendWelcome] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field: string, val: string) => {
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const canSubmit =
    !!form.name.trim() &&
    !!form.email.trim() &&
    form.password.trim().length >= 6 &&
    !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    const email = form.email.trim().toLowerCase();
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email,
          phone: form.phone.trim() || undefined,
          password: form.password,
          role: form.role,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          (data as { error?: string }).error || "Falha ao criar usuario",
        );
        setLoading(false);
        return;
      }
      // Estrutura de convite: e-mail de boas-vindas (sem expor a senha)
      if (sendWelcome) {
        try {
          const origin =
            typeof window !== "undefined" ? window.location.origin : "";
          await fetch("/api/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: email,
              subject: "Bem-vindo(a) ao AIFLUENT CRM",
              text: `Ola ${form.name.trim()}, sua conta no AIFLUENT CRM foi criada. Acesse ${origin}/login com o e-mail ${email}.`,
            }),
          });
        } catch {
          /* convite e best-effort */
        }
      }
      onSave();
    } catch {
      setError("Erro de conexao");
      setLoading(false);
    }
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
          <div>
            <label className="block text-sm text-gray-500 mb-2">
              Senha provisoria *
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              placeholder="Minimo 6 caracteres"
              className={inputClass}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={sendWelcome}
              onChange={(e) => setSendWelcome(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Enviar e-mail de boas-vindas
          </label>
          {error && <p className="text-sm text-red-500">{error}</p>}
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
            disabled={!canSubmit}
            className={cn(
              "px-5 py-2.5 text-white text-sm font-medium rounded-xl transition-colors",
              canSubmit
                ? "bg-indigo-600 hover:bg-indigo-500"
                : "bg-gray-300 cursor-not-allowed",
            )}
          >
            {loading ? "Criando..." : "Adicionar"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Gerenciar acesso (ADM master) ─────────────────────────────────────────
// Resetar senha, mudar papel, escopo de grupo e ativar/desativar.

function ManageAccessModal({
  user,
  onClose,
  onSaved,
}: {
  user: TeamMember;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [role, setRole] = useState(user.role);
  const [scopeGroup, setScopeGroup] = useState(user.scopeGroup || "");
  const [isActive, setIsActive] = useState(user.isActive);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");

  const genPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let p = "";
    for (let i = 0; i < 10; i++)
      p += chars[Math.floor(Math.random() * chars.length)];
    setNewPassword(p + "@1");
  };

  const save = async () => {
    setSaving(true);
    setErr("");
    const payload: Record<string, unknown> = {
      role,
      isActive,
      scopeGroup, // "" limpa o escopo
    };
    if (newPassword.trim()) {
      if (newPassword.trim().length < 6) {
        setErr("A senha deve ter no mínimo 6 caracteres.");
        setSaving(false);
        return;
      }
      payload.password = newPassword.trim();
    }
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setErr(e.error || "Falha ao salvar (precisa ser ADM).");
        setSaving(false);
        return;
      }
      onSaved();
    } catch {
      setErr("Erro de conexão.");
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Gerenciar acesso
            </h3>
            <p className="text-xs text-gray-500">
              {user.name} · {user.email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Reset de senha */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Nova senha (deixe em branco para não alterar)
            </label>
            <div className="flex gap-2">
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              />
              <button
                onClick={genPassword}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                <KeyRound className="h-3.5 w-3.5" /> Gerar
              </button>
              {newPassword && (
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(newPassword);
                    setCopied(true);
                  }}
                  className="flex items-center rounded-lg border border-gray-200 px-2 text-xs text-gray-600 hover:bg-gray-50"
                  title="Copiar"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {copied && (
              <p className="mt-1 text-[11px] text-emerald-600">
                Senha copiada — envie ao usuário.
              </p>
            )}
          </div>

          {/* Papel */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Papel
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as TeamMember["role"])}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            >
              <option value="admin">Admin</option>
              <option value="gestor">Gestor</option>
              <option value="supervisor">Supervisor</option>
              <option value="operador">Operador</option>
            </select>
          </div>

          {/* Escopo de grupo */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Escopo de grupo (opcional — restringe a um grupo de funis)
            </label>
            <input
              value={scopeGroup}
              onChange={(e) => setScopeGroup(e.target.value)}
              placeholder="ex.: B2B - Alumni by better (vazio = vê tudo)"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>

          {/* Ativo */}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Acesso ativo (desmarcar bloqueia o login)
          </label>

          {err && <p className="text-xs text-rose-600">{err}</p>}

          <button
            onClick={save}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Salvar acesso"
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
