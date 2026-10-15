# Relatórios do Licita Better pelo WhatsApp do CRM

O worker `/api/cron/licita-better` usa as credenciais WhatsApp existentes **somente no servidor do CRM**, sem exportá-las para outro projeto. Usa o canal padrão e uma conversa existente cujo telefone corresponda exatamente ao destinatário configurado. Não altera leads, funis, campanhas ou os demais agendamentos.

O cron adicionado é `0 10,15,21 * * *`: 07h, 12h e 18h em Brasília. O cron é acionado pela Vercel com o `CRON_SECRET` já existente. Não é necessário revelar esse segredo ao operador para executar a rotina. Interrupções do provedor ou do agendador continuam possíveis: validar as execuções e os recibos antes de afirmar entrega.

## Configuração de servidor

- No Licita Better: `LICITA_GESTAO_EMPRESA_ID` da Better e `LICITA_GESTAO_REPORT_TOKEN` (aleatório, mínimo 32 caracteres), além do banco existente. A leitura funciona sem a migração, marcando a cobertura como não verificada. A escrita de evidências exige a migração de gestão.
- No CRM: o mesmo `LICITA_GESTAO_REPORT_TOKEN` e `LICITA_REPORT_TO` em E.164. `LICITA_REPORT_ORG_ID` é opcional apenas quando a organização puder ser resolvida com segurança pelo número existente ou por existir uma única organização. Em instalações com várias organizações, fixar essa variável.
- Não é necessário configurar Twilio. Manter desativado o workflow alternativo de envios no repositório do Licita Better para evitar dois motores enviando o mesmo relatório.

A credencial nova só autoriza o CRM a ler o relatório agregado de uma empresa na rota fixa `https://www.institutoi10.com.br/licita360/api/v2/gestao/relatorio`. Não autoriza alteração de propostas, documentos, tarefas ou calendário. Nenhum telefone ou valor de credencial deve entrar no Git ou em logs.

## Modelo e teste

Após publicar, um administrador da organização pode abrir `/api/cron/licita-better?teste=preparar-modelo-v1&preparar_modelo=1`. A rota submete o modelo `licita_better_relatorio_operacional_v1` usando o token Meta interno do CRM. Se já existir, apenas consulta seu estado. O modelo precisa ser aprovado pela Meta como `UTILITY`; nenhuma aprovação é presumida e não se reaproveita um modelo de cursos para disfarçar um relatório.

Com fonte, destinatário e modelo válidos, abrir `/api/cron/licita-better?teste=validacao-envio-v1` pela sessão administrativa. A resposta contém IDs e estados das mensagens. Reabrir o **mesmo endereço de teste** consulta os registros existentes, sem reenviar. Só `delivered` ou `read`, atualizados pelo webhook do CRM, confirmam entrega; `sent` é aceitação pelo provedor. Qualquer `pending`, `incerto` ou falha deve ser conciliado antes de outra tentativa.

O relatório é dividido em partes de até 650 caracteres para o campo variável do modelo. Um timeout não autoriza retry automático. O registro é persistido antes da transmissão e uma trava de banco impede execuções concorrentes. Novos relatórios da mesma rodada não modificam partes já enviadas.

O conteúdo vem das obrigações registradas no Licita Better. Isso não implementa consulta autônoma aos portais. Fontes sem evidência recente são destacadas como incompletas; calendário não prova envio ou habilitação.

## Validação e reversão

Testes: `npx vitest run src/app/api/__tests__/licita-better.test.ts`. O build local requer `AUTH_SECRET` de teste; não extrair a chave real para compilar.

Para parar somente esta rotina, remover sua entrada de `vercel.json` e publicar, ou remover `LICITA_GESTAO_REPORT_TOKEN` do CRM. Preservar mensagens e recibos. Não desativar os outros crons nem alterar a configuração WhatsApp existente.

## Referência de publicação

Esta alteração parte de `d74b346`, confirmado como código da implantação CRM em produção. O `main` remoto estava 22 commits atrás dessa implantação. A referência `production-baseline-2026-10-15` preserva exatamente esse código e permite revisar só a integração no PR #2. Não publicar o diretório original com alterações locais pendentes nem promover o antigo `main` sobre a versão em uso.

A prévia falhou porque `AUTH_SECRET` existe apenas no ambiente Production. O build com configuração local de teste passou. Não copiar a chave real para previews nem enfraquecer o guard de autenticação para contornar isso.
