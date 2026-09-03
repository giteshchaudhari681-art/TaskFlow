"""Official OpenAI SDK provider implementation."""

import json
import logging
from typing import Any, Dict, List, Optional

from openai import (
    APIError,
    APITimeoutError,
    AsyncOpenAI,
    AuthenticationError,
    RateLimitError,
)
from pydantic import ValidationError

from app.config import Settings
from app.models.requests import AIAnalysisContext, AIOperation
from app.models.responses import (
    AIAnalysisResponse,
    AIAttentionArea,
    AIRecommendation,
    RecommendationCategory,
    RecommendationPriority,
)
from app.services.providers.base import BaseAIProvider

logger = logging.getLogger(__name__)


class AIProviderConfigurationError(Exception):
    """Raised when the AI provider is not properly configured."""

    pass


class AIProviderExecutionError(Exception):
    """Raised when an upstream AI provider invocation fails."""

    pass


class OpenAIProvider(BaseAIProvider):
    """Concrete OpenAI LLM provider using AsyncOpenAI."""

    def __init__(self, settings: Settings, client: Optional[AsyncOpenAI] = None):
        self.settings = settings
        self._client = client

    def _get_client(self) -> AsyncOpenAI:
        if self._client is not None:
            return self._client

        if not self.settings.openai_api_key or not self.settings.openai_api_key.strip():
            raise AIProviderConfigurationError("OpenAI API key is not configured")

        self._client = AsyncOpenAI(
            api_key=self.settings.openai_api_key.strip(),
            timeout=self.settings.ai_request_timeout_seconds,
        )
        return self._client

    def _build_system_prompt(self, operation: AIOperation) -> str:
        instructions = {
            AIOperation.PROJECT_SUMMARY: (
                "You are an expert Project Operations AI for TaskFlow. "
                "Synthesize an executive project summary based on the provided project context, "
                "deterministic progress metrics, active tasks, and milestones. "
                "Highlight key achievements, current blockers, and actionable next steps."
            ),
            AIOperation.TASK_SUMMARY: (
                "You are a Senior Technical Project Assistant for TaskFlow. "
                "Synthesize a focused task overview and risk assessment based on the provided "
                "task details, dependencies, and milestone context. "
                "Provide clear recommendations for completion."
            ),
            AIOperation.PROJECT_INSIGHT: (
                "You are an Enterprise Project Intelligence Assistant for TaskFlow. "
                "Analyze the supplied deterministic project telemetry (health state, score, "
                "completion rate, overdue tasks, blockers, and milestone health).\n\n"
                "STRICT GROUNDING & BEHAVIORAL RULES:\n"
                "1. Base recommendations and insights ONLY on supplied telemetry and context.\n"
                "2. Never invent tasks, milestones, metrics, assignees, dates, or non-existent "
                "risks.\n"
                "3. Clearly distinguish observed database facts from your advisory "
                "recommendations.\n"
                "4. Do NOT claim an action has already taken place.\n"
                "5. All recommendations and priorities are strictly ADVISORY and do not alter "
                "deterministic project health.\n"
                "6. If project has NO_DATA or zero tasks, explicitly indicate more tasks are "
                "needed rather than hallucinating.\n"
                "7. Focus on: (1) what is going well, (2) what requires attention, (3) which "
                "delivery risks are most critical, and (4) concrete actions for the team."
            ),
        }

        op_instruction = instructions.get(operation, "You are an AI assistant for TaskFlow.")

        return (
            f"{op_instruction}\n\n"
            "CRITICAL: Respond ONLY with a valid JSON object strictly matching this schema:\n"
            "{\n"
            '  "summary": "Concise executive summary paragraph explaining project trajectory",\n'
            '  "recommendations": [\n'
            "    {\n"
            '      "title": "Short actionable recommendation title",\n'
            '      "description": "Concrete explanation of recommended action",\n'
            '      "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",\n'
            '      "category": "BLOCKER" | "DELIVERY_RISK" | "MILESTONE" | "PRIORITY" | '
            '"OWNERSHIP" | "WORKLOAD" | "PROCESS" | "RISK_MITIGATION" | "PLANNING" | "QUALITY" | '
            '"RESOURCE"\n'
            "    }\n"
            "  ],\n"
            '  "attention_areas": [\n'
            "    {\n"
            '      "title": "Specific area needing attention",\n'
            '      "description": "Fact-grounded explanation of issue from project telemetry",\n'
            '      "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"\n'
            "    }\n"
            "  ]\n"
            "}"
        )

    def _build_user_content(
        self,
        context: AIAnalysisContext,
        user_prompt: Optional[str],
    ) -> str:
        parts: List[str] = []

        if context.project:
            proj = context.project
            parts.append(
                f"### Project Context\n"
                f"- Name: {proj.project_name} ({proj.project_key})\n"
                f"- Status: {proj.project_status or 'N/A'}\n"
                f"- Description: {proj.description or 'None'}"
            )

        if context.health:
            h = context.health
            reasons_str = "; ".join(h.reasons) if h.reasons else "No specific risk triggers logged"
            parts.append(
                f"### Authoritative Deterministic Project Health (PR14 Engine)\n"
                f"- Health State: {h.state}\n"
                f"- Health Score: {h.score}/100\n"
                f"- Deterministic Health Triggers: {reasons_str}"
            )

        if context.delivery_risks:
            r_lines = [
                f"- [{r.severity}] {r.type}: {r.message}" for r in context.delivery_risks[:10]
            ]
            parts.append("### Authoritative Deterministic Delivery Risks\n" + "\n".join(r_lines))

        if context.metrics:
            m = context.metrics
            parts.append(
                f"### Deterministic Project Metrics\n"
                f"- Total Active Tasks: {m.total_tasks}\n"
                f"- Completed Tasks: {m.completed_tasks}\n"
                f"- In-Flight Tasks: {m.in_flight_tasks}\n"
                f"- Overdue Tasks: {m.overdue_tasks}\n"
                f"- Blocked Tasks: {m.blocked_tasks}\n"
                f"- Completion Rate: {m.completion_percentage}%"
            )

        if context.milestones:
            m_lines = [
                f"- {m.title} [Status: {m.status}, Progress: {m.progress_percentage}%, "
                f"Due: {m.due_date or 'No Date'}]"
                for m in context.milestones[:10]
            ]
            parts.append("### Key Milestones\n" + "\n".join(m_lines))

        if context.tasks:
            t_lines = [
                f"- [{t.issue_key}] {t.title} (Status: {t.status}, Priority: {t.priority}, "
                f"Assignee: {t.assignee or 'Unassigned'})"
                for t in context.tasks[:30]
            ]
            parts.append("### Scoped Tasks\n" + "\n".join(t_lines))

        if user_prompt and user_prompt.strip():
            parts.append(f"### Specific Query / User Request\n{user_prompt.strip()}")

        return "\n\n".join(parts) if parts else "No domain context provided."

    async def analyze(
        self,
        request_id: str,
        operation: AIOperation,
        context: AIAnalysisContext,
        user_prompt: Optional[str] = None,
    ) -> AIAnalysisResponse:
        client = self._get_client()
        system_prompt = self._build_system_prompt(operation)
        user_content = self._build_user_content(context, user_prompt)

        try:
            response = await client.chat.completions.create(
                model=self.settings.openai_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
            )

            raw_content = response.choices[0].message.content or "{}"
            parsed: Dict[str, Any] = json.loads(raw_content)

            summary = parsed.get("summary", "Analysis completed.")
            raw_recs = parsed.get("recommendations", [])

            recommendations: List[AIRecommendation] = []
            for item in raw_recs:
                if isinstance(item, dict) and "title" in item and "description" in item:
                    try:
                        prio = RecommendationPriority(item.get("priority", "MEDIUM").upper())
                    except ValueError:
                        prio = RecommendationPriority.MEDIUM

                    try:
                        cat = RecommendationCategory(item.get("category", "PLANNING").upper())
                    except ValueError:
                        cat = RecommendationCategory.PLANNING

                    recommendations.append(
                        AIRecommendation(
                            title=item["title"],
                            description=item["description"],
                            priority=prio,
                            category=cat,
                        )
                    )

            raw_attentions = parsed.get("attention_areas", [])
            attention_areas: List[AIAttentionArea] = []
            for item in raw_attentions:
                if isinstance(item, dict) and "title" in item and "description" in item:
                    try:
                        sev = RecommendationPriority(item.get("severity", "HIGH").upper())
                    except ValueError:
                        sev = RecommendationPriority.HIGH

                    attention_areas.append(
                        AIAttentionArea(
                            title=item["title"],
                            description=item["description"],
                            severity=sev,
                        )
                    )

            usage = response.usage
            metadata: Dict[str, Any] = {
                "model": response.model or self.settings.openai_model,
                "provider": "openai",
                "prompt_tokens": usage.prompt_tokens if usage else None,
                "completion_tokens": usage.completion_tokens if usage else None,
                "total_tokens": usage.total_tokens if usage else None,
            }

            return AIAnalysisResponse(
                request_id=request_id,
                operation=operation,
                summary=summary,
                recommendations=recommendations,
                attention_areas=attention_areas,
                metadata=metadata,
            )

        except AuthenticationError as exc:
            logger.warning("OpenAI authentication failure: %s", exc.message)
            raise AIProviderExecutionError(
                "Authentication with upstream AI provider failed"
            ) from exc
        except RateLimitError as exc:
            logger.warning("OpenAI rate limit exceeded: %s", exc.message)
            raise AIProviderExecutionError("Rate limit reached on upstream AI provider") from exc
        except APITimeoutError as exc:
            logger.warning("OpenAI request timed out: %s", str(exc))
            raise AIProviderExecutionError("Upstream AI provider request timed out") from exc
        except APIError as exc:
            logger.error("OpenAI API error occurred: %s", exc.message)
            raise AIProviderExecutionError(f"Upstream AI provider error: {exc.message}") from exc
        except json.JSONDecodeError as exc:
            logger.error("Failed to parse JSON response from OpenAI: %s", str(exc))
            raise AIProviderExecutionError(
                "Invalid JSON structure returned by upstream AI provider"
            ) from exc
        except ValidationError as exc:
            logger.error("Pydantic validation of OpenAI response failed: %s", str(exc))
            raise AIProviderExecutionError(
                "Upstream AI provider returned response failing schema validation"
            ) from exc
        except Exception as exc:
            logger.exception("Unexpected error during OpenAI completion")
            raise AIProviderExecutionError(f"AI provider execution failed: {str(exc)}") from exc
