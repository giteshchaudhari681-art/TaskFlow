import { env } from '../../config/env.js';
import type { AIOperation, AIAnalysisResponse } from '@taskflow/shared';
import { aiAnalysisResponseSchema } from '@taskflow/validation';

export interface AIAnalysisContextPayload {
  project?: {
    project_id: string;
    project_key: string;
    project_name: string;
    project_status: string;
    description?: string | null;
  };
  metrics?: {
    total_tasks: number;
    completed_tasks: number;
    in_flight_tasks: number;
    overdue_tasks: number;
    blocked_tasks: number;
    completion_percentage: number;
  };
  milestones?: Array<{
    milestone_id: string;
    title: string;
    status: string;
    due_date?: string | null;
    progress_percentage: number;
  }>;
  tasks?: Array<{
    task_id: string;
    issue_key: string;
    title: string;
    status: string;
    priority: string;
    due_date?: string | null;
    assignee?: string | null;
    description?: string | null;
  }>;
  health?: {
    state: string;
    score: number;
    reasons: string[];
  };
  delivery_risks?: Array<{
    type: string;
    severity: string;
    message: string;
  }>;
}

export interface AIAnalysisRequestPayload {
  request_id?: string;
  operation: AIOperation;
  context: AIAnalysisContextPayload;
  user_prompt?: string;
}

export class AIClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code: string = 'AI_CLIENT_ERROR'
  ) {
    super(message);
    this.name = 'AIClientError';
  }
}

export class AIClientTimeoutError extends AIClientError {
  constructor(message = 'AI service request timed out') {
    super(message, 504, 'AI_GATEWAY_TIMEOUT');
    this.name = 'AIClientTimeoutError';
  }
}

export class AIClientUnavailableError extends AIClientError {
  constructor(message = 'AI processing service is currently unavailable') {
    super(message, 503, 'AI_SERVICE_UNAVAILABLE');
    this.name = 'AIClientUnavailableError';
  }
}

export class AIProviderError extends AIClientError {
  constructor(message: string, statusCode = 502, code = 'AI_PROVIDER_ERROR') {
    super(message, statusCode, code);
    this.name = 'AIProviderError';
  }
}

export interface IAIClient {
  analyze(payload: AIAnalysisRequestPayload, requestId?: string): Promise<AIAnalysisResponse>;
}

export class AIClient implements IAIClient {
  private readonly baseUrl: string;
  private readonly serviceToken: string;
  private readonly timeoutMs: number;

  constructor(
    baseUrl: string = env.AI_SERVICE_URL,
    serviceToken: string = env.AI_SERVICE_TOKEN,
    timeoutMs: number = env.AI_SERVICE_TIMEOUT_MS
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.serviceToken = serviceToken;
    this.timeoutMs = timeoutMs;
  }

  async analyze(
    payload: AIAnalysisRequestPayload,
    requestId?: string
  ): Promise<AIAnalysisResponse> {
    const correlationId = requestId || payload.request_id || crypto.randomUUID();
    const targetUrl = `${this.baseUrl}/ai/analyze`;

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Request-ID': correlationId,
      'X-TaskFlow-Service-Token': this.serviceToken,
    };

    const requestBody = {
      ...payload,
      request_id: correlationId,
    };

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        const errorDetail = responseData?.error;
        const errorCode = errorDetail?.code || 'AI_SERVICE_ERROR';
        const errorMessage =
          errorDetail?.message || `AI service responded with HTTP ${response.status}`;

        if (response.status === 401) {
          throw new AIClientError(
            'Internal AI service authentication failed',
            500,
            'INTERNAL_SERVICE_AUTH_ERROR'
          );
        }

        if (response.status === 503) {
          throw new AIProviderError(errorMessage, 503, errorCode);
        }

        if (response.status === 502) {
          throw new AIProviderError(errorMessage, 502, errorCode);
        }

        if (response.status === 422) {
          throw new AIClientError(errorMessage, 400, 'AI_VALIDATION_ERROR');
        }

        throw new AIClientError(errorMessage, response.status >= 500 ? 502 : 400, errorCode);
      }

      const validation = aiAnalysisResponseSchema.safeParse(responseData);
      if (!validation.success) {
        throw new AIProviderError(
          'Internal AI service returned payload failing schema validation',
          502,
          'AI_SCHEMA_VALIDATION_ERROR'
        );
      }

      return validation.data as AIAnalysisResponse;
    } catch (err: unknown) {
      if (err instanceof AIClientError) {
        throw err;
      }

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          throw new AIClientTimeoutError(
            `AI service request exceeded timeout of ${this.timeoutMs}ms`
          );
        }

        // Network connection failures (e.g. ECONNREFUSED)
        if ('code' in err && (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND')) {
          throw new AIClientUnavailableError('Could not establish connection to Python AI service');
        }

        throw new AIClientUnavailableError(`AI service communication failed: ${err.message}`);
      }

      throw new AIClientUnavailableError('Unknown error connecting to AI service');
    } finally {
      clearTimeout(timeoutHandle);
    }
  }
}

export const aiClient = new AIClient();
