# TaskFlow — AI Service Subsystem

TaskFlow's dedicated AI subsystem implemented in Python using FastAPI, Pydantic (v2), and the OpenAI Python SDK.

---

## Architectural Role

TaskFlow employs a **modular monolith** for its core application backend (Node.js + Express) and introduces this focused Python service specifically for AI-oriented processing, runtime schema validation, and provider orchestration.

```
React SPA
   │
   ▼
Express API (Primary Backend: Auth, RBAC, DB Persistence)
   ├── PostgreSQL (Prisma ORM)
   ├── Cloudinary (Asset Storage)
   └── Python AI Service (AI Processing Boundary)
            │
            ▼
         Pydantic Runtime Validation
            │
            ▼
         OpenAI API Provider
```

### Invariants & Boundaries

- **Node.js/Express is the Source of Truth**: User authentication, RBAC, tenant isolation, project boundaries, and database persistence are strictly managed in Express.
- **Python Does NOT Access the Database**: Structured domain context (project metadata, active tasks, deterministic health metrics, milestones) is retrieved by Express and forwarded to Python over internal HTTP.
- **Zero Hallucinated Project Health**: Authoritative project health states (`HEALTHY`, `AT_RISK`, `CRITICAL`, `NO_DATA`) and completion percentages are computed deterministically in Express (PR 14). Python synthesizes qualitative insights, summaries, and recommendations to assist project leads.

---

## Technology Stack

- **Runtime**: Python 3.12+ (tested with Python 3.13)
- **Framework**: FastAPI
- **Validation**: Pydantic v2 & Pydantic Settings
- **LLM Provider**: OpenAI Python SDK (`AsyncOpenAI`)
- **Testing**: pytest, pytest-asyncio, httpx
- **Code Quality**: Ruff (linter and formatter)

---

## Local Development & Setup

### 1. Prerequisites

Ensure Python 3.12 or newer is installed on your system:

```bash
python --version
```

### 2. Create and Activate Virtual Environment

From `apps/ai`:

```bash
# Windows
python -m venv .venv
.\.venv\Scripts\activate

# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Configure your environment variables:

| Variable                     | Default       | Description                                                        |
| ---------------------------- | ------------- | ------------------------------------------------------------------ |
| `OPENAI_API_KEY`             | _(None)_      | OpenAI API secret key (leave blank in development/test if mocking) |
| `OPENAI_MODEL`               | `gpt-4o-mini` | Target OpenAI model identifier                                     |
| `AI_SERVICE_HOST`            | `127.0.0.1`   | Host interface to bind server                                      |
| `AI_SERVICE_PORT`            | `8000`        | HTTP port                                                          |
| `APP_ENV`                    | `development` | Environment name (`development`, `testing`, `production`)          |
| `AI_REQUEST_TIMEOUT_SECONDS` | `30`          | Timeout in seconds for upstream provider requests                  |

### 5. Running the Service

```bash
# Using uvicorn with hot reload
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Or directly via Python
python -m app.main
```

The interactive OpenAPI documentation is available at:

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

---

## API Endpoints

### 1. Health Check

`GET /health`

Returns service status and runtime environment. Does not make external OpenAI calls or leak secrets.

**Response (200 OK):**

```json
{
  "status": "ok",
  "service": "taskflow-ai",
  "version": "0.1.0",
  "environment": "development"
}
```

### 2. AI Context Analysis

`POST /ai/analyze`

Executes typed analysis over structured TaskFlow project/task context.

**Supported Operations:**

- `PROJECT_SUMMARY`: Synthesizes an executive overview from active tasks, metrics, and milestones.
- `TASK_SUMMARY`: Analyzes task risks, blockers, and execution priorities.
- `PROJECT_INSIGHT`: Evaluates delivery bottlenecks and produces prioritized recommendations.

**Request Payload:**

```json
{
  "request_id": "optional-uuid-for-traceability",
  "operation": "PROJECT_SUMMARY",
  "context": {
    "project": {
      "project_id": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "project_key": "ALPHA",
      "project_name": "TaskFlow Core Engine",
      "project_status": "ACTIVE"
    },
    "metrics": {
      "total_tasks": 24,
      "completed_tasks": 16,
      "in_flight_tasks": 6,
      "overdue_tasks": 1,
      "blocked_tasks": 1,
      "completion_percentage": 67
    },
    "milestones": [],
    "tasks": []
  },
  "user_prompt": "Highlight critical risk areas for upcoming sprint review."
}
```

**Response Payload (200 OK):**

```json
{
  "request_id": "optional-uuid-for-traceability",
  "operation": "PROJECT_SUMMARY",
  "summary": "Project ALPHA is progressing with 67% canonical completion...",
  "recommendations": [
    {
      "title": "Resolve High-Priority Blocker",
      "description": "Clear the dependency blocking task ALPHA-101 before sprint cutoff.",
      "priority": "HIGH",
      "category": "RISK_MITIGATION"
    }
  ],
  "metadata": {
    "model": "gpt-4o-mini",
    "provider": "openai"
  }
}
```

---

## Testing & Verification

Run the test suite using `pytest`:

```bash
pytest
```

Run code formatting and linting checks using `ruff`:

```bash
# Check formatting
ruff format --check .

# Run linter
ruff check .

# Apply auto-fixes
ruff check --fix .
```

---

## Security Invariants

1. **Zero Secret Logging**: API keys, tokens, session cookies, and sensitive payloads are never written to logs or included in error responses.
2. **Internal Network Binding**: The service defaults to `127.0.0.1`, ensuring it is not exposed publicly without a reverse proxy or gateway.
3. **Structured Error Handling**: Unexpected exceptions return standardized HTTP 500 responses without exposing internal Python stack traces.
