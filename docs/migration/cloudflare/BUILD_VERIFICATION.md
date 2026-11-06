# Cloudflare: verificação independente

Royal e Butterfly foram compilados com Vite/TanStack Start e o plugin oficial Cloudflare, sem importar a configuração Lovable. Wrangler 4.158.0 e @cloudflare/vite-plugin 1.67.0 estão fixos nos lockfiles locais. As duas aplicações passaram o dry-run de empacotamento e responderam HTTP 200 no runtime local, com CSS e JavaScript também HTTP 200. O teste não valida o backend, permissões ou login.

A configuração define workers_dev=false, preview_urls=false e não tem rotas nem domínios; não publica automaticamente. Não contém credenciais. A autorização de publicação em produção continua obrigatória.

## Royal

O repositório original ainda tem um esqueleto Next.js diferente da fonte atual TanStack Start obtida no Lovable (38d1e8ef84be0fcf7bf50ba85ec5c4c438058da5). Estes ficheiros são para essa fonte atual; não devem ser aplicados ao esqueleto Next.js. A reconciliação da fonte completa, incluindo ícones binários, continua pendente. O logótipo original de 1.189.062 bytes foi recuperado e o manifesto local agora aponta para /assets/logo-royal-epoxis.png, eliminando a rota de assets do Lovable.

## RM Dental

A configuração wrangler.jsonc serve o dist como SPA. Compilar primeiro com npm run build -- --config vite.independent.config.ts. Não incluir credenciais administrativas em VITE_*. O backend Supabase de origem ainda não foi substituído.

## Bloqueios

A tentativa de entrada no Cloudflare com Google devolveu Unable to sign in. Nenhuma conta ou recurso Cloudflare foi criado. Faltam autenticação da conta, finalização dos anexos RM Dental, importação/adaptação do backend, teste funcional e aprovação final.
