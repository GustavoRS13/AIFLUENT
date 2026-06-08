import crypto from "crypto";

/**
 * Cliente do Meta Graph API (Facebook Lead Ads).
 * OAuth, listagem de páginas/formulários, busca de lead e validação de webhook.
 * Tudo gated por META_APP_ID/META_APP_SECRET — sem credenciais, isMetaConfigured()=false.
 */
const GRAPH = "https://graph.facebook.com/v21.0";

export const metaConfig = {
  appId: process.env.META_APP_ID || "",
  appSecret: process.env.META_APP_SECRET || "",
  verifyToken: process.env.META_VERIFY_TOKEN || "",
  redirectUri: process.env.META_REDIRECT_URI || "",
  // "Facebook Login for Business" usa config_id (Configuração) em vez de scope.
  configId: process.env.META_CONFIG_ID || "",
};

export function isMetaConfigured(): boolean {
  return !!(metaConfig.appId && metaConfig.appSecret);
}

function proof(token: string): string {
  return crypto
    .createHmac("sha256", metaConfig.appSecret)
    .update(token)
    .digest("hex");
}

// Assina o orgId no parâmetro state do OAuth (anti-CSRF).
export function signState(orgId: string): string {
  const sig = crypto
    .createHmac("sha256", metaConfig.appSecret)
    .update(orgId)
    .digest("hex")
    .slice(0, 16);
  return `${orgId}.${sig}`;
}
export function verifyState(state: string): string | null {
  const [orgId, sig] = (state || "").split(".");
  if (!orgId || !sig) return null;
  return signState(orgId).endsWith(sig) ? orgId : null;
}

export function getAuthUrl(state: string, redirectUri: string): string {
  const params: Record<string, string> = {
    client_id: metaConfig.appId,
    redirect_uri: redirectUri,
    state,
    response_type: "code",
  };
  if (metaConfig.configId) {
    // Facebook Login for Business: permissões vêm da Configuração (config_id).
    params.config_id = metaConfig.configId;
  } else {
    // Facebook Login clássico: permissões via scope.
    params.scope = [
      "leads_retrieval",
      "pages_show_list",
      "pages_manage_metadata",
      "pages_read_engagement",
    ].join(",");
  }
  const p = new URLSearchParams(params);
  return `https://www.facebook.com/v21.0/dialog/oauth?${p.toString()}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function graphGet(
  path: string,
  token: string,
  params: Record<string, string> = {},
): Promise<any> {
  const p = new URLSearchParams({
    access_token: token,
    appsecret_proof: proof(token),
    ...params,
  });
  const res = await fetch(`${GRAPH}/${path}?${p.toString()}`);
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Graph error ${res.status}`);
  }
  return data;
}

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
): Promise<{ accessToken: string; expiresIn?: number }> {
  const p = new URLSearchParams({
    client_id: metaConfig.appId,
    client_secret: metaConfig.appSecret,
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(`${GRAPH}/oauth/access_token?${p.toString()}`);
  const data = await res.json();
  if (!res.ok || data.error)
    throw new Error(data.error?.message || "Falha no OAuth");
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

export async function getLongLivedToken(
  shortToken: string,
): Promise<{ accessToken: string; expiresIn?: number }> {
  const p = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: metaConfig.appId,
    client_secret: metaConfig.appSecret,
    fb_exchange_token: shortToken,
  });
  const res = await fetch(`${GRAPH}/oauth/access_token?${p.toString()}`);
  const data = await res.json();
  if (!res.ok || data.error)
    throw new Error(
      data.error?.message || "Falha ao obter token de longa duracao",
    );
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

export interface MetaPage {
  id: string;
  name: string;
  accessToken: string;
}
export async function getPages(userToken: string): Promise<MetaPage[]> {
  const data = await graphGet("me/accounts", userToken, {
    fields: "id,name,access_token",
    limit: "100",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    accessToken: p.access_token,
  }));
}

export interface MetaForm {
  id: string;
  name: string;
  status?: string;
}
export async function getLeadForms(
  pageId: string,
  pageToken: string,
): Promise<MetaForm[]> {
  const data = await graphGet(`${pageId}/leadgen_forms`, pageToken, {
    fields: "id,name,status",
    limit: "200",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.data || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    status: f.status,
  }));
}

export interface MetaLeadData {
  fieldData: Record<string, string>;
  campaignId?: string;
  campaignName?: string;
  adsetId?: string;
  adsetName?: string;
  adId?: string;
  adName?: string;
  formId?: string;
  createdTime?: string;
}
export async function getLead(
  leadgenId: string,
  pageToken: string,
): Promise<MetaLeadData> {
  const data = await graphGet(leadgenId, pageToken, {
    fields:
      "id,created_time,field_data,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,form_id",
  });
  const fieldData: Record<string, string> = {};
  for (const f of data.field_data || []) {
    fieldData[(f.name || "").toLowerCase()] = Array.isArray(f.values)
      ? f.values[0]
      : f.values;
  }
  return {
    fieldData,
    campaignId: data.campaign_id,
    campaignName: data.campaign_name,
    adsetId: data.adset_id,
    adsetName: data.adset_name,
    adId: data.ad_id,
    adName: data.ad_name,
    formId: data.form_id,
    createdTime: data.created_time,
  };
}

export function verifyMetaSignature(
  rawBody: string,
  header: string | null,
): boolean {
  if (!metaConfig.appSecret || !header) return false;
  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", metaConfig.appSecret)
      .update(rawBody, "utf8")
      .digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Mapeia o field_data do Meta para os campos de contato do ingestLead.
export function leadDataToContact(fieldData: Record<string, string>): {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
} {
  const fullName = fieldData["full_name"] || fieldData["name"] || "";
  const first =
    fieldData["first_name"] || fullName.split(" ")[0] || "Lead Meta";
  const last =
    fieldData["last_name"] ||
    fullName.split(" ").slice(1).join(" ") ||
    undefined;
  const phone = fieldData["phone_number"] || fieldData["phone"] || undefined;
  return {
    firstName: first,
    lastName: last,
    email: fieldData["email"] || undefined,
    phone,
    whatsapp: phone,
  };
}
