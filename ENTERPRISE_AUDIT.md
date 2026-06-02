# AIFLUENT — Auditoria Enterprise para Go-Live

---

## 1. AUDITORIA DA EXPERIENCIA DO VENDEDOR

### Estado real medido no codigo:

| Operacao diaria | Cliques hoje | Possivel? | Bloqueador |
|----------------|-------------|-----------|-----------|
| Atender WhatsApp | 1 | SIM | — |
| Responder mensagem | 2 (digitar+enviar) | SIM | — |
| Mover lead de stage | 3-4 (navegar pipeline+drag) | PARCIAL | Sem stage selector no chat |
| Marcar negocio Ganho | **IMPOSSIVEL** | NAO | Sem PATCH /api/deals, sem botao |
| Marcar negocio Perdido | **IMPOSSIVEL** | NAO | Idem |
| Adicionar nota | **IMPOSSIVEL no chat** | NAO | UI existe no modal, nao no chat |
| Ver historico | **IMPOSSIVEL no WhatsApp** | NAO | Timeline existe no Inbox, nao no WhatsApp |
| Criar tarefa follow-up | 6-8 (navegar /tasks) | SIM mas lento | Sem criacao inline no chat |
| Ver valor do negocio | **IMPOSSIVEL no chat** | NAO | Deal nao carregado no WhatsApp |
| Alterar responsavel | **IMPOSSIVEL** | NAO | Sem PATCH lead, sem UI |

**Veredicto: 6 de 10 operacoes diarias sao IMPOSSIVEIS na tela de trabalho do vendedor.**

### O WhatsApp mostra apenas:
- Nome, telefone, email, localizacao (hardcoded "SP"), tags
- 3 botoes: "Marcar prioritario", "Ver perfil", "Criar negocio"

### O WhatsApp NAO mostra:
- Stage atual, temperatura, score IA
- Valor do negocio, status (ganho/perdido/aberto)
- Historico de atividades, notas
- Tarefas pendentes, follow-ups
- Responsavel, consultor
- Ultimo contato, proximo follow-up

---

## 2. AUDITORIA DE ARQUITETURA

### APIs que EXISTEM vs APIs que FALTAM:

| Operacao | API | Status |
|----------|-----|--------|
| Listar leads | GET /api/leads | EXISTE |
| Criar lead | POST /api/leads | EXISTE |
| **Atualizar lead** | **PATCH /api/leads/[id]** | **NAO EXISTE** |
| **Deletar lead** | **DELETE /api/leads/[id]** | **NAO EXISTE** |
| Listar deals | GET /api/deals | EXISTE |
| Criar deal | POST /api/deals | EXISTE |
| **Atualizar deal** | **PATCH /api/deals/[id]** | **NAO EXISTE** |
| Mover stage | PATCH /api/pipeline | EXISTE |
| Listar tasks | GET /api/tasks | EXISTE |
| Criar task | POST /api/tasks | EXISTE |
| **Criar nota/atividade** | **POST /api/activities** | **NAO EXISTE** |
| **Listar historico** | **GET /api/leads/[id]/activities** | **NAO EXISTE** |

**4 endpoints criticos estao faltando.** O banco suporta todas as operacoes (models Activity, Deal, Lead tem os campos), mas nao ha APIs nem UI.

### Problemas de escalabilidade:

| Problema | Impacto | Severidade |
|----------|---------|-----------|
| WhatsApp page: 517 linhas monolitica | Dificil manter/testar | MEDIO |
| Pipeline query: 4 niveis de include aninhado | Lento com 10K+ leads | ALTO |
| Sem paginacao em deals (limit: 100) | Falha com muitos deals | MEDIO |
| Rate limit in-memory | Nao funciona multi-instancia | MEDIO |
| Sem cache (Redis) | Queries repetidas ao banco | BAIXO (para MVP) |

### Banco de dados:
- 29 tabelas, 21 indices — **ADEQUADO para MVP**
- PostgreSQL com multi-tenant — **FUNCIONAL**
- Prisma ORM sem raw queries — **SEGURO**
- Activity model suporta notas, historico, timeline — **PRONTO no schema**

---

## 3. AUDITORIA UX/UI — Comparativo com mercado

### Onde estamos ABAIXO do mercado:

| Aspecto | AIFLUENT | Clint | HubSpot | Pipedrive |
|---------|----------|-------|---------|-----------|
| Chat + CRM integrado | ❌ Separados | ✅ Unificado | ✅ | ⚠️ |
| Stage change no chat | ❌ | ✅ 1 clique | ✅ | ✅ |
| Ganho/Perdido no chat | ❌ | ✅ Botoes | ✅ | ✅ |
| Notas no chat | ❌ | ✅ Acordeao | ✅ | ✅ |
| Timeline no chat | ❌ (so no inbox) | ✅ | ✅ | ✅ |
| SLA timer | ❌ | ✅ | ✅ | ❌ |
| Sidebar hierarquica | ❌ Flat | ✅ Arvore | ✅ | ⚠️ |
| Densidade de info no card | ⚠️ Media | ✅ Alta | ⚠️ | ✅ |

### Onde estamos ACIMA do mercado:

| Aspecto | AIFLUENT | Clint | HubSpot | Pipedrive |
|---------|----------|-------|---------|-----------|
| IA integrada (copiloto) | ✅ | ❌ | ⚠️ Pago | ❌ |
| Gamificacao (XP, ranking) | ✅ | ❌ | ❌ | ❌ |
| Tema inteligente (auto) | ✅ | ❌ | ❌ | ✅ |
| Meta Ads integrado | ✅ | ❌ | ✅ | ❌ |
| Design glassmorphism | ✅ Premium | ⚠️ Padrao | ⚠️ | ⚠️ |
| Disparos em massa | ✅ Completo | ✅ | ✅ Pago | ❌ |

---

## 4. AUDITORIA DE PRODUTO

### Para um cliente trocar o Clint pelo AIFLUENT, precisa:

**Indispensavel (sem isso, nao troca):**
1. Gestao de negocio DENTRO do chat (stage, ganho, perdido, notas)
2. APIs PATCH para lead e deal (atualizar, nao so criar)
3. Historico visivel durante atendimento

**Diferencial competitivo (motivo para trocar):**
1. IA sugerindo respostas e proximo passo
2. Gamificacao motivando equipe
3. Design premium superior
4. Meta Ads nativo (Clint nao tem)

**Pode ser removido/adiado:**
1. Disparos em massa (paginas ocultas ja estao OK)
2. Telefonia (pode adiar)
3. Produtividade/gamificacao (diferencial, mas nao bloqueador)

---

## 5. REVISAO CRITICA DA PROPOSTA ANTERIOR

### O que esta CORRETO:
- Unificar WhatsApp + Inbox em "Atendimento" ✅
- Painel de negocio com Ganho/Perdido/Aberto ✅
- Stage dropdown universal ✅
- SLA timer ✅
- Acordeoes colapsaveis ✅

### O que esta ERRADO/FALTANDO:
- **A proposta nao menciona as 4 APIs faltantes** (PATCH lead, PATCH deal, POST activities, GET activities). Sem elas, o painel sera visual mas nao funcional.
- **A proposta subestima o esforco** — Nao e so UI. Precisa de APIs reais, integracao com banco, e atualizacao em tempo real.

### O que deveria ter PRIORIDADE MAIOR:
- **PATCH /api/leads/[id]** — Sem isso, nenhuma operacao de atualizacao funciona (stage, status, responsavel, temperatura)
- **PATCH /api/deals/[id]** — Sem isso, ganho/perdido nao funciona

### O que pode ser ADIADO para P1:
- Sidebar hierarquica de origens (P1, nao P0)
- Templates no chat (P1)
- Badge de pendencias (P1)

---

## 6. ROADMAP EXECUTIVO

### Sprint 1 — Go-Live (P0)

| # | Item | Impacto negocio | Impacto produtividade | Complexidade | Tempo |
|---|------|----------------|----------------------|-------------|-------|
| 1 | **PATCH /api/leads/[id]** — Atualizar stage, status, temperatura, responsavel | CRITICO | CRITICO | Baixa | 2h |
| 2 | **PATCH /api/deals/[id]** — Marcar ganho/perdido, atualizar valor | CRITICO | CRITICO | Baixa | 2h |
| 3 | **POST /api/activities** — Criar nota/atividade | CRITICO | Alto | Baixa | 1h |
| 4 | **GET /api/leads/[id]/activities** — Buscar historico | CRITICO | Alto | Baixa | 1h |
| 5 | **Pagina /atendimento** — Central unificada 3 colunas | CRITICO | CRITICO | Alta | 8h |
| 6 | **Lead Operation Panel** — Painel direito completo com: negocio, ganho/perdido, stage dropdown, notas, historico, tarefas | CRITICO | CRITICO | Alta | 6h |
| 7 | **Stage Selector** — Dropdown reutilizavel em qualquer contexto | Alto | CRITICO | Media | 2h |
| 8 | **SLA Timer** — Verde/Amarelo/Vermelho no chat | Alto | Alto | Baixa | 1h |
| 9 | **Sidebar: renomear WhatsApp → Atendimento** | Medio | Medio | Minima | 0.5h |
| 10 | **Redirect /whatsapp → /atendimento** | Medio | — | Minima | 0.5h |

**Total Sprint 1: ~24 horas de desenvolvimento**

### Sprint 2 — Primeiros clientes (P1)

| # | Item | Tempo |
|---|------|-------|
| 1 | Sidebar hierarquica de origens | 4h |
| 2 | Templates WhatsApp no chat | 3h |
| 3 | Badge de pendencias (99+) | 1h |
| 4 | Multiplos negocios por contato | 3h |
| 5 | Suspender automacao individual | 2h |
| 6 | Visualizacoes salvas | 3h |

### Sprint 3 — Escala

| # | Item | Tempo |
|---|------|-------|
| 1 | Paginacao em deals e tasks | 2h |
| 2 | Cache Redis para queries frequentes | 4h |
| 3 | Otimizar pipeline query (select em vez de include) | 2h |
| 4 | WebSocket para atualizacao real-time | 6h |

### Sprint 4 — Diferenciais de mercado

| # | Item | Tempo |
|---|------|-------|
| 1 | IA sugere proximo estagio | 4h |
| 2 | IA resume conversa | 3h |
| 3 | IA detecta risco de perda | 4h |
| 4 | Gamificacao visivel no dashboard | 3h |
| 5 | Integracao pagamento (Asaas) | 6h |

---

## 7. DECISAO DE IMPLEMENTACAO

### Ordem exata de execucao (Sprint 1):

```
DIA 1 (APIs):
  1. PATCH /api/leads/[id]
  2. PATCH /api/deals/[id]
  3. POST /api/activities
  4. GET /api/leads/[id]/activities
  
DIA 2 (Componentes):
  5. stage-selector.tsx
  6. deal-status-buttons.tsx
  7. sla-timer.tsx
  8. accordion-section.tsx
  9. notes-section.tsx
  10. history-section.tsx
  11. tasks-section.tsx
  12. quick-actions-bar.tsx
  
DIA 3 (Pagina):
  13. lead-operation-panel.tsx (integra todos os componentes)
  14. /atendimento/page.tsx (central unificada)
  15. Sidebar + redirect
  16. Testes e validacao
```

### Resultado esperado:
- Vendedor faz 10 operacoes sem sair do chat
- 78% menos cliques para mover stage
- 83% menos cliques para fechar negocio
- 100% de visibilidade de historico/notas durante atendimento
