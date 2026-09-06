# TaskFlow Architecture & Operations Documentation Index

Welcome to the TaskFlow architecture and operations repository. This directory houses the canonical engineering designs, security specifications, operational runbooks, and architectural decision records for TaskFlow v1.0.

---

## 🏛️ System & Architecture Foundations

- [**TaskFlow v1.0 Architecture Specification**](taskflow-v1-architecture.md)  
  _The authoritative system blueprint: multi-tier topology, frontend/backend design, data isolation, component boundaries, and v1.0 invariants._
- [**Architecture Overview**](overview.md)  
  _High-level principles, design philosophy, and technology stack overview._
- [**Backend Architecture Blueprint**](backend.md)  
  _Layered modular monolith structure: controllers, services, repositories, and error contracts._
- [**Frontend Architecture Blueprint**](frontend.md)  
  _Client application architecture: React 18, Vite, TanStack Query caching, and state boundaries._
- [**Database & Relational Model Blueprint**](database.md)  
  _PostgreSQL relational schema, Prisma ORM patterns, indexing strategy, and migration governance._

---

## 📋 Core Domain & Collaboration Engine

- [**Workspace & Organization Governance**](workspace-management.md)  
  _Multi-tenant tenant boundaries, member invitation lifecycle, and last-owner safeguards._
- [**Project Operations & Lifecycle**](project-management.md)  
  _Project definitions, key prefixes, and membership containment._
- [**Task Execution & Subtasks**](task-management.md)  
  _Task CRUD, status lifecycles, subtask hierarchies, and assignment._
- [**Interactive Kanban Engine**](kanban.md)  
  _Visual board state machine, drag-and-drop mechanics, and optimistic updates._
- [**DAG Dependency Engine**](task-dependencies.md)  
  _Directed Acyclic Graph dependency modeling (`BLOCKS`, `RELATES_TO`), cycle detection, and blocker propagation._
- [**Task Taxonomy & Project Labels**](task-labels.md)  
  _Project-scoped labeling and visual categorization._

---

## 🤖 AI Subsystems & Safety Framework

- [**AI Service Subsystem Overview**](ai-service.md)  
  _Dedicated Python 3.13 microservice: FastAPI, Pydantic runtime validation, and OpenAI integration._
- [**AI Project Intelligence**](ai-project-intelligence.md)  
  _Advisory executive project analysis grounded on authoritative deterministic project health._
- [**AI Task Intelligence**](ai-task-intelligence.md)  
  _Task summarization, blocker analysis, and execution recommendations._
- [**AI Task Decomposition**](ai-task-decomposition.md)  
  _Assisted breakdown of complex tasks into bounded, ordered child subtasks._
- [**Human-Approved AI Task Actions**](ai-task-actions.md)  
  _Structured state change proposals, UI diff presentation, and compare-and-swap stale state guards._
- [**AI Evaluation, Safety & Reliability**](ai-evaluation-reliability.md)  
  _Deterministic offline evaluation harness, prompt injection defenses, and safety gates._

---

## 🔒 Enterprise Security & Governance

- [**Final Application Security Audit & Posture**](security-audit.md)  
  _Comprehensive threat model, RBAC matrix, tenant isolation verification, session security, and residual risk assessment._
- [**Authentication & Session Management**](authentication.md)  
  _JWT verification, cryptographic refresh token rotation, token reuse detection, and session revocation._
- [**Auditability & Security Events Log**](auditability-security-events.md)  
  _Immutable append-only operational audit log stream capturing authentication, administrative, and AI lifecycle events._
- [**SaaS Entitlements & Usage Controls**](saas-entitlements-usage.md)  
  _Plan definitions (FREE, PRO, BUSINESS), tenant resource quotas, and AI rate limiting._

---

## ⚙️ Operations, Observability & Resilience

- [**Observability & Telemetry Blueprint**](observability.md)  
  _Multi-tier Sentry integration, request ID propagation, PII scrubbing, and noise filtering._
- [**Durable Background Jobs Subsystem**](background-jobs.md)  
  _PostgreSQL-backed queue (`FOR UPDATE SKIP LOCKED`), retry backoff, and stale worker recovery._
- [**Production Hardening & Reliability**](production-hardening.md)  
  _Query bounded caps, timeout policies, connection pool tuning, and sanitized error responses._
- [**Load, Concurrency & Stress Validation**](load-and-security-validation.md)  
  _Concurrency race resilience, query pressure clamping, and high-concurrency test results._
- [**Staging Release & Deployment Runbook**](staging-release-runbook.md)  
  _Staging deployment procedures, health probe validation, and service isolation verification._
- [**Staging Observability & Fault Tolerance**](staging-observability.md)  
  _Failure injection drills, external service decoupling, and dependency recovery._
- [**Production Release, Backup & Rollback Runbook**](production-release-rollback.md)  
  _Pre-deployment pg_dump backup drills, immutable release tagging, and four-tier rollback matrix._
- [**Production Readiness Specification**](production-readiness.md)  
  _Comprehensive production preflight checklist, operational criteria, and disaster recovery specs._

---

## 🚀 Release & Roadmap

- [**TaskFlow v1.0 Release Checklist**](../release/v1.0-release-checklist.md)  
  _Comprehensive release-freeze checklist across Code, Testing, Security, Operations, and Documentation._
- [**TaskFlow v1.0 Risk Register**](../release/v1.0-risk-register.md)  
  _Formal risk register tracking residual operational risks, mitigations, and ownership._
- [**TaskFlow v1.0 Final Test Matrix**](../release/v1.0-test-matrix.md)  
  _Complete automated test suite matrix and verification numbers._
- [**TaskFlow v1.0 Final QA Report**](../release/v1.0-final-qa-report.md)  
  _Final engineering QA audit, boundary verification, and release recommendation._
- [**TaskFlow Product Roadmap (v1.1 & v2.0)**](v1-roadmap.md)  
  _Post-v1.0 planned evolution, deferred capabilities, and scope boundaries._
