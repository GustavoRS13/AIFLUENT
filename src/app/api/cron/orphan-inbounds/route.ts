import { NextRequest, NextResponse } from "next/server";
import {
  OPTOUT_TAGS,
  STOP_TAG,
  DO_NOT_CONTACT_STAGE_PATTERNS,
} from "@/lib/lead-optout";
import { notifyOrgAdmins } from "@/lib/notifications";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── Alerta: INTERESSADOS aguardando resposta (sem atendente) ─────────────────
// O vazamento real não é disparo — é RESPOSTA. Este cron acha quem NOS ESCREVEU
// e ficou sem resposta (a última mensagem da conversa é do cliente, há mais de
// GRACE_MIN e há menos de 7 dias), tira bot/RH/auto-reply/opt-out/reclamação, e
// NOTIFICA os admins da org (in-app). Ele NÃO envia nada — quem responde é o
// humano (ou o /api/cron/reply com texto aprovado). Regra de ouro: mostrar antes.
//
// Destaca quem ainda está DENTRO da janela de 24h da Meta (dá pra responder em
// texto livre, sem template) — esses são os urgentes.
//
// GET /api/cron/orphan-inbounds   (Authorization: Bearer <CRON_SECRET>)
//   ?dry=1  → só retorna a lista, NÃO cria notificação
//   ?grace=<min> → janela de tolerância (default 20 min)

const GRACE_MIN_DEFAULT = 20;
const LIST_LIMIT = 50;

// Última fala do cliente que NÃO merece alerta: auto-reply, RH, recusa clara,
// opt-out, reclamação/cancelamento, ou agradecimento curto de encerramento.
const BAD_LAST = `
  txt ~ '^(n[ãa]o|nops|nn)( |,|$|\\.)|n[ãa]o obrigad|n[ãa]o quero|n[ãa]o tenho interesse|n[ãa]o vou|n[ãa]o precisa|sem interesse|desisti|por engano|prefiro n[ãa]o|out of office|currently out|agradecemos sua mensagem|irei responder|sou a .* do rh|reembols|estorn|devolv|procon|advogad|golpe|👎|😡|cancelei|cancelament|quero cancelar|descadastr|sair da lista|parar de receber|stop'
  OR (length(trim(txt)) < 14 AND txt ~ '^(obrigad|valeu|tudo certo|blz|beleza|ok|👍|entendi|certo|isso|joia|jóia)')
`;

function tagStageExclusions(): string {
  const tags = OPTOUT_TAGS.concat([STOP_TAG])
    .map((t) => `'${t.replace(/'/g, "''")}'`)
    .join(",");
  const stageLike = DO_NOT_CONTACT_STAGE_PATTERNS.map(
    (p) => `lower(s.name) LIKE '%${p.replace(/'/g, "''")}%'`,
  ).join(" OR ");
  return `
    NOT EXISTS (SELECT 1 FROM "PipelineStage" s WHERE s.id=l."stageId"
      AND (${stageLike}))
    AND NOT EXISTS (SELECT 1 FROM "LeadTag" lt JOIN "Tag" t ON t.id=lt."tagId"
      WHERE lt."leadId"=l.id AND t.name IN (${tags}))`;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dry = url.searchParams.get("dry") === "1";
  const grace = Number(url.searchParams.get("grace")) || GRACE_MIN_DEFAULT;

  const { prisma } = await import("@/lib/prisma");
  const org = await prisma.organization.findFirst({ select: { id: true } });
  if (!org) {
    return NextResponse.json({ error: "org não encontrada" }, { status: 500 });
  }

  try {
    // Conversas cuja ÚLTIMA mensagem é do cliente (esperando), fora do carência,
    // dentro de 7 dias, tirando bot/RH/opt-out/reclamação. `in_window` marca quem
    // ainda dá pra responder em texto livre (< 24h).
    const sql = `
  WITH lastmsg AS (
    SELECT DISTINCT ON (m."conversationId")
      m."conversationId" cid, m.direction dir, m."createdAt" at, lower(m.content) txt
    FROM "ConversationMessage" m
    ORDER BY m."conversationId", m."createdAt" DESC
  )
  SELECT c.id cid, l.id lid,
    trim(l."firstName" || ' ' || coalesce(l."lastName", '')) AS name,
    lm.at AS waiting_since,
    (lm.at > now() - interval '24 hours') AS in_window
  FROM lastmsg lm
  JOIN "Conversation" c ON c.id = lm.cid
  JOIN "Lead" l ON l.id = c."leadId"
  WHERE lm.dir = 'inbound'
    AND c."organizationId" = $1
    AND lm.at < now() - ($2 || ' minutes')::interval
    AND lm.at > now() - interval '7 days'
    AND NOT (${BAD_LAST})
    AND ${tagStageExclusions()}
  ORDER BY (lm.at > now() - interval '24 hours') DESC, lm.at ASC
  LIMIT ${LIST_LIMIT}`;

    const rows = (await prisma.$queryRawUnsafe(
      sql,
      org.id,
      String(grace),
    )) as Array<{
      cid: string;
      lid: string;
      name: string;
      waiting_since: Date;
      in_window: boolean;
    }>;

    const inWindow = rows.filter((r) => r.in_window).length;
    const total = rows.length;

    if (!dry && total > 0) {
      const oldest = rows.reduce(
        (a, r) => (r.waiting_since < a ? r.waiting_since : a),
        rows[0].waiting_since,
      );
      const hrs = Math.floor((Date.now() - new Date(oldest).getTime()) / 3.6e6);
      await notifyOrgAdmins(prisma, org.id, {
        type: "system",
        title: `${total} interessado${total > 1 ? "s" : ""} aguardando resposta`,
        body:
          `${inWindow} ainda dentro da janela de 24h (dá pra responder sem template). ` +
          `O mais antigo espera há ~${hrs}h. Abra o Atendimento e responda.`,
        link: "/atendimento",
      });
    }

    logger.info("orphan-inbounds", { total, inWindow, dry });
    return NextResponse.json({
      total,
      inWindow,
      graceMin: grace,
      notified: !dry && total > 0,
      leads: rows.map((r) => ({
        conversationId: r.cid,
        leadId: r.lid,
        name: r.name,
        waitingSince: r.waiting_since,
        inWindow: r.in_window,
      })),
    });
  } catch (err) {
    logger.error("orphan-inbounds failed", err);
    return NextResponse.json(
      { error: "falha ao apurar interessados", detail: String(err) },
      { status: 500 },
    );
  }
}
