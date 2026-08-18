# @winaut/web

Painel administrativo do WinAut.

## Desenvolvimento

Crie `apps/web/.env.local` a partir de `.env.example`:

```env
NEXT_PUBLIC_WINAUT_API_URL=http://localhost:3301
```

Na raiz do monorepo:

```bash
pnpm install
pnpm dev:api
pnpm dev:web
```

Por padrão, a API aceita CORS de `http://localhost:3000`. Para outros hosts do painel, configure `CORS_ORIGINS` na API com uma lista separada por vírgulas.
