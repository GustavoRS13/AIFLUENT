import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { runBroadcastBatch } from "@/lib/broadcast-worker";

export const runtime = "nodejs";
export const maxDuration = 60;

// Worker de disparos: processa INLINE (sem self-fetch) os jobs 'running' com
// pendentes. Chamado por um agendador externo (GitHub Actions/cron-job.org) ou
// pelo cron da Vercel. Autenticado por CRON_SECRET. Cada chamada processa ~50s.
async function run(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authz = request.headers.get("authorization");
  const qpSecret = new URL(request.url).searchParams.get("secret");
  if (!secret || (authz !== `Bearer ${secret}` && qpSecret !== secret)) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const running = await prisma.broadcastJob.findMany({
      where: { status: "running" },
      select: { id: true },
      orderBy: { startedAt: "asc" },
      take: 10,
    });

    const start = Date.now();
    const results: Record<string, unknown>[] = [];
    // divide o orçamento (~50s) entre os jobs em andamento
    for (const job of running) {
      if (Date.now() - start > 50000) break;
      const budget = Math.max(
        8000,
        Math.floor(
          (50000 - (Date.now() - start)) / Math.max(1, running.length),
        ),
      );
      const r = await runBroadcastBatch(prisma, job.id, budget);
      if (r)
        results.push({
          id: job.id,
          processed: r.processed,
          sent: r.totalSent,
          remaining: r.remaining,
          status: r.status,
        });
    }

    return NextResponse.json({ ok: true, jobs: running.length, results });
  } catch (err) {
    logger.error("cron/broadcasts error", err);
    return NextResponse.json({ error: "falha" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return run(request);
}
export async function POST(request: NextRequest) {
  return run(request);
}
