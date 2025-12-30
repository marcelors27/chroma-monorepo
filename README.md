# Chroma — Monorepo e-commerce (Medusa + Next.js + Vite)

Monorepo para o e-commerce de materiais de construção/acabamentos **Chroma**, composto por:
- `packages/api` — backend Medusa com plugins de pagamento/entrega manuais e seed de catálogo.
- `packages/store` — storefront Next.js consumindo a API (BRL, páginas de lista e detalhe).
- `packages/admin` — painel Vite/React para autenticar no Medusa e acompanhar catálogo/pedidos.

## Pré-requisitos
- Node 18+
- pnpm `npm i -g pnpm`

## Instalação das dependências
```bash
pnpm install
```

## Rodar com Docker (somente Postgres + Redis)
```bash
# Ajuste variáveis em packages/api/.env (já configurado para Postgres/Redis do compose)
cp packages/api/.env.example packages/api/.env
docker-compose up --build
```
Sobe apenas Postgres (5432) e Redis (6379) expostos. Rode a API localmente apontando para `localhost` (já configurado no `.env.example` da API). Volume `packages/api/uploads` permanece na máquina host.

## Como rodar cada app
- API Medusa: `cd packages/api && cp .env.example .env && pnpm dev`
  - Crie o usuário admin: `pnpm medusa user -e admin@chroma.local -p supersecret`
  - Popule o catálogo: em outro terminal `pnpm seed` (API precisa estar rodando).
- Storefront: `cd packages/store && cp .env.example .env && pnpm dev`
- Admin: `cd packages/admin && cp .env.example .env && pnpm dev`

Para subir tudo junto na raiz: `pnpm dev` (usa `concurrently`).

## Estrutura
- `package.json` + `pnpm-workspace.yaml` — workspace com scripts `dev:*`.
- `packages/api/medusa-config.js` — CORS, DB (sqlite por padrão), plugins e Redis.
- `packages/api/seed/` — `products.json` e script `seed.js` que autentica no admin e cria produtos.
- `packages/store/` — Next 14 com páginas em `pages/`, estilos em `styles/`.
- `packages/admin/` — Vite + React com login de admin e tabelas de produtos/pedidos.

## Produção/variáveis
- Ajuste `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`, `DATABASE_URL` e `REDIS_URL` no `.env` da API.
- Defina `NEXT_PUBLIC_MEDUSA_URL` (store) e `VITE_MEDUSA_URL` (admin) apontando para a API publicada.

## Checklist rápido
- `pnpm install`
- `cd packages/api && pnpm dev`
- `pnpm medusa user ...` (um único admin)
- `pnpm seed`
- `pnpm dev:store` e `pnpm dev:admin`

## Deploy da API no Railway
O monorepo já inclui `railway.toml` com build e start da API Medusa.

Variáveis recomendadas no Railway (service da API):
- `DATABASE_URL`
- `REDIS_URL`
- `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`
- `JWT_SECRET`, `COOKIE_SECRET`
- `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`, `RESEND_FROM`
- `STORE_URL` ou `FRONTEND_URL`

Comandos usados:
- Build: `pnpm install --frozen-lockfile`
- Start: `pnpm --filter @chroma/api start`
