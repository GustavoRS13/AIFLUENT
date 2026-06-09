"use client";

import { useState, useEffect } from "react";
import { User, Mail, Shield, Phone, Loader2, KeyRound } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  supervisor: "Supervisor",
  operador: "Operador",
};

interface Me {
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  organization?: { name: string } | null;
}

export default function PerfilPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- carregamento inicial */
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setMe(d.user);
          setName(d.user.name || "");
          setPhone(d.user.phone || "");
        }
      })
      .finally(() => setLoading(false));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function saveProfile() {
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const d = await res.json();
      setProfileMsg(res.ok ? "Perfil atualizado!" : d.error || "Falha");
    } catch {
      setProfileMsg("Falha ao salvar");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    setSavingPwd(true);
    setPwdMsg(null);
    try {
      const res = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: curPwd, newPassword: newPwd }),
      });
      const d = await res.json();
      if (res.ok) {
        setPwdMsg("Senha alterada com sucesso!");
        setCurPwd("");
        setNewPwd("");
      } else {
        setPwdMsg(d.error || "Falha");
      }
    } catch {
      setPwdMsg("Falha ao trocar senha");
    } finally {
      setSavingPwd(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!me) return <p className="text-gray-500">Não foi possível carregar.</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meu perfil</h1>
        <p className="text-gray-500">Gerencie seus dados e senha.</p>
      </div>

      {/* Cabeçalho */}
      <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-500 text-xl font-bold text-white">
          {(me.name?.[0] || "U").toUpperCase()}
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">{me.name}</p>
          <span className="inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600">
            {ROLE_LABEL[me.role] || me.role}
          </span>
          {me.organization?.name && (
            <p className="mt-1 text-xs text-gray-400">{me.organization.name}</p>
          )}
        </div>
      </div>

      {/* Dados */}
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <User className="h-4 w-4" /> Dados
        </h2>
        <div>
          <label className="text-xs text-gray-500">Nome</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="flex items-center gap-1 text-xs text-gray-500">
            <Mail className="h-3 w-3" /> E-mail (não editável)
          </label>
          <input
            value={me.email}
            disabled
            className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
          />
        </div>
        <div>
          <label className="flex items-center gap-1 text-xs text-gray-500">
            <Phone className="h-3 w-3" /> Telefone
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(11) 99999-9999"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={saveProfile}
            disabled={savingProfile}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {savingProfile ? "Salvando..." : "Salvar"}
          </button>
          {profileMsg && (
            <span className="text-sm text-gray-600">{profileMsg}</span>
          )}
        </div>
      </div>

      {/* Senha */}
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <KeyRound className="h-4 w-4" /> Trocar senha
        </h2>
        <div>
          <label className="text-xs text-gray-500">Senha atual</label>
          <input
            type="password"
            value={curPwd}
            onChange={(e) => setCurPwd(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">
            Nova senha (mín. 8 caracteres)
          </label>
          <input
            type="password"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={changePassword}
            disabled={savingPwd || !curPwd || newPwd.length < 8}
            className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            <Shield className="h-4 w-4" />
            {savingPwd ? "Alterando..." : "Alterar senha"}
          </button>
          {pwdMsg && <span className="text-sm text-gray-600">{pwdMsg}</span>}
        </div>
      </div>
    </div>
  );
}
