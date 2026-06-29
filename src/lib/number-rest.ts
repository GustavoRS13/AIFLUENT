// Modo "descanso do número" (recuperação de qualidade no WhatsApp/Meta).
//
// A qualidade na Meta não é sobre ENTREGA — é sobre BLOQUEIOS/DENÚNCIAS de quem
// recebe. Disparar em massa pra lead frio (mesmo UTILITY, que entrega bem) gera
// bloqueio de quem não quer → sinal negativo → mantém o número no RED.
//
// Para tirar do RED é preciso um período sustentado de baixa taxa de bloqueio:
// conversas de mão dupla com gente engajada, e o número "descansando" de blast.
//
// Enquanto `NUMBER_REST_UNTIL` (ISO date/datetime) estiver no futuro:
//   - recovery-utility NÃO dispara (cron de recuperação pausado);
//   - broadcasts só processa jobs marcados como rest-safe (direcionados a
//     quentes / quem respondeu), nunca blast frio;
//   - respostas no Atendimento (janela 24h, texto livre) seguem normais — são
//     manuais, não passam por cron, então não dependem deste módulo.
//
// É autocurável: quando a data passa, a recuperação volta sozinha. Para encerrar
// o descanso manualmente, basta remover/zerar a env. Sem a env, comportamento =
// o de sempre (nada pausado).

export function restingUntil(): Date | null {
  const v = process.env.NUMBER_REST_UNTIL;
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export function isNumberResting(now: Date = new Date()): boolean {
  const until = restingUntil();
  return until !== null && now < until;
}

// Marca um job de disparo como "seguro durante o descanso" (direcionado, não
// blast frio). Guardado no campo BroadcastJob.filters (JSON de auditoria).
export function isRestSafeJob(filters?: string | null): boolean {
  if (!filters) return false;
  try {
    const parsed = JSON.parse(filters) as { restSafe?: unknown };
    return parsed?.restSafe === true;
  } catch {
    return false;
  }
}
