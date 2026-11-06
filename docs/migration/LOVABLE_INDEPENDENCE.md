# Preparação da migração Royal Epoxis
Data da análise: 2026-11-06. Estado: análise e preparação; NÃO autoriza publicação.

## Fontes e divergência
- Repositório original: drozz2025/royal-epoxi-app, main 0cc6762f9a76426ab5b18ad487e5135eb337fd07.
- Fonte Lovable: revisão 38d1e8ef84be0fcf7bf50ba85ec5c4c438058da5.
- GitHub contém Next.js e um modelo reduzido em inglês.
- Lovable contém TanStack Start, React, Vite, Drizzle, Supabase e modelos com campos em português.
- Os esquemas não são intercambiáveis: projects/work_logs/quote_lines no GitHub versus works/work_hours/quote_items no Lovable.
- NÃO executar schema.sql, seed.sql, rls.sql ou permissions.sql do main no sistema original.
- Preservar a aplicação Lovable como referência funcional e visual. Integrar a fonte completa numa branch deste repositório após rever diferenças e ativos; nunca substituir pelo esqueleto Next.js.
- Nenhuma informação de clientes, utilizadores, contagens operacionais ou credenciais está incluída neste documento público.

## Inventário técnico verificado
A base acessível através do Lovable usa Supabase; o ref configurado não consta dos projetos da conta Supabase ligada. Isto é consistente com backend gerido pelo Lovable Cloud, não com um projeto já controlado pela conta independente.
Foram inventariadas 32 tabelas públicas, todas com RLS ativo:
audit_logs, cash_movements, clients, company_settings, doc_counters, documents,
material_movements, materials, measurement_changes, measurements, notifications,
payments, photos, profiles, quote_expenses, quote_extras, quote_items,
quote_labour, quote_templates, quotes, session_activity, supplier_invoice_payments,
supplier_invoices, suppliers, timeline_events, user_roles, visits, work_expenses,
work_extras, work_hours, work_materials, works.

Existe armazenamento privado. Preservar nome de bucket, caminhos, MIME, limites e políticas; não tornar ficheiros públicos.
Existem triggers de numeração, stock, atualização temporal, sincronização orçamento/obra e pagamentos/caixa.
Existem funções SECURITY DEFINER: confirmar ACL/EXECUTE, validação de identidade e search_path antes de expor o destino.
Algumas consultas adicionais de catálogo foram recusadas pelo conector. Inventário de constraints, views, grants, configuração Auth e tarefas agendadas ainda precisa de confirmação por exportação administrativa.

## Dependências Lovable identificadas
- @lovable.dev/vite-tanstack-config: agrega plugins, ambiente, build e runtime; substituir por configuração oficial Vite/TanStack/Tailwind e adaptador de alojamento.
- @lovable.dev/cloud-auth-js e src/integrations/lovable: validar utilização antes de substituir por OAuth direto Supabase.
- previewAuthStorage: broker de sessões com o editor; usar armazenamento próprio fora do Lovable.
- lovable-error-reporting e hooks globais: substituir por tratamento de erros independente, sem transmitir tokens nem dados pessoais.
- src/assets/logo-re.png.asset.json e ícones binários: copiar bytes e verificar hashes; uma URL externa não constitui backup do ativo.
- SUPABASE_URL/PUBLISHABLE_KEY e equivalentes VITE_*: reconfigurar apenas no ambiente de ensaio.
- SUPABASE_SERVICE_ROLE_KEY: exclusivamente no servidor.
- Funções createServerFn de sessões e revisão de orçamentos exigem runtime de servidor; GitHub Pages não executa essas funções.

## Problemas encontrados
### Fonte Lovable
1. enforceSessionActivity usa auth.admin.signOut(context.userId, "global"). A API exige um JWT válido, não um UUID. Patch de preparação anexo; aplicar apenas à fonte TanStack.
2. Face ID atual usa desafios gerados no cliente e repõe tokens guardados em localStorage; não valida assertion no servidor. Migrar para passkeys/WebAuthn verificadas no servidor; preservar login por password e planear novo registo por domínio.
3. Logout não limpa a cópia biométrica da sessão. Patch anexo elimina essa cópia ao terminar sessão.
4. Duplicação de orçamento usa várias escritas independentes. Falhas intermédias podem deixar uma cópia parcial; preparar operação transacional e verificar permissões no destino.
5. RLS de profiles permite atualização do próprio perfil. Rever colunas sensíveis (ativo/rejeição) e privilégios por coluna; RLS por si só não limita colunas.
6. Confirmar que políticas de leitura financeira ampla correspondem às permissões pretendidas, antes de as restringir.
### main GitHub (modelo distinto)
- Middleware aceita existência de cookie com nome sb-/auth-token sem validar sessão.
- Cliente de login usa sessão browser, mas middleware espera cookies; provável incompatibilidade.
- export estático não executa middleware.
- rls.sql referencia stock_movements e audit_log, ausentes de schema.sql (que usa audit_logs).
- Measurements e audit_logs não ficam cobertos corretamente pela sequência RLS fornecida.
- Dependências latest sem lockfile: build não reproduzível.
Estes problemas não demonstram falhas equivalentes na produção Lovable.

## Backup completo e verificação
1. Fixar revisão da fonte e guardar fonte, lockfile e TODOS os ativos binários, sem publicar segredos.
2. Obter exportação administrativa consistente da origem: esquema, dados, funções, triggers, enums, sequences, índices, constraints, grants, RLS e histórico de migrações. Incluir customizações dos esquemas Auth/Storage.
3. Preservar UUIDs de utilizadores e referências. Exportar utilizadores/identidades e hashes de password por canal administrativo cifrado; nunca colocar dumps, passwords, tokens ou hashes no GitHub.
4. Exportar separadamente os bytes de todos os objetos de Storage e um manifesto (bucket, caminho, MIME, tamanho, SHA-256). Metadados SQL não contêm os ficheiros.
5. Exportar configurações Auth (URL, redirects, SMTP, templates, providers, limites), segredos por canal seguro, webhooks, funções externas, cron e integrações. A lista de ficheiros não prova ausência de funções remotas.
6. Cifrar backup e manter duas cópias controladas. Gerar manifesto de integridade.
7. Restaurar num destino vazio isolado; importar com estratégia para impedir reexecução de triggers de caixa/stock e bootstrap do primeiro administrador. Repor triggers/constraints e verificar todos os dados depois.
8. Comparar contagens exatas, checksums por tabela, UUIDs, referências órfãs, sequences e somas financeiras/stock; confirmar descarga de cada ficheiro e igualdade SHA-256.
9. Só declarar backup verificado depois de restauro completo e testes. A leitura do código e consultas agregadas realizadas NÃO constituem backup completo.

## Destino e custos a decidir
A organização ligada está no plano Free e tem dois projetos ativos. Não reutilizar bases de outros produtos nem pausar/eliminar projetos para abrir espaço.
Supabase Free: limite de dois projetos ativos por conta elegível; não criar organizações para contornar o limite.
Supabase Pro começa em USD 25/mês por organização, primeiro Micro coberto pelo crédito de compute; projetos adicionais Micro começam em aproximadamente USD 10/mês cada. Se os dois atuais permanecerem na mesma organização Pro e se adicionar um terceiro Micro, o cenário indicativo é USD 45/mês antes de extras/impostos. Confirmar faturação específica antes de criar.
Uma organização Pro separada com apenas Royal Epoxis permite cenário base de USD 25/mês, sujeito a confirmação de organização/custo.
Cloudflare Workers: Free dentro dos limites; Paid mínimo USD 5/mês + excedentes. Compatibilidade TanStack documentada, build e consumo ainda por testar.
Cenário separado: USD 25/mês Supabase + USD 0 ou 5/mês Workers, sem extras/impostos, domínio ou SMTP.
Não usar Vercel Hobby para esta aplicação empresarial; é limitado a uso pessoal não comercial.
GitHub e ChatGPT/Codex não substituem o servidor da aplicação. Acrescem os planos já contratados e eventuais limites de uso.

Fontes consultadas:
- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/
- https://vercel.com/docs/plans/hobby
- https://supabase.com/docs/reference/javascript/auth-admin-signout
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore

## Ensaios obrigatórios antes da mudança
- Build com versões fixas/lockfile, sem dependências runtime Lovable.
- Login/password, recuperação, aprovação de funcionário, utilizador inativo, logout, timeout, acesso sem sessão e token revogado.
- ADMIN, ORCAMENTISTA, OBRA, FINANCEIRO, FUNCIONARIO: acesso permitido e negado via UI e chamadas diretas à API.
- Criar/editar cliente, orçamento e linhas; duplicação/revisão; aprovação e ligação a obra; PDF com aspeto e valores equivalentes.
- Materiais/consumos/stock; pagamentos parciais; criar/editar/remover pagamentos e confirmar caixa exatamente uma vez.
- Upload/download/substituição/eliminação de ficheiros; utilizador anónimo e inativo negados.
- Relatórios e somas reconciliados; mobile, logo, ícones e navegação comparados com a origem.
- Dados de teste identificáveis exclusivamente no destino isolado, sem emails reais enviados.
Estado: testes funcionais e restauro ainda NÃO executados; destino e exportação administrativa necessários.

## Mudança definitiva
Apenas após backup restaurado/verificado, reconciliação, testes e aprovação explícita do proprietário.
Repetir exportação final consistente ou aplicar delta após janela de suspensão de escritas acordada.
Publicar só após aprovação; validar DNS/TLS/redirects e monitorizar.
Rollback: conservar publicação e base Lovable; definir como reconciliar escritas feitas no destino antes de qualquer retorno.
Não desligar Lovable nem apagar dados nesta fase.
