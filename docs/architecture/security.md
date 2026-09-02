# TaskFlow — Security Baseline & Hardening Strategy

## Security Baseline Principles

Security in TaskFlow is engineered into every layer rather than retrofitted at the end.

## 1. Transport & Network Security

- **Strict HTTPS**: Enforced in staging and production environments.
- **Helmet Middleware**: Automatically configures secure HTTP headers:
  - `Content-Security-Policy`: Restricts unauthorized script execution.
  - `X-Frame-Options: DENY`: Mitigates clickjacking attacks.
  - `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing.
  - `Strict-Transport-Security`: Enforces HTTPS transport.
- **CORS Allowlist**: Restricted strictly to authorized frontend origins (e.g. `http://localhost:5173` locally, production web domain in deployment). Rejects arbitrary cross-origin requests.

## 2. API Abuse & Rate Limiting

- **Global Rate Limiting**: `express-rate-limit` throttles request rates to prevent denial-of-service (default: 500 requests per 15-minute window).
- **Sensitive Route Limiting**: Specialized strict rate limits applied to auth endpoints (e.g., 5 failed login attempts per IP per 15 minutes).

## 3. Input Validation & Data Sanitization

- **Strict Zod Schemas**: Every inbound request (body, query parameters, route params) is validated through strict Zod schemas before reaching business logic.
- **SQL Injection Elimination**: All database interactions use Prisma ORM, which generates fully parameterized SQL queries, immunizing the platform from SQL injection.
- **XSS Defense**: Frontend React renders content safely via JSX automatic escaping. User Markdown/HTML in task descriptions is sanitized via DOMPurify before rendering.

## 4. Multi-Tenant Isolation

- **Organization-Scoped Queries**: All database queries must enforce the active `organizationId` filter. A user cannot access or mutate tasks in an organization they do not belong to.
- **ID Verification**: UUID v4 identifiers prevent sequential enumeration attacks common with auto-incrementing integer IDs.

## 5. Secrets Isolation & Error Masking

- **Zero Secrets in Source Control**: Checked through `.gitignore` and CI scan. `.env.example` provides template variables without credentials.
- **Sanitized Error Responses**: Production errors mask database error messages and stack traces, returning structured client-friendly error codes (`{ success: false, error: { code, message } }`).
