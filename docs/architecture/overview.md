# TaskFlow — System Architecture Overview

## High-Level Topology

```
+-----------------------------------------------------------------------+
|                            Client Tier                                |
|   React 18/19 SPA (Vite + TypeScript + Tailwind CSS + Lucide Icons)   |
|   TanStack Query (Server State) + React Hook Form + Zod               |
+-----------------------------------+-----------------------------------+
                                    |
                 +------------------+------------------+
                 | HTTPS / REST                        | WSS (Socket.IO)
                 v                                     v
+-----------------------------------------------------------------------+
|                            API Gateway / Server                       |
|   Node.js + Express + TypeScript                                      |
|   - Helmet Security Headers & CORS Controls                           |
|   - Rate Limiting (express-rate-limit)                                |
|   - Authentication Middleware (JWT + Refresh Tokens)                  |
|   - Zod Input & Query Validation Middleware                           |
|   - Layered Controller -> Service -> Repository Architecture          |
+-------------------+------------------+------------------+-------------+
                    |                  |                  |
                    v                  v                  v
+-----------------------+   +-------------------+   +-------------------+
|      Data Tier        |   |   External AI     |   |   File Storage    |
| PostgreSQL Database   |   |   OpenAI API      |   |   Cloudinary      |
| Prisma ORM Migrations |   |   (Server-side    |   |   (Signed Secure  |
| & Connection Pooling  |   |    Isolation)     |   |    Uploads)       |
+-----------------------+   +-------------------+   +-------------------+
```

## Boundary Isolation & Security Rules

1. **Zero Client-Exposed Secrets**: Third-party credentials (OpenAI API key, Cloudinary API secret, Database connection string) are strictly stored in backend environment variables and never leaked to the client bundle.
2. **Unified REST Protocol**: All client-server communications use semantic HTTP verbs with a standardized JSON envelope (`{ success: true, data: T, meta?: ... }`).
3. **Decoupled Real-Time Layer**: Socket.IO handles operational push events (task status change, comments, presence) while REST endpoints serve as the authoritative write path.
4. **Shared Types & Validation**: The `@taskflow/shared` and `@taskflow/validation` packages enforce consistent typing and validation schemas between frontend and backend without tight coupling.
