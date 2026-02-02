# Chroma Tests (Cypress)

Projeto separado para testes de API e E2E com Cypress.

## Requisitos
- API rodando em `http://localhost:9000`
- Front-store rodando em `http://localhost:8080`

## Scripts
- `pnpm --filter @chroma/tests cy:open`
- `pnpm --filter @chroma/tests cy:run`
- `pnpm --filter @chroma/tests cy:run:api`
- `pnpm --filter @chroma/tests cy:run:e2e`

## Variáveis de ambiente
- `CYPRESS_BASE_URL` (default: `http://localhost:8080`)
- `CYPRESS_API_BASE_URL` (default: `http://localhost:9000`)
- `CYPRESS_STORE_API_BASE_URL` (default: `CYPRESS_API_BASE_URL`)
- `CYPRESS_ADMIN_API_BASE_URL` (default: `CYPRESS_API_BASE_URL`)
- `CYPRESS_RUN_API` (`true`/`false`)
- `CYPRESS_RUN_E2E` (`true`/`false`)

## Convenções
- Specs de API em `cypress/api`
- Specs E2E em `cypress/e2e`
- Casos previstos em `TEST_CASES.md`

## Dados de teste
Atualize os fixtures em `cypress/fixtures` para refletir contas e entidades reais.
