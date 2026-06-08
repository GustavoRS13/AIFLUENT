import { describe, it, expect, vi, beforeEach } from "vitest";

// Avoid loading the real next-auth (it imports a bare "next/server" that the
// test resolver cannot handle). The routes only need `auth` to exist.
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));

// Partial-mock api-auth: keep the real requireOrgId/getOrgId logic (the thing
// under test), but stub session resolution and rate limiting.
vi.mock("@/lib/api-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-auth")>();
  return { ...actual, requireAuth: vi.fn(), checkRateLimit: vi.fn(() => null) };
});

// Shared Prisma mock across all routes under test.
vi.mock("@/lib/prisma", () => {
  const prisma = {
    lead: {
      create: vi.fn(),
      findFirst: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
    },
    activity: { create: vi.fn().mockResolvedValue({}) },
    user: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
    organization: { findFirst: vi.fn(), create: vi.fn() },
    conversation: { findUnique: vi.fn(), update: vi.fn() },
    conversationMessage: { create: vi.fn() },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    tag: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "t1" }),
    },
    leadTag: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
    },
    campaign: { findUnique: vi.fn(), update: vi.fn() },
    deal: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn() },
    task: { count: vi.fn().mockResolvedValue(0) },
  };
  return { prisma };
});

import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { POST as leadsPOST } from "../leads/route";
import { POST as usersPOST } from "../users/route";
import { POST as conversationsPOST } from "../conversations/route";
import { POST as aiChatPOST } from "../ai/chat/route";
import { PATCH as campaignPATCH } from "../campaigns/[id]/route";

const mockedRequireAuth = vi.mocked(requireAuth);

function session(user: Record<string, unknown> | null) {
  return user
    ? { error: null, session: { user } }
    : { error: null, session: { user: {} } };
}

function jsonReq(body: unknown) {
  return {
    json: async () => body,
    headers: { get: () => null },
    nextUrl: new URL("http://localhost/api"),
    url: "http://localhost/api",
  } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
  // restore default resolved values cleared above
  (prisma.lead.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
  (prisma.deal.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
  (prisma.task.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
});

describe("Leads POST — tenant fail-closed + no client org injection (Audit #4)", () => {
  it("rejects with 403 when the session has no organization (no fallback)", async () => {
    mockedRequireAuth.mockResolvedValue(
      session({ id: "u1", role: "gestor" }) as never,
    );
    const res = await leadsPOST(
      jsonReq({ firstName: "X", organizationId: "evil-org" }) as never,
    );
    expect(res.status).toBe(403);
    expect(prisma.lead.create).not.toHaveBeenCalled();
  });

  it("ignores body organizationId/consultantId/teamId and derives tenant + creator from session", async () => {
    mockedRequireAuth.mockResolvedValue(
      session({ id: "u1", role: "gestor", organizationId: "org-1" }) as never,
    );
    (prisma.lead.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "lead1",
      firstName: "X",
    });

    const res = await leadsPOST(
      jsonReq({
        firstName: "X",
        organizationId: "evil-org",
        consultantId: "evil-consultant",
        teamId: "evil-team",
        createdById: "evil-creator",
      }) as never,
    );

    expect(res.status).toBe(201);
    const arg = (prisma.lead.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(arg.data.organizationId).toBe("org-1");
    expect(arg.data.createdById).toBe("u1");
    expect(arg.data.consultantId).toBeUndefined();
    expect(arg.data.teamId).toBeUndefined();
  });
});

describe("Users POST — tenant fail-closed + no client org injection (Audit #4)", () => {
  it("rejects with 403 when the session has no organization", async () => {
    mockedRequireAuth.mockResolvedValue(
      session({ id: "u1", role: "admin" }) as never,
    );
    const res = await usersPOST(
      jsonReq({
        name: "New",
        email: "new@x.com",
        password: "secret123",
        organizationId: "evil-org",
      }) as never,
    );
    expect(res.status).toBe(403);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("creates the user in the session organization, never the body one", async () => {
    mockedRequireAuth.mockResolvedValue(
      session({ id: "u1", role: "admin", organizationId: "org-1" }) as never,
    );
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      null,
    );
    (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "newuser",
      email: "new@x.com",
    });

    const res = await usersPOST(
      jsonReq({
        name: "New",
        email: "new@x.com",
        password: "secret123",
        organizationId: "evil-org",
      }) as never,
    );

    expect(res.status).toBe(201);
    const arg = (prisma.user.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(arg.data.organizationId).toBe("org-1");
    expect(prisma.organization.findFirst).not.toHaveBeenCalled();
  });
});

describe("Conversations POST — cross-tenant IDOR closed (Audit #4)", () => {
  it("returns 404 and does not write when the conversation belongs to another org", async () => {
    mockedRequireAuth.mockResolvedValue(
      session({ id: "u1", role: "operador", organizationId: "org-1" }) as never,
    );
    (
      prisma.conversation.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      organizationId: "org-2",
    });

    const res = await conversationsPOST(
      jsonReq({ conversationId: "c-other", content: "hi" }) as never,
    );

    expect(res.status).toBe(404);
    expect(prisma.conversationMessage.create).not.toHaveBeenCalled();
  });

  it("writes when the conversation belongs to the session org", async () => {
    mockedRequireAuth.mockResolvedValue(
      session({ id: "u1", role: "operador", organizationId: "org-1" }) as never,
    );
    (
      prisma.conversation.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      organizationId: "org-1",
    });
    (
      prisma.conversationMessage.create as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "m1",
    });
    (prisma.conversation.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      {},
    );

    const res = await conversationsPOST(
      jsonReq({ conversationId: "c-mine", content: "hi" }) as never,
    );

    expect(res.status).toBe(201);
    expect(prisma.conversationMessage.create).toHaveBeenCalled();
  });
});

describe("AI chat — queries scoped by org (Audit #4)", () => {
  it("rejects with 403 when the session has no organization", async () => {
    mockedRequireAuth.mockResolvedValue(
      session({ id: "u1", role: "gestor" }) as never,
    );
    const res = await aiChatPOST(
      jsonReq({ message: "quantos leads temos?" }) as never,
    );
    expect(res.status).toBe(403);
  });

  it("scopes lead counts to the session organization", async () => {
    mockedRequireAuth.mockResolvedValue(
      session({ id: "u1", role: "gestor", organizationId: "org-1" }) as never,
    );

    const res = await aiChatPOST(
      jsonReq({ message: "quantos leads temos no total?" }) as never,
    );
    expect(res.status).toBe(200);

    const calls = (prisma.lead.count as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(call[0]?.where?.organizationId).toBe("org-1");
    }
  });
});

describe("Campaigns PATCH — cross-tenant IDOR closed", () => {
  function paramReq(body: unknown, id: string) {
    return [
      jsonReq(body) as never,
      { params: Promise.resolve({ id }) } as never,
    ] as const;
  }

  it("returns 404 and does not update a campaign of another org", async () => {
    mockedRequireAuth.mockResolvedValue(
      session({ id: "u1", role: "gestor", organizationId: "org-1" }) as never,
    );
    (prisma.campaign.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      organizationId: "org-2",
    });
    const res = await campaignPATCH(
      ...paramReq({ status: "pausada" }, "c-other"),
    );
    expect(res.status).toBe(404);
    expect(prisma.campaign.update).not.toHaveBeenCalled();
  });

  it("updates a campaign that belongs to the session org", async () => {
    mockedRequireAuth.mockResolvedValue(
      session({ id: "u1", role: "gestor", organizationId: "org-1" }) as never,
    );
    (prisma.campaign.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      organizationId: "org-1",
    });
    (prisma.campaign.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "c-mine",
      status: "pausada",
    });
    const res = await campaignPATCH(
      ...paramReq({ status: "pausada" }, "c-mine"),
    );
    expect(res.status).toBe(200);
    expect(prisma.campaign.update).toHaveBeenCalled();
  });
});
