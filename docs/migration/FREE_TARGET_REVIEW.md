# Revisão do destino gratuito — Royal Epoxis
Data: 2026-11-06. Esta revisão substitui a preferência anterior por criar um Supabase pago. O proprietário não autoriza custos mensais de Supabase.

## Conclusão
Neon Free é um candidato para um projeto independente de backend, sujeito a restauro e testes, não um destino já validado. Não reutilizar projetos de outras aplicações nem misturar os respetivos dados.

## Diferenças que impedem uma simples troca de URL
- Cliente, Auth, identidade em RLS, Storage, funções administrativas e runtime precisam de adaptação.
- A migração padrão documentada do Neon não preserva passwords Supabase diretamente. Não prometer login inalterado; primeiro validar mapa de UUIDs e recuperação/reautenticação.
- Não copiar cegamente auth.uid(), auth.users e privilégios de funções SECURITY DEFINER.
- Funções de revisão/duplicação de orçamento devem ser transacionais para evitar cópias parciais.
- Sessões, Face ID e revogação exigem os testes descritos no plano anterior.
- O frontend TanStack Start continua a necessitar de alojamento. Neon Functions não aloja websites; GitHub conserva o código, mas GitHub Pages não é a recomendação para esta aplicação empresarial com acessos sensíveis.

## Plano gratuito: orçamento técnico
Neon anuncia Free com 100 projetos, 1 GB de Postgres por projeto, 100 CU-horas/mês por projeto, 5 GB de Object Storage e quotas de Functions. Estes números não garantem utilização ilimitada nem disponibilidade suficiente para qualquer carga.
A base e os ficheiros devem ser medidos antes do restauro e o consumo real ensaiado. Não ativar plano pago ou excedentes.
Reconfirmar limites na conta destino antes de provisionar.

## Sequência
1. Manter esta branch e o Lovable original; não publicar.
2. Ligar a conta Neon e inspecionar plano/região/limites sem contratar serviços.
3. Exportação administrativa completa, incluindo Auth, dados, schema, policies, triggers e bytes Storage, por canal seguro.
4. Restauro isolado, comparação integral e testes com dados sintéticos.
5. Decisão de autenticação e alojamento gratuito compatível.
6. Só após aprovação explícita, janela final e plano de rollback.

Não existe ainda backup completo restaurado/verificado ou migração executada.

Referências:
- https://neon.com/pricing
- https://neon.com/docs/auth/migrate/from-supabase
- https://neon.com/docs/compute/functions/overview
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
