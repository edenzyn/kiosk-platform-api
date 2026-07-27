# Kiosk Platform API

TypeScript/Express modular monolith. The application is one deployable process,
while each business capability remains isolated behind a module boundary.

## Getting started

```bash
cp .env.example .env
npm install
npm run dev
```

The base API exposes:

- `GET /api/v1/health/live` — process liveness
- `GET /api/v1/health/ready` — dependency readiness

## Commands

```bash
npm run dev        # watch mode
npm run typecheck  # TypeScript validation
npm test           # integration tests
npm run build      # compile to dist/
npm run check      # full local verification
npm start          # run compiled output
```

## Structure

```text
src/
├── config/
│   ├── container/    # application dependency container
│   ├── db.ts         # PostgreSQL/Drizzle adapter
│   └── env.ts        # validated runtime configuration
├── middleware/       # global Express middleware
├── modules/
│   └── auth/         # class-based auth feature slice
├── shared/
│   ├── errors/       # shared error primitives
│   └── utils/        # logging, async and OpenAPI utilities
├── app.ts            # class-based HTTP composition root
└── index.ts          # function-based server lifecycle
```

Each module owns its controller, service, repository, routes, validation,
schema, types, OpenAPI metadata, and dependency registration. Avoid importing
one module's internals from another module; collaborate through explicit public
contracts.

Environment configuration is validated once when `config/env.ts` is imported.
`DATABASE_URL` and both JWT secrets are required at startup.
