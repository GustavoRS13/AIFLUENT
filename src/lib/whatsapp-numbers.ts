import { WhatsAppService, whatsapp } from "./whatsapp";
import type { PrismaClient } from "@/generated/prisma/client";

// Multi-número: cada número de WhatsApp da org fica numa Integration
// (type="whatsapp", config JSON com phoneNumberId + displayPhone + displayName +
// accessToken/businessAccountId p/ os NÃO-padrão). O número PADRÃO (env, ex.:
// 94742) usa o singleton `whatsapp` — comportamento intocado.

export interface WaNumber {
  phoneNumberId: string;
  displayPhone: string;
  displayName: string;
  isDefault: boolean;
}

interface WaConfig {
  phoneNumberId?: string;
  displayPhone?: string;
  displayName?: string;
  accessToken?: string;
  businessAccountId?: string;
  isDefault?: boolean;
}

function parse(config: string | null): WaConfig | null {
  if (!config) return null;
  try {
    return JSON.parse(config) as WaConfig;
  } catch {
    return null;
  }
}

// Lista os números de WhatsApp da org (pra o seletor do Atendimento).
export async function listWhatsappNumbers(
  prisma: PrismaClient,
  orgId: string,
): Promise<WaNumber[]> {
  const rows = await prisma.integration.findMany({
    where: { organizationId: orgId, type: "whatsapp", isActive: true },
    select: { config: true },
  });
  const nums: WaNumber[] = [];
  for (const r of rows) {
    const c = parse(r.config);
    if (c?.phoneNumberId) {
      nums.push({
        phoneNumberId: String(c.phoneNumberId),
        displayPhone: c.displayPhone || "",
        displayName: c.displayName || c.displayPhone || "Número",
        isDefault: !!c.isDefault,
      });
    }
  }
  return nums;
}

// O número é NOSSO? (padrão env OU registrado numa Integration). Usado pelo
// webhook: a WABA pode ter números de terceiros — só processamos os nossos.
export async function isKnownWhatsappNumber(
  prisma: PrismaClient,
  phoneNumberId?: string | null,
): Promise<boolean> {
  if (!phoneNumberId) return true;
  if (phoneNumberId === (process.env.WHATSAPP_PHONE_NUMBER_ID || ""))
    return true;
  const found = await prisma.integration.findFirst({
    where: {
      type: "whatsapp",
      isActive: true,
      config: { contains: phoneNumberId },
    },
    select: { id: true },
  });
  return !!found;
}

// Serviço de WhatsApp para ENVIAR pelo número certo. Número padrão/env ou
// desconhecido → singleton (env, intocado). Número não-padrão → credencial dele.
export async function whatsappFor(
  prisma: PrismaClient,
  orgId: string,
  phoneNumberId?: string | null,
): Promise<WhatsAppService> {
  const envId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  if (!phoneNumberId || phoneNumberId === envId) return whatsapp;
  const rows = await prisma.integration.findMany({
    where: { organizationId: orgId, type: "whatsapp", isActive: true },
    select: { config: true },
  });
  for (const r of rows) {
    const c = parse(r.config);
    if (c && String(c.phoneNumberId) === phoneNumberId && c.accessToken) {
      return new WhatsAppService({
        phoneNumberId: String(c.phoneNumberId),
        accessToken: String(c.accessToken),
        businessAccountId: String(c.businessAccountId || ""),
      });
    }
  }
  return whatsapp; // fallback seguro: nunca fica sem serviço
}
