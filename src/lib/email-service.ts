const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || "noreply@aifluent.com";

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export async function sendEmail(
  options: EmailOptions,
): Promise<{ id: string } | { error: string }> {
  if (!RESEND_API_KEY) {
    return { error: "Email nao configurado. Defina RESEND_API_KEY." };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(RESEND_API_KEY);

    const payload: Record<string, unknown> = {
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
    };
    if (options.html) payload.html = options.html;
    if (options.text) payload.text = options.text;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resend.emails.send(payload as any);

    if (result.error) return { error: result.error.message };
    return { id: result.data?.id || "sent" };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erro ao enviar email",
    };
  }
}

const APP_URL = process.env.APP_URL || "https://crm.aifluent.com.br";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  supervisor: "Supervisor",
  operador: "Operador",
};

// E-mail de boas-vindas enviado ao criar um novo usuário.
export async function sendWelcomeEmail(opts: {
  to: string;
  name: string;
  role: string;
  tempPassword: string;
}): Promise<{ id: string } | { error: string }> {
  const loginUrl = `${APP_URL}/login`;
  const role = ROLE_LABEL[opts.role] || opts.role;
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f2937">
    <div style="text-align:center;padding:24px 0">
      <h1 style="color:#4f46e5;margin:0;font-size:22px">AIFLUENT</h1>
      <p style="color:#6b7280;margin:4px 0 0;font-size:13px">CRM Inteligente</p>
    </div>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:16px;padding:24px">
      <p>Olá <b>${opts.name}</b>,</p>
      <p>Seu acesso ao AIFLUENT foi criado com o perfil <b>${role}</b>. Use os dados abaixo para entrar:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px 0;color:#6b7280">E-mail</td><td style="padding:6px 0;text-align:right"><b>${opts.to}</b></td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Senha temporária</td><td style="padding:6px 0;text-align:right"><b>${opts.tempPassword}</b></td></tr>
      </table>
      <div style="text-align:center;margin:20px 0">
        <a href="${loginUrl}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;display:inline-block">Acessar o AIFLUENT</a>
      </div>
      <p style="font-size:13px;color:#b45309;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px">
        🔒 Por segurança, <b>troque sua senha no primeiro acesso</b> em “Meu perfil”.
      </p>
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px">${loginUrl}</p>
  </div>`;
  return sendEmail({
    to: opts.to,
    subject: "Bem-vindo(a) ao AIFLUENT — seu acesso",
    html,
    text: `Olá ${opts.name}, seu acesso ao AIFLUENT (${role}) foi criado.\nE-mail: ${opts.to}\nSenha temporária: ${opts.tempPassword}\nAcesse: ${loginUrl}\nTroque a senha no primeiro acesso em "Meu perfil".`,
  });
}
